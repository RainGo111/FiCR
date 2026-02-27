"""pipeline.py — FiCR end-to-end pipeline: NL → survey JSON → RDF → SPARQL → report.

Supports multiple LLM back-ends for both LLM#1 (NL→JSON) and LLM#2 (results→report):
  claude  — Anthropic Claude (anthropic SDK)
  openai  — OpenAI GPT (openai SDK)
  gemini  — Google Gemini (google-generativeai SDK)
  deepseek — DeepSeek (openai-compatible endpoint)
  glm     — Zhipu GLM (openai-compatible endpoint)

Usage:
    python pipeline.py --provider claude --model claude-sonnet-4-20250514 \
        --user "A two-storey dwelling house called Duplex A …"

    # Or pipe from file
    python pipeline.py --provider openai --model gpt-4o \
        --user-file my_description.txt -o report.json
"""

import json
import os
import re
import sys
import argparse
from pathlib import Path
from jsonschema import validate, ValidationError, Draft202012Validator

# Load .env file if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

import ficr_json_to_rdf
import ficr_sparql_runner

# ── Paths ────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
SYSTEM_PROMPT_PATH = _HERE / "prompts" / "system_prompt_1.md"
SCHEMA_PATH = _HERE / "schemas" / "survey_schema.json"
TBOX_PATH = _HERE / "references" / "ficr_tbox.ttl"
REG_PATH = _HERE / "references" / "ficr_regulatory_config.ttl"
SPARQL_PATH = _HERE / "references" / "ficr_risk_discovery_queries.sparql"
OUTPUT_DIR = _HERE / "output"

MAX_VALIDATION_RETRIES = 2

# ── LLM Report Prompt (LLM #2) ──────────────────────────────────────────
REPORT_SYSTEM_PROMPT = """\
You are a fire compliance report writer. You will receive structured SPARQL
query results from a fire compliance analysis of a building. Produce a clear,
professional, and actionable report in English.

Structure your report as follows:

## 1. Building Overview
Summarise the building (name, purpose group, storeys, spaces).

## 2. Element Inventory
List the structural and fire-safety elements found (walls, slabs, doorsets,
ceilings, windows) with key properties (REI ratings, external/load-bearing
status).

## 3. Compliance Check
For each element checked against regulatory requirements, state whether it
meets the required REI rating. Highlight any non-compliant elements.

## 4. Risk Assessment
Describe the risk units, their sprinkler status, boundary assumptions, and
condition states. Flag any assumptions with condition "Unknown" or
"Compromised" as requiring further investigation.

## 5. Evidence Summary
List supporting evidence (documents, observations) and note any gaps.

## 6. Recommendations
Provide actionable next steps based on the findings.

Use bullet points and tables where helpful. Be precise and reference specific
element IDs and values from the data.
"""


# ═════════════════════════════════════════════════════════════════════════
#  LLM Adapter — unified interface for all providers
# ═════════════════════════════════════════════════════════════════════════

class LLMAdapter:
    """Unified interface for calling different LLM providers."""

    def __init__(self, provider: str, model: str,
                 api_key: str | None = None,
                 base_url: str | None = None,
                 temperature: float = 0.2,
                 max_tokens: int = 16384):
        self.provider = provider.lower()
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._api_key = api_key
        self._base_url = base_url
        self._client = None

    def _get_api_key(self, env_var: str) -> str:
        key = self._api_key or os.environ.get(env_var)
        if not key:
            raise EnvironmentError(
                f"API key not found. Set {env_var} environment variable "
                f"or pass --api-key.")
        return key

    def _init_anthropic(self):
        import anthropic
        key = self._get_api_key("ANTHROPIC_API_KEY")
        self._client = anthropic.Anthropic(api_key=key)

    def _init_openai_compat(self, env_var: str, base_url: str | None = None):
        import openai
        key = self._get_api_key(env_var)
        kwargs = {"api_key": key}
        url = self._base_url or base_url
        if url:
            kwargs["base_url"] = url
        self._client = openai.OpenAI(**kwargs)

    def _init_gemini(self):
        import google.generativeai as genai
        key = self._get_api_key("GOOGLE_API_KEY")
        genai.configure(api_key=key)
        self._client = genai

    def _ensure_client(self):
        if self._client is not None:
            return
        if self.provider == "claude":
            self._init_anthropic()
        elif self.provider == "openai":
            self._init_openai_compat("OPENAI_API_KEY")
        elif self.provider == "deepseek":
            self._init_openai_compat(
                "DEEPSEEK_API_KEY",
                "https://api.deepseek.com/v1")
        elif self.provider == "glm":
            self._init_openai_compat(
                "GLM_API_KEY",
                "https://open.bigmodel.cn/api/paas/v4")
        elif self.provider == "gemini":
            self._init_gemini()
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def chat(self, system: str, user: str) -> str:
        """Send a system+user prompt and return the assistant's text."""
        self._ensure_client()

        if self.provider == "claude":
            return self._chat_anthropic(system, user)
        elif self.provider == "gemini":
            return self._chat_gemini(system, user)
        else:
            # openai / deepseek / glm all use OpenAI-compatible API
            return self._chat_openai(system, user)

    def _chat_anthropic(self, system: str, user: str) -> str:
        resp = self._client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return resp.content[0].text

    def _chat_openai(self, system: str, user: str) -> str:
        resp = self._client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return resp.choices[0].message.content

    def _chat_gemini(self, system: str, user: str) -> str:
        model = self._client.GenerativeModel(
            model_name=self.model,
            system_instruction=system,
            generation_config=self._client.types.GenerationConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_tokens,
            ),
        )
        resp = model.generate_content(user)
        return resp.text


