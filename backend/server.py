"""server.py — FastAPI backend for the FiCR Chatbot web interface.

Wraps the existing pipeline stages (validate → RDF → SPARQL → Report)
as an HTTP API with Server-Sent Events for streaming LLM output.
Supports three modes:
  1. JSON pipeline   — POST /run-pipeline       (stages 2-4)
  2. NL pipeline     — POST /run-nl-pipeline    (stages 1-4)
  3. Conversation    — POST /conversation       (multi-turn follow-up)

Usage:
    uvicorn server:app --port 8000 --reload
"""

import json
import os
import re
import sys
import asyncio
import traceback
import threading
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta
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
    validate_survey, load_schema, load_system_prompt,
    stage_llm1, stage_convert, stage_sparql,
    LLMAdapter,
    TBOX_PATH, REG_PATH, SPARQL_PATH,
)
import report_generator

# Load enriched report narrator prompt (LLM#3)
_REPORT_PROMPT = (_HERE / "prompts" / "3_report_narrator.md").read_text(encoding="utf-8")

# Load query selector prompt (LLM#2)
_QUERY_SELECTOR_PROMPT = (_HERE / "prompts" / "2_query_selector.md").read_text(encoding="utf-8")

# ── App setup ────────────────────────────────────────────────────────

app = FastAPI(title="FiCR Chatbot API", version="2.0.0")

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
        "models": ["glm-4-flash", "glm-4-plus"],
        "default": "glm-4-flash",
        "label": "Zhipu GLM",
    },
    "minimax": {
        "env_var": "MINIMAX_API_KEY",
        "models": ["MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2.1"],
        "default": "MiniMax-M2.7",
        "label": "MiniMax",
    },
}


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event message."""
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


# ── Streaming LLM helpers ───────────────────────────────────────────

def _stream_anthropic(client, model: str, system: str, messages: list[dict]):
    """Yield text chunks from Anthropic streaming API."""
    with client.messages.stream(
        model=model,
        max_tokens=8192,
        temperature=0.3,
        system=system,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text


def _stream_openai(client, model: str, system: str, messages: list[dict]):
    """Yield text chunks from OpenAI-compatible streaming API.

    Filters out <think>...</think> reasoning traces (e.g. from DeepSeek)
    so they never reach the client.
    """
    formatted = [{"role": "system", "content": system}] + messages
    resp = client.chat.completions.create(
        model=model,
        temperature=0.3,
        max_tokens=8192,
        stream=True,
        messages=formatted,
    )
    buf = ""
    in_think = False
    for chunk in resp:
        if not chunk.choices or not chunk.choices[0].delta.content:
            continue
        text = chunk.choices[0].delta.content
        for ch in text:
            if in_think:
                buf += ch
                if buf.endswith("</think>"):
                    in_think = False
                    buf = ""
            else:
                buf += ch
                if buf.endswith("<think>"):
                    in_think = True
                    buf = ""
                elif "<think>"[:len(buf)] == buf:
                    # partial match — keep buffering
                    pass
                else:
                    yield buf
                    buf = ""
    if buf and not in_think:
        yield buf


def _stream_gemini(client, model_name: str, system: str, messages: list[dict]):
    """Yield text chunks from Gemini streaming API."""
    model = client.GenerativeModel(
        model_name=model_name,
        system_instruction=system,
        generation_config=client.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=8192,
        ),
    )
    if len(messages) == 1:
        response = model.generate_content(messages[0]["content"], stream=True)
    else:
        gemini_history = []
        for m in messages[:-1]:
            role = "user" if m["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [m["content"]]})
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(messages[-1]["content"], stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text


_executor = ThreadPoolExecutor(max_workers=4)

_SENTINEL = object()


def _run_stream_to_queue(queue: asyncio.Queue, loop: asyncio.AbstractEventLoop,
                         provider: str, model: str, system: str,
                         messages: list[dict]):
    """Run blocking LLM stream in a thread; push chunks into an asyncio Queue."""
    try:
        adapter = LLMAdapter(provider=provider, model=model,
                             temperature=0.3, max_tokens=8192)
        adapter._ensure_client()

        if provider == "claude":
            gen = _stream_anthropic(adapter._client, model, system, messages)
        elif provider == "gemini":
            gen = _stream_gemini(adapter._client, model, system, messages)
        else:
            gen = _stream_openai(adapter._client, model, system, messages)

        for chunk in gen:
            loop.call_soon_threadsafe(queue.put_nowait, chunk)
    except Exception as e:
        loop.call_soon_threadsafe(queue.put_nowait, e)
    finally:
        loop.call_soon_threadsafe(queue.put_nowait, _SENTINEL)


async def _stream_llm_async(provider: str, model: str, system: str,
                             messages: list[dict]):
    """Async generator that yields text chunks from LLM."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    loop.run_in_executor(
        _executor, _run_stream_to_queue, queue, loop,
        provider, model, system, messages
    )
    while True:
        item = await queue.get()
        if item is _SENTINEL:
            break
        if isinstance(item, Exception):
            raise item
        yield item


