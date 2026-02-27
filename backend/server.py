"""server.py — FastAPI backend for the FiCR Chatbot web interface.

Wraps the existing pipeline stages (validate → RDF → SPARQL → Report)
as an HTTP API with Server-Sent Events for streaming LLM output.

Usage:
    uvicorn server:app --port 8000 --reload
"""

import json
import os
import sys
import asyncio
import traceback
from pathlib import Path
from typing import AsyncGenerator
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Ensure pipeline modules are importable
_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

from pipeline import (
    validate_survey, load_schema, stage_convert, stage_sparql,
    LLMAdapter, REPORT_SYSTEM_PROMPT,
    TBOX_PATH, REG_PATH, SPARQL_PATH,
)

# ── App setup ────────────────────────────────────────────────────────

app = FastAPI(title="FiCR Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEMA = load_schema()

# ── LLM provider registry ───────────────────────────────────────────

PROVIDER_CONFIG = {
    "claude": {
        "env_var": "ANTHROPIC_API_KEY",
        "models": [
            "claude-sonnet-4-20250514",
            "claude-opus-4-20250514",
            "claude-haiku-4-5-20251001",
        ],
        "default": "claude-sonnet-4-20250514",
        "label": "Claude (Anthropic)",
    },
    "openai": {
        "env_var": "OPENAI_API_KEY",
        "models": ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"],
        "default": "gpt-4o",
        "label": "OpenAI",
    },
    "gemini": {
        "env_var": "GOOGLE_API_KEY",
        "models": ["gemini-2.0-flash", "gemini-2.0-pro"],
        "default": "gemini-2.0-flash",
        "label": "Google Gemini",
    },
    "deepseek": {
        "env_var": "DEEPSEEK_API_KEY",
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "default": "deepseek-chat",
        "label": "DeepSeek",
    },
    "glm": {
        "env_var": "GLM_API_KEY",
        "models": ["glm-4-plus", "glm-4-flash"],
        "default": "glm-4-plus",
        "label": "Zhipu GLM",
    },
}


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event message."""
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


# ── Streaming LLM helpers ───────────────────────────────────────────

def _stream_anthropic(client, model: str, system: str, user: str):
    """Yield text chunks from Anthropic streaming API."""
    with client.messages.stream(
        model=model,
        max_tokens=8192,
        temperature=0.3,
        system=system,
        messages=[{"role": "user", "content": user}],
    ) as stream:
        for text in stream.text_stream:
            yield text


def _stream_openai(client, model: str, system: str, user: str):
    """Yield text chunks from OpenAI-compatible streaming API."""
    resp = client.chat.completions.create(
        model=model,
        temperature=0.3,
        max_tokens=8192,
        stream=True,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    for chunk in resp:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


def _stream_gemini(client, model_name: str, system: str, user: str):
    """Yield text chunks from Gemini streaming API."""
    model = client.GenerativeModel(
        model_name=model_name,
        system_instruction=system,
        generation_config=client.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=8192,
        ),
    )
    response = model.generate_content(user, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text


_executor = ThreadPoolExecutor(max_workers=4)

_SENTINEL = object()


def _run_stream_to_queue(queue: asyncio.Queue, loop: asyncio.AbstractEventLoop,
                         provider: str, model: str, sparql_results: dict):
    """Run blocking LLM stream in a thread; push chunks into an asyncio Queue."""
    try:
        adapter = LLMAdapter(provider=provider, model=model,
                             temperature=0.3, max_tokens=8192)
        adapter._ensure_client()
        user_msg = json.dumps(sparql_results, indent=2, ensure_ascii=False)

        if provider == "claude":
            gen = _stream_anthropic(adapter._client, model, REPORT_SYSTEM_PROMPT, user_msg)
        elif provider == "gemini":
            gen = _stream_gemini(adapter._client, model, REPORT_SYSTEM_PROMPT, user_msg)
        else:
            gen = _stream_openai(adapter._client, model, REPORT_SYSTEM_PROMPT, user_msg)

        for chunk in gen:
            loop.call_soon_threadsafe(queue.put_nowait, chunk)
    except Exception as e:
        loop.call_soon_threadsafe(queue.put_nowait, e)
    finally:
        loop.call_soon_threadsafe(queue.put_nowait, _SENTINEL)


async def stream_report_async(provider: str, model: str, sparql_results: dict):
    """Async generator that yields text chunks from LLM without blocking the event loop."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    loop.run_in_executor(
        _executor, _run_stream_to_queue, queue, loop, provider, model, sparql_results
    )
    while True:
        item = await queue.get()
        if item is _SENTINEL:
            break
        if isinstance(item, Exception):
            raise item
        yield item