# ═════════════════════════════════════════════════════════════════════════
#  Pipeline stages
# ═════════════════════════════════════════════════════════════════════════

def load_system_prompt(path: Path | None = None) -> str:
    """Load system_prompt_1.md."""
    p = path or SYSTEM_PROMPT_PATH
    return p.read_text(encoding="utf-8")


def load_schema(path: Path | None = None) -> dict:
    """Load and parse survey_schema.json."""
    p = path or SCHEMA_PATH
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def extract_json(text: str) -> dict:
    """Extract the first JSON object from LLM output (may be in a code fence)."""
    # Try code-fence extraction first
    fence = re.search(r'```(?:json)?\s*\n(.*?)```', text, re.DOTALL)
    if fence:
        return json.loads(fence.group(1))

    # Try bare JSON (first { to last })
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start:end + 1])

    raise ValueError("No JSON object found in LLM response.")


def validate_survey(survey: dict, schema: dict) -> list[str]:
    """Validate survey against schema. Returns list of error messages (empty = OK)."""
    validator = Draft202012Validator(schema,
                                     format_checker=Draft202012Validator.FORMAT_CHECKER)
    errors = []
    for err in validator.iter_errors(survey):
        path = ".".join(str(p) for p in err.absolute_path) or "(root)"
        errors.append(f"{path}: {err.message[:200]}")
    return errors


def stage_llm1(llm: LLMAdapter, user_input: str,
               schema: dict,
               system_prompt: str | None = None) -> dict:
    """Stage 1: Call LLM#1 to produce survey JSON with validation retries."""
    prompt = system_prompt or load_system_prompt()

    last_errors = []
    for attempt in range(1 + MAX_VALIDATION_RETRIES):
        if attempt == 0:
            message = user_input
        else:
            err_text = "\n".join(f"  - {e}" for e in last_errors)
            message = (
                f"Your previous JSON had {len(last_errors)} validation error(s):\n"
                f"{err_text}\n\n"
                f"Please fix these errors and regenerate the complete JSON. "
                f"Original description:\n{user_input}"
            )

        print(f"  [LLM#1] Attempt {attempt + 1}/{1 + MAX_VALIDATION_RETRIES} "
              f"… calling {llm.provider}/{llm.model}")

        raw = llm.chat(prompt, message)
        try:
            survey = extract_json(raw)
        except (json.JSONDecodeError, ValueError) as e:
            last_errors = [f"JSON parse error: {e}"]
            print(f"  [LLM#1] JSON extraction failed: {e}")
            continue

        errors = validate_survey(survey, schema)
        if not errors:
            print(f"  [LLM#1] Validation passed on attempt {attempt + 1}")
            return survey

        last_errors = errors
        print(f"  [LLM#1] Validation failed ({len(errors)} error(s))")
        for e in errors[:5]:
            print(f"         {e}")
        if len(errors) > 5:
            print(f"         ... and {len(errors) - 5} more")

    raise RuntimeError(
        f"LLM#1 failed after {1 + MAX_VALIDATION_RETRIES} attempts. "
        f"Last errors:\n" + "\n".join(last_errors))


def stage_convert(survey: dict) -> str:
    """Stage 2: Convert survey JSON to RDF/Turtle ABox."""
    g = ficr_json_to_rdf.convert(survey)
    slug = survey["meta"]["project_slug"]

    # Create project-specific directory
    project_dir = OUTPUT_DIR / slug
    project_dir.mkdir(parents=True, exist_ok=True)
    
    out_path = project_dir / "abox.ttl"
    g.serialize(destination=str(out_path), format="turtle")
    print(f"  [RDF]   {len(g)} triples → {out_path.relative_to(_HERE)}")
    return str(out_path)