async def stream_report_async(provider: str, model: str, sparql_results: dict):
    """Stream a report from SPARQL results (single-turn)."""
    user_msg = json.dumps(sparql_results, indent=2, ensure_ascii=False)
    messages = [{"role": "user", "content": user_msg}]
    async for chunk in _stream_llm_async(provider, model, _REPORT_PROMPT, messages):
        yield chunk


# ── Session management ───────────────────────────────────────────────

class Session:
    """Stores conversation state for a pipeline session."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = datetime.utcnow()
        self.last_active = datetime.utcnow()
        self.messages: list[dict] = []
        self.survey: dict | None = None
        self.abox_path: str | None = None
        self.sparql_results: dict | None = None
        self.provider: str = "claude"
        self.model: str = ""

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self.last_active = datetime.utcnow()

    def get_trimmed_history(self, max_messages: int = 10) -> list[dict]:
        """Return messages trimmed to keep first + last N-1."""
        if len(self.messages) <= max_messages:
            return self.messages.copy()
        return [self.messages[0]] + self.messages[-(max_messages - 1):]


class SessionStore:
    """Thread-safe in-memory session store with TTL cleanup."""
    TTL = timedelta(hours=2)

    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()

    def create(self) -> Session:
        sid = str(uuid4())
        session = Session(sid)
        with self._lock:
            self._cleanup_expired()
            self._sessions[sid] = session
        return session

    def get(self, sid: str) -> Session | None:
        with self._lock:
            session = self._sessions.get(sid)
            if session and (datetime.utcnow() - session.last_active) > self.TTL:
                del self._sessions[sid]
                return None
            return session

    def _cleanup_expired(self):
        now = datetime.utcnow()
        expired = [k for k, v in self._sessions.items()
                   if (now - v.last_active) > self.TTL]
        for k in expired:
            del self._sessions[k]


sessions = SessionStore()


# ── Shared pipeline stages (2→4) ────────────────────────────────────

async def _stages_2_to_4(survey: dict, provider: str, model: str,
                          report_mode: str = "llm"):
    """Shared async generator for validation, RDF, SPARQL, and report stages."""

    # Stage: Validate survey JSON
    try:
        errors = validate_survey(survey, SCHEMA)
        if errors:
            yield _sse("validation", {"status": "fail", "errors": errors[:10]})
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

    # Stage: JSON → RDF
    abox_path = None
    try:
        abox_path = await asyncio.to_thread(stage_convert, survey)
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

    # Stage: SPARQL queries
    sparql_results = None
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

    # Stage: Report generation
    try:
        if report_mode == "deterministic":
            full_report = await asyncio.to_thread(
                report_generator.generate_report, sparql_results
            )
            yield _sse("report_done", {
                "full_report": full_report,
                "char_count": len(full_report),
                "mode": "deterministic",
            })
        else:
            yield _sse("report_start", {"provider": provider, "model": model})
            full_report = ""
            async for chunk in stream_report_async(provider, model, sparql_results):
                full_report += chunk
                yield _sse("report_chunk", {"text": chunk})
            yield _sse("report_done", {
                "full_report": full_report,
                "char_count": len(full_report),
                "mode": "llm",
            })
    except Exception as e:
        tb = traceback.format_exc()
        yield _sse("error", {"stage": "report", "message": f"{e}\n{tb}"})
        return

    yield _sse("done", {"message": "Pipeline complete"})


# ── Intent classification for conversation mode ─────────────────────

def _classify_intent(message: str, session: Session) -> str:
    """Simple rule-based intent classification."""
    msg_lower = message.lower()

    # No previous survey — must be a new building description
    if session.survey is None:
        building_kw = ["building", "storey", "floor", "dwelling", "office",
                       "hospital", "warehouse", "shop", "house", "apartment",
                       "block", "tower", "school"]
        if any(kw in msg_lower for kw in building_kw):
            return "new_building"
        return "clarification"

    # Has previous survey — check for modifications
    modify_kw = ["change", "modify", "update", "add", "remove", "instead",
                 "replace", "make it", "set the", "switch"]
    if any(kw in msg_lower for kw in modify_kw):
        return "modify_survey"

    # Has results — check for questions about them
    if session.sparql_results:
        question_kw = ["explain", "why", "detail", "tell me more", "what about",
                       "non-compliant", "compliance", "risk", "recommend",
                       "how", "which", "summarize", "summary"]
        if any(kw in msg_lower for kw in question_kw):
            return "ask_about_results"

    return "clarification"


# ── Request models ───────────────────────────────────────────────────

class PipelineRequest(BaseModel):
    survey: dict
    provider: str = "claude"
    model: str | None = None
    report_mode: str = "llm"


class NLPipelineRequest(BaseModel):
    description: str
    provider: str = "claude"
    model: str | None = None
    report_mode: str = "llm"


class GenerateReportRequest(BaseModel):
    session_id: str | None = None
    sparql_results: dict | None = None


class ConversationRequest(BaseModel):
    session_id: str | None = None
    message: str
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


# ── Markdown sample endpoints ──────────────────────────────────────

_MD_DIR = _HERE.parent / "test_data" / "llm_inputs"


@app.get("/sample-markdown")
def list_markdown_samples():
    """Return metadata for available markdown test files."""
    if not _MD_DIR.exists():
        return []
    samples = []
    for f in sorted(_MD_DIR.glob("*.md")):
        label = f.stem.replace("_", " ").title()
        tag = ""
        if "full" in f.stem:
            tag = "Complete"
        elif "incomplete" in f.stem:
            tag = "Incomplete"
        elif "error" in f.stem:
            tag = "Error"
        samples.append({
            "name": f.stem,
            "filename": f.name,
            "label": label,
            "tag": tag,
        })
    return samples


@app.get("/sample-markdown/{name}")
def get_markdown_sample(name: str):
    """Return the text content of a markdown sample file."""
    path = _MD_DIR / f"{name}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Markdown sample '{name}' not found")
    return {"filename": path.name, "content": path.read_text(encoding="utf-8")}


# ── Deterministic report endpoint ─────────────────────────────────

@app.post("/generate-report")
async def generate_report_endpoint(req: GenerateReportRequest):
    """Generate a deterministic compliance report from SPARQL results.

    Accepts either a session_id (to look up cached results) or
    sparql_results directly. Returns the Markdown report.
    """
    sparql_data = None

    if req.sparql_results is not None:
        sparql_data = req.sparql_results
    elif req.session_id is not None:
        session = sessions.get(req.session_id)
        if not session:
            raise HTTPException(404, "Session expired or not found")
        if not session.sparql_results:
            raise HTTPException(400, "Session has no SPARQL results yet")
        sparql_data = session.sparql_results
    else:
        raise HTTPException(400, "Provide either session_id or sparql_results")

    try:
        report_md = report_generator.generate_report(sparql_data)
        return {"report": report_md, "mode": "deterministic"}
    except Exception as e:
        raise HTTPException(500, f"Report generation failed: {e}")


# ── Pipeline: JSON input (stages 2-4) ───────────────────────────────

@app.post("/run-pipeline")
async def run_pipeline_sse(req: PipelineRequest):
    """Run pipeline stages 2-4 with SSE streaming (pre-made JSON input)."""
    provider = req.provider.lower()
    model = req.model or PROVIDER_CONFIG.get(provider, {}).get("default", "")

    report_mode = req.report_mode or "llm"

    async def event_stream() -> AsyncGenerator[str, None]:
        async for msg in _stages_2_to_4(req.survey, provider, model, report_mode):
            yield msg

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Pipeline: NL input (stages 1-4) ─────────────────────────────────

@app.post("/run-nl-pipeline")
async def run_nl_pipeline_sse(req: NLPipelineRequest):
    """Run full pipeline stages 1-4: NL description → JSON → RDF → SPARQL → Report."""
    provider = req.provider.lower()
    model = req.model or PROVIDER_CONFIG.get(provider, {}).get("default", "")

    report_mode = req.report_mode or "llm"

    async def event_stream() -> AsyncGenerator[str, None]:
        # Stage 1: LLM#1 — NL to Survey JSON
        try:
            yield _sse("llm1_start", {"provider": provider, "model": model})

            llm = LLMAdapter(provider=provider, model=model,
                             temperature=0.2, max_tokens=16384)
            system_prompt = load_system_prompt()

            survey = await asyncio.to_thread(
                stage_llm1, llm, req.description, SCHEMA, system_prompt
            )

            yield _sse("llm1_done", {
                "status": "complete",
                "building_name": survey.get("meta", {}).get("building_name", ""),
                "survey_preview": {
                    "storeys": len(survey.get("storeys", [])),
                    "spaces": len(survey.get("spaces", [])),
                    "elements": len(survey.get("elements", [])),
                },
            })
        except Exception as e:
            yield _sse("error", {"stage": "llm1",
                                  "message": f"{e}\n{traceback.format_exc()}"})
            return

        # Stages 2-4
        async for msg in _stages_2_to_4(survey, provider, model, report_mode):
            yield msg

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── CQ routing via LLM#2 ───────────────────────────────────────────

# All CQ IDs the selector can choose from
_ALL_CQ_IDS = [
    "A1", "A2", "A3", "A4", "A5", "A6",
    "B1", "B2", "B3",
    "C1", "C2", "C3", "C4",
    "D1", "D2",
]


def _route_question_to_cq(question: str, provider: str, model: str) -> dict:
    """Use LLM#2 to route a user question to a competency query.

    Returns {"selected_cq": "B2"|null, "reasoning": "...", "filters": {...}}.
    """
    user_payload = json.dumps({
        "question": question,
        "available_cq_ids": _ALL_CQ_IDS,
    })
    llm = LLMAdapter(provider=provider, model=model,
                      temperature=0.0, max_tokens=512)
    raw = llm.chat(_QUERY_SELECTOR_PROMPT, user_payload)

    # Extract JSON from response (may be in a code fence)
    fence = re.search(r'```(?:json)?\s*\n(.*?)```', raw, re.DOTALL)
    text = fence.group(1) if fence else raw
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        return json.loads(text[start:end + 1])
    return {"selected_cq": None, "reasoning": "Failed to parse LLM#2 response."}


def _extract_cq_subset(sparql_results: dict, selected_cq: str) -> dict:
    """Extract the result rows for a single CQ from full sparql_results."""
    queries = sparql_results.get("queries", sparql_results.get("results", {}))
    if isinstance(queries, dict):
        # Try exact key match first (e.g. "B2"), then scan for key containing it
        if selected_cq in queries:
            return {selected_cq: queries[selected_cq]}
        for key in queries:
            if selected_cq in key:
                return {key: queries[key]}
    return {}


# ── Conversation mode ────────────────────────────────────────────────

CONVERSATION_SYSTEM_PROMPT = """\
You are a fire compliance assistant. You have access to the building survey
data and SPARQL compliance query results from the FiCR pipeline. Answer the
user's questions about the building's fire compliance status, explain findings,
and provide actionable recommendations. Be precise and reference specific
element IDs and values. Respond in the same language the user uses.
"""


@app.post("/conversation")
async def conversation_sse(req: ConversationRequest):
    """Handle a conversational turn with the FiCR assistant."""
    provider = req.provider.lower()
    model = req.model or PROVIDER_CONFIG.get(provider, {}).get("default", "")

    # Get or create session
    if req.session_id:
        session = sessions.get(req.session_id)
        if not session:
            raise HTTPException(404, "Session expired or not found")
    else:
        session = sessions.create()

    session.provider = provider
    session.model = model
    session.add_message("user", req.message)

    intent = _classify_intent(req.message, session)

    async def event_stream() -> AsyncGenerator[str, None]:
        yield _sse("session", {"session_id": session.session_id})
        yield _sse("intent", {"intent": intent})

        if intent == "new_building":
            # Run full NL pipeline (stages 1-4)
            try:
                yield _sse("llm1_start", {"provider": provider, "model": model})

                llm = LLMAdapter(provider=provider, model=model,
                                 temperature=0.2, max_tokens=16384)
                system_prompt = load_system_prompt()

                survey = await asyncio.to_thread(
                    stage_llm1, llm, req.message, SCHEMA, system_prompt
                )
                session.survey = survey

                yield _sse("llm1_done", {
                    "status": "complete",
                    "building_name": survey.get("meta", {}).get("building_name", ""),
                })
            except Exception as e:
                yield _sse("error", {"stage": "llm1",
                                      "message": f"{e}\n{traceback.format_exc()}"})
                return

            # Run stages 2-4, capture results in session
            abox_path = None
            sparql_results = None

            async for msg in _stages_2_to_4(survey, provider, model):
                yield msg
                # Parse to capture intermediate state
                try:
                    # Extract event data from SSE message
                    lines = msg.strip().split("\n")
                    evt = ""
                    data_str = ""
                    for line in lines:
                        if line.startswith("event: "):
                            evt = line[7:]
                        elif line.startswith("data: "):
                            data_str = line[6:]
                    if evt == "rdf" and data_str:
                        d = json.loads(data_str)
                        abox_path = d.get("abox_path")
                        session.abox_path = abox_path
                    elif evt == "sparql" and data_str:
                        d = json.loads(data_str)
                        sparql_results = d.get("results")
                        session.sparql_results = sparql_results
                    elif evt == "report_done" and data_str:
                        d = json.loads(data_str)
                        session.add_message("assistant", d.get("full_report", ""))
                except Exception:
                    pass

        elif intent == "modify_survey":
            # Re-run LLM#1 with history for modification, then stages 2-4
            try:
                yield _sse("llm1_start", {"provider": provider, "model": model})

                llm = LLMAdapter(provider=provider, model=model,
                                 temperature=0.2, max_tokens=16384)
                system_prompt = load_system_prompt()

                # Build context: original survey + modification request
                context = req.message
                if session.survey:
                    context = (
                        f"Previously generated survey JSON:\n"
                        f"```json\n{json.dumps(session.survey, indent=2, ensure_ascii=False)}\n```\n\n"
                        f"User modification request: {req.message}\n\n"
                        f"Please regenerate the complete survey JSON with the requested changes."
                    )

                survey = await asyncio.to_thread(
                    stage_llm1, llm, context, SCHEMA, system_prompt
                )
                session.survey = survey

                yield _sse("llm1_done", {
                    "status": "complete",
                    "building_name": survey.get("meta", {}).get("building_name", ""),
                })
            except Exception as e:
                yield _sse("error", {"stage": "llm1",
                                      "message": f"{e}\n{traceback.format_exc()}"})
                return

            async for msg in _stages_2_to_4(survey, provider, model):
                yield msg

        elif intent == "ask_about_results":
            # Two-step: LLM#2 routes question → CQ, then answer from that subset
            try:
                yield _sse("report_start", {"provider": provider, "model": model})

                # Step 1: Route question to a CQ via LLM#2
                routing = {"selected_cq": None}
                if session.sparql_results:
                    try:
                        routing = await asyncio.to_thread(
                            _route_question_to_cq, req.message, provider, model
                        )
                    except Exception:
                        pass  # Fall back to full results if routing fails

                selected_cq = routing.get("selected_cq")
                yield _sse("cq_routed", {
                    "selected_cq": selected_cq,
                    "reasoning": routing.get("reasoning", ""),
                })

                # Step 2: Extract targeted CQ subset (or fall back to all)
                if selected_cq and session.sparql_results:
                    cq_subset = _extract_cq_subset(session.sparql_results, selected_cq)
                    if not cq_subset:
                        cq_subset = session.sparql_results
                else:
                    cq_subset = session.sparql_results or {}

                results_json = json.dumps(cq_subset, indent=2, ensure_ascii=False)
                context_note = (
                    f"The user's question was routed to competency query **{selected_cq}**."
                    if selected_cq else
                    "No specific competency query matched; full results provided."
                )

                system = (
                    CONVERSATION_SYSTEM_PROMPT
                    + f"\n\n## Query Routing\n{context_note}"
                    + f"\n\n## SPARQL Results\n```json\n{results_json}\n```"
                )

                history = session.get_trimmed_history(max_messages=10)

                full_response = ""
                async for chunk in _stream_llm_async(provider, model, system, history):
                    full_response += chunk
                    yield _sse("report_chunk", {"text": chunk})

                session.add_message("assistant", full_response)
                yield _sse("report_done", {
                    "full_report": full_response,
                    "char_count": len(full_response),
                })
            except Exception as e:
                tb = traceback.format_exc()
                yield _sse("error", {"stage": "conversation", "message": f"{e}\n{tb}"})
                return

            yield _sse("done", {"message": "Response complete"})

        else:
            # General clarification — just chat
            try:
                yield _sse("report_start", {"provider": provider, "model": model})

                history = session.get_trimmed_history(max_messages=10)
                system = CONVERSATION_SYSTEM_PROMPT

                full_response = ""
                async for chunk in _stream_llm_async(provider, model, system, history):
                    full_response += chunk
                    yield _sse("report_chunk", {"text": chunk})

                session.add_message("assistant", full_response)
                yield _sse("report_done", {
                    "full_report": full_response,
                    "char_count": len(full_response),
                })
            except Exception as e:
                tb = traceback.format_exc()
                yield _sse("error", {"stage": "conversation", "message": f"{e}\n{tb}"})
                return

            yield _sse("done", {"message": "Response complete"})

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