# ── Request models ───────────────────────────────────────────────────

class PipelineRequest(BaseModel):
    survey: dict
    provider: str = "claude"
    model: str | None = None


# ── Endpoints ────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/providers")
def get_providers():
    """Return available LLM providers (only those with API keys configured)."""
    available = []
    for pid, cfg in PROVIDER_CONFIG.items():
        if os.environ.get(cfg["env_var"]):
            available.append({
                "id": pid,
                "label": cfg["label"],
                "models": cfg["models"],
                "default_model": cfg["default"],
            })
    return available


@app.get("/sample-surveys")
def list_samples():
    """Return metadata for available sample survey files."""
    refs_dir = _HERE / "references"
    samples = []
    for f in sorted(refs_dir.glob("*_survey.json")):
        try:
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
            samples.append({
                "slug": data["meta"]["project_slug"],
                "building_name": data["meta"].get("building_name",
                                                   data["building"].get("label", f.stem)),
                "filename": f.name,
            })
        except Exception:
            continue
    return samples


@app.get("/sample-surveys/{slug}")
def get_sample(slug: str):
    """Return the full survey JSON for a sample by slug."""
    refs_dir = _HERE / "references"
    for f in refs_dir.glob("*_survey.json"):
        try:
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
            if data["meta"]["project_slug"] == slug:
                return data
        except Exception:
            continue
    raise HTTPException(status_code=404, detail=f"Sample '{slug}' not found")


@app.post("/run-pipeline")
async def run_pipeline_sse(req: PipelineRequest):
    """Run pipeline stages 2-4 with SSE streaming."""
    provider = req.provider.lower()
    model = req.model or PROVIDER_CONFIG.get(provider, {}).get("default", "")

    async def event_stream() -> AsyncGenerator[str, None]:
        # Stage 1: Validate survey JSON
        try:
            errors = validate_survey(req.survey, SCHEMA)
            if errors:
                yield _sse("validation", {
                    "status": "fail",
                    "errors": errors[:10],
                })
                yield _sse("error", {
                    "stage": "validation",
                    "message": f"Survey JSON has {len(errors)} validation error(s)",
                })
                return
            yield _sse("validation", {
                "status": "pass",
                "message": "Survey JSON is valid (ficr-survey-v1)",
            })
        except Exception as e:
            yield _sse("error", {"stage": "validation",
                                  "message": f"{e}\n{traceback.format_exc()}"})
            return

        # Stage 2: JSON → RDF
        try:
            abox_path = await asyncio.to_thread(stage_convert, req.survey)
            from rdflib import Graph as RDFGraph
            g = RDFGraph()
            g.parse(abox_path, format="turtle")
            triple_count = len(g)
            yield _sse("rdf", {
                "status": "complete",
                "triple_count": triple_count,
                "abox_path": abox_path,
            })
        except Exception as e:
            yield _sse("error", {"stage": "rdf",
                                  "message": f"{e}\n{traceback.format_exc()}"})
            return

        # Stage 3: SPARQL queries
        try:
            sparql_results = await asyncio.to_thread(stage_sparql, abox_path)
            meta = sparql_results["meta"]
            yield _sse("sparql", {
                "status": "complete",
                "total_triples": meta["total_triples"],
                "query_count": meta["query_count"],
                "probes_failed": meta["probes_failed"],
                "results": sparql_results,
            })
        except Exception as e:
            yield _sse("error", {"stage": "sparql",
                                  "message": f"{e}\n{traceback.format_exc()}"})
            return

        # Stage 4: LLM Report (streamed without blocking event loop)
        try:
            yield _sse("report_start", {
                "provider": provider,
                "model": model,
            })
            full_report = ""
            async for chunk in stream_report_async(provider, model, sparql_results):
                full_report += chunk
                yield _sse("report_chunk", {"text": chunk})

            yield _sse("report_done", {
                "full_report": full_report,
                "char_count": len(full_report),
            })
        except Exception as e:
            tb = traceback.format_exc()
            yield _sse("error", {"stage": "report", "message": f"{e}\n{tb}"})
            return

        yield _sse("done", {"message": "Pipeline complete"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