def stage_sparql(abox_path: str,
                 tbox_path: str | None = None,
                 reg_path: str | None = None,
                 sparql_path: str | None = None) -> dict:
    """Stage 3: Run SPARQL queries on merged graph."""
    tb = tbox_path or str(TBOX_PATH)
    rg = reg_path or str(REG_PATH)
    sq = sparql_path or str(SPARQL_PATH)

    data = ficr_sparql_runner.run(tb, rg, abox_path, sq)
    m = data["meta"]
    print(f"  [SPARQL] {m['total_triples']} triples, "
          f"{m['query_count']} queries executed")
    if m["probes_failed"]:
        print(f"  [SPARQL] Probe warnings: {m['probes_failed']}")
    return data


def stage_llm2(llm: LLMAdapter, sparql_results: dict) -> str:
    """Stage 4 (optional): Call LLM#2 to produce a human-readable report."""
    user_msg = json.dumps(sparql_results, indent=2, ensure_ascii=False)

    print(f"  [LLM#2] Generating report … {llm.provider}/{llm.model}")
    report = llm.chat(REPORT_SYSTEM_PROMPT, user_msg)
    print(f"  [LLM#2] Report generated ({len(report)} chars)")
    return report


# ═════════════════════════════════════════════════════════════════════════
#  Full pipeline
# ═════════════════════════════════════════════════════════════════════════

def run_pipeline(
    user_input: str,
    provider: str = "claude",
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 16384,
    generate_report: bool = True,
    report_provider: str | None = None,
    report_model: str | None = None,
    report_api_key: str | None = None,
) -> dict:
    """Run the full FiCR pipeline and return a result dict.

    Returns:
        {
            "survey": <dict>,            # validated survey JSON
            "abox_path": <str>,           # path to generated .ttl
            "sparql_results": <dict>,     # structured query results
            "report": <str|None>,         # markdown report (if generated)
        }
    """
    # Default models per provider
    default_models = {
        "claude": "claude-sonnet-4-20250514",
        "openai": "gpt-4o",
        "gemini": "gemini-2.0-flash",
        "deepseek": "deepseek-chat",
        "glm": "glm-4-plus",
    }

    provider = provider.lower()
    model = model or default_models.get(provider, "")

    llm = LLMAdapter(provider=provider, model=model,
                      api_key=api_key, base_url=base_url,
                      temperature=temperature, max_tokens=max_tokens)

    schema = load_schema()

    print(f"\n{'='*60}")
    print(f"  FiCR Pipeline — {provider}/{model}")
    print(f"{'='*60}\n")

    # Stage 1: LLM#1 → Survey JSON
    print("── Stage 1: NL → Survey JSON ──")
    survey = stage_llm1(llm, user_input, schema)
    print()

    # Stage 2: JSON → RDF
    print("── Stage 2: Survey JSON → RDF ──")
    abox_path = stage_convert(survey)
    print()

    # Stage 3: SPARQL queries
    print("── Stage 3: SPARQL Queries ──")
    sparql_results = stage_sparql(abox_path)
    print()

    # Stage 4: Report (optional)
    report = None
    if generate_report:
        print("── Stage 4: SPARQL → Report ──")
        r_provider = report_provider or provider
        r_model = report_model or default_models.get(r_provider, model)
        r_key = report_api_key or api_key

        llm2 = LLMAdapter(provider=r_provider, model=r_model,
                           api_key=r_key, base_url=base_url,
                           temperature=0.3, max_tokens=8192)
        report = stage_llm2(llm2, sparql_results)
        print()

    print(f"{'='*60}")
    print(f"  Pipeline complete")
    print(f"{'='*60}\n")

    return {
        "survey": survey,
        "abox_path": abox_path,
        "sparql_results": sparql_results,
        "report": report,
    }


# ═════════════════════════════════════════════════════════════════════════
#  CLI
# ═════════════════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(
        description="FiCR Pipeline — NL → Survey JSON → RDF → SPARQL → Report",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  python pipeline.py --provider claude --user "A two-storey dwelling …"
  python pipeline.py --provider openai --model gpt-4o --user-file desc.txt
  python pipeline.py --provider deepseek --no-report --user "…"
  python pipeline.py --provider claude --report-provider openai -o result.json
""")

    # Provider
    ap.add_argument("--provider", default="claude",
                    choices=["claude", "openai", "gemini", "deepseek", "glm"],
                    help="LLM provider for stage 1 (default: claude)")
    ap.add_argument("--model", default=None,
                    help="Model name (default: provider-specific)")
    ap.add_argument("--api-key", default=None,
                    help="API key (default: from env var)")
    ap.add_argument("--base-url", default=None,
                    help="Custom API base URL")

    # Input
    input_group = ap.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--user", type=str,
                             help="Natural language building description")
    input_group.add_argument("--user-file", type=str,
                             help="Path to text file with building description")
    input_group.add_argument("--survey-json", type=str,
                             help="Skip LLM#1; use pre-made survey JSON")

    # Report stage
    ap.add_argument("--no-report", action="store_true",
                    help="Skip LLM#2 report generation")
    ap.add_argument("--report-provider", default=None,
                    choices=["claude", "openai", "gemini", "deepseek", "glm"],
                    help="Separate LLM provider for report stage")
    ap.add_argument("--report-model", default=None,
                    help="Model for report stage")

    # Generation params
    ap.add_argument("--temperature", type=float, default=0.2)
    ap.add_argument("--max-tokens", type=int, default=16384)

    # Output
    ap.add_argument("-o", "--output", default=None,
                    help="Write full result to JSON file")
    ap.add_argument("--save-survey", default=None,
                    help="Save survey JSON to separate file")
    ap.add_argument("--save-report", default=None,
                    help="Save report markdown to separate file")

    args = ap.parse_args()

    # ── Get user input ──
    if args.survey_json:
        # Shortcut: skip LLM#1, load existing survey
        with open(args.survey_json, encoding="utf-8") as f:
            survey = json.load(f)

        schema = load_schema()
        errors = validate_survey(survey, schema)
        if errors:
            print(f"Validation errors in {args.survey_json}:")
            for e in errors:
                print(f"  - {e}")
            sys.exit(1)

        print(f"\n{'='*60}")
        print(f"  FiCR Pipeline — pre-loaded survey (LLM#1 skipped)")
        print(f"{'='*60}\n")

        print("── Stage 2: Survey JSON → RDF ──")
        abox_path = stage_convert(survey)
        print()

        print("── Stage 3: SPARQL Queries ──")
        sparql_results = stage_sparql(abox_path)
        print()

        report = None
        if not args.no_report:
            default_models = {
                "claude": "claude-sonnet-4-20250514",
                "openai": "gpt-4o",
                "gemini": "gemini-2.0-flash",
                "deepseek": "deepseek-chat",
                "glm": "glm-4-plus",
            }
            print("── Stage 4: SPARQL → Report ──")
            r_prov = args.report_provider or args.provider
            r_model = args.report_model or default_models.get(r_prov, "")
            llm2 = LLMAdapter(provider=r_prov, model=r_model,
                               api_key=args.api_key, base_url=args.base_url,
                               temperature=0.3, max_tokens=8192)
            report = stage_llm2(llm2, sparql_results)
            print()

        result = {
            "survey": survey,
            "abox_path": abox_path,
            "sparql_results": sparql_results,
            "report": report,
        }
    else:
        user_input = args.user
        if args.user_file:
            with open(args.user_file, encoding="utf-8") as f:
                user_input = f.read().strip()

        result = run_pipeline(
            user_input=user_input,
            provider=args.provider,
            model=args.model,
            api_key=args.api_key,
            base_url=args.base_url,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            generate_report=not args.no_report,
            report_provider=args.report_provider,
            report_model=args.report_model,
        )

    # ── Save outputs ──
    try:
        slug = result["survey"]["meta"]["project_slug"]
        project_dir = OUTPUT_DIR / slug
    except KeyError:
        project_dir = OUTPUT_DIR

    project_dir.mkdir(parents=True, exist_ok=True)

    # Automatically set default save paths if not provided
    save_survey_path = args.save_survey or str(project_dir / "survey_and_results.json")
    save_report_path = args.save_report or str(project_dir / "report.md")

    # We use save_survey_path to save the full result (including SPARQL output) to replace the old -o flag functionality.
    out = {
        "survey": result["survey"],
        "abox_path": result["abox_path"],
        "sparql_results": result["sparql_results"],
        "report": result.get("report"),
    }
    with open(save_survey_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"Survey and results saved to {save_survey_path}")

    if result.get("report"):
        with open(save_report_path, "w", encoding="utf-8") as f:
            f.write(result["report"])
        print(f"Report saved to {save_report_path}")

    if args.output and args.output != save_survey_path:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
        print(f"Full result also written to {args.output}")

    # Print report to stdout if generated
    if result.get("report"):
        print(f"\n{'─'*60}")
        print(result["report"])
        print(f"{'─'*60}")


if __name__ == "__main__":
    main()
