"""ficr_sparql_runner.py — Load merged graph, probe-validate, execute CQ queries.

Merges ficr_tbox.ttl + ficr_regulatory_config.ttl + ABox TTL,
runs precondition probes for each query, then executes all SELECT
queries from the .sparql file and outputs structured JSON.

Usage:
    python ficr_sparql_runner.py \
        --tbox  References/ficr_tbox.ttl \
        --reg   References/ficr_regulatory_config.ttl \
        --abox  duplex_a_abox.ttl \
        --sparql References/ficr_risk_discovery_queries.sparql \
        -o results.json --summary
"""

import json
import re
import argparse
from rdflib import Graph, Namespace, Literal, URIRef

FICR = Namespace("https://w3id.org/bam/ficr#")
BOT = Namespace("https://w3id.org/bot#")

_PFX = """\
PREFIX ficr: <https://w3id.org/bam/ficr#>
PREFIX bot:  <https://w3id.org/bot#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
"""

# ── Probe definitions ─────────────────────────────────────────────────
# Each probe is a lightweight ASK query that checks the minimal
# precondition for its corresponding CQ query.  A failed probe means
# the CQ will likely return 0 rows (data gap, not a code bug).

PROBES = {
    "A1": (
        "MultiStoreyBuilding with at least one Storey",
        _PFX + "ASK { ?b a ficr:MultiStoreyBuilding ; bot:hasStorey ?s }",
    ),
    "A2": (
        "Storey containing a labelled Space",
        _PFX + "ASK { ?st bot:hasSpace ?sp . ?sp rdfs:label ?l }",
    ),
    "A3": (
        "Space with hasSpaceUsage",
        _PFX + "ASK { ?sp ficr:hasSpaceUsage ?u }",
    ),
    "A4": (
        "At least one element instance (Wall/Slab/Doorset/Ceiling/Window)",
        _PFX + """ASK {
            { ?e a ficr:Wall } UNION { ?e a ficr:Slab } UNION
            { ?e a ficr:Doorset } UNION { ?e a ficr:Ceiling } UNION
            { ?e a ficr:Window }
        }""",
    ),
    "A5": (
        "Space with adjacentElement of type Wall/Slab/Doorset",
        _PFX + """ASK {
            ?sp bot:adjacentElement ?el .
            { ?el a ficr:Wall } UNION { ?el a ficr:Slab }
            UNION { ?el a ficr:Doorset }
        }""",
    ),
    "B1": (
        "Wall or Slab with hasREI AND regulatory requirement with hasREI",
        _PFX + """ASK {
            { ?w a ficr:Wall ; ficr:hasREI ?v }
            { ?req a ficr:RegulatoryRequirement ; ficr:hasREI ?r }
        }""",
    ),
    "B2": (
        "Wall or Slab with hasREI AND regulatory requirement with hasREI",
        _PFX + """ASK {
            { ?w a ficr:Wall ; ficr:hasREI ?v }
            { ?req a ficr:RegulatoryRequirement ; ficr:hasREI ?r }
        }""",
    ),
    "C1": (
        "At least one RiskUnit",
        _PFX + "ASK { ?ru a ficr:RiskUnit }",
    ),
    "C2": (
        "RiskUnit with coversSpatialZone",
        _PFX + "ASK { ?ru a ficr:RiskUnit ; ficr:coversSpatialZone ?sp }",
    ),
    "C3": (
        "BoundaryAssumption with hasConditionState",
        _PFX + """ASK {
            ?ba a ficr:BoundaryAssumption ; ficr:hasConditionState ?cs
        }""",
    ),
    "C4": (
        "BoundaryAssumption with condition Unknown",
        _PFX + """ASK {
            ?ba a ficr:BoundaryAssumption ;
                ficr:hasConditionState ficr:Unknown
        }""",
    ),
    "C5": (
        "ImpairmentState instance (Operational/Impaired/ImpairmentUnknown)",
        _PFX + """ASK {
            ?imp a ?t .
            FILTER(?t IN (ficr:Operational, ficr:Impaired,
                          ficr:ImpairmentUnknown))
        }""",
    ),
    "C6": (
        "BoundaryAssumption with supportedByEvidence",
        _PFX + """ASK {
            ?ba a ficr:BoundaryAssumption ; ficr:supportedByEvidence ?ev
        }""",
    ),
    "C7": (
        "RiskUnit with associated BoundaryAssumption",
        _PFX + """ASK {
            ?ru a ficr:RiskUnit .
            ?ba a ficr:BoundaryAssumption ; ficr:appliesToRiskUnit ?ru
        }""",
    ),
}


# ── Graph loading ─────────────────────────────────────────────────────

def load_graph(tbox_path: str, regulatory_path: str, abox_path: str) -> Graph:
    """Parse and merge TBox + regulatory config + ABox into one Graph."""
    g = Graph()
    g.parse(tbox_path, format="turtle")
    g.parse(regulatory_path, format="turtle")
    g.parse(abox_path, format="turtle")
    return g


# ── SPARQL file parser ────────────────────────────────────────────────

def parse_sparql_file(path: str) -> list[tuple[str, str, str]]:
    """Split a multi-query .sparql file into (id, title, full_query) tuples."""
    with open(path, encoding="utf-8") as f:
        text = f.read()

    # Collect shared PREFIX block
    prefix_lines = []
    for line in text.splitlines():
        if line.strip().upper().startswith("PREFIX"):
            prefix_lines.append(line)
        elif prefix_lines:
            break
    prefix_block = "\n".join(prefix_lines)

    # Locate section headers:  # --- A1: Title --...
    header_re = re.compile(
        r'^# ---\s+(\w+):\s*(.+?)\s*-*\s*$', re.MULTILINE)
    headers = list(header_re.finditer(text))

    queries = []
    for i, m in enumerate(headers):
        qid = m.group(1)
        title = m.group(2).strip().rstrip("-").strip()
        start = m.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        block = text[start:end]

        # Isolate the SELECT … (strip trailing module separators)
        sel = re.search(r'(SELECT\b.*)', block, re.DOTALL)
        if sel:
            body = sel.group(1).strip()
            body = re.sub(r'\n# =+\n.*', '', body, flags=re.DOTALL).strip()
            queries.append((qid, title, prefix_block + "\n\n" + body))

    return queries


# ── Probe runner ──────────────────────────────────────────────────────

def run_probes(g: Graph, query_ids: list[str]) -> dict:
    """Run ASK probes for each query id. Returns {qid: {pass, description}}."""
    out = {}
    for qid in query_ids:
        if qid not in PROBES:
            out[qid] = {"pass": True, "description": "(no probe defined)"}
            continue
        desc, ask = PROBES[qid]
        try:
            passed = bool(g.query(ask))
            out[qid] = {"pass": passed, "description": desc}
        except Exception as e:
            out[qid] = {"pass": False, "description": desc,
                        "error": str(e)}
    return out


# ── Value serialisation ───────────────────────────────────────────────

_STRIP_NS = (
    "https://w3id.org/bam/ficr#",
    "https://w3id.org/bot#",
)


def _to_json(val):
    """Convert an rdflib term to a JSON-friendly Python value."""
    if val is None:
        return None
    if isinstance(val, Literal):
        py = val.toPython()
        # Decimal → float for JSON compat
        if hasattr(py, "as_integer_ratio") and not isinstance(py, (int, float)):
            return float(py)
        return py
    s = str(val)
    for ns in _STRIP_NS:
        if s.startswith(ns):
            return s[len(ns):]
    if "ficr.example.com/instances/" in s:
        return s.rsplit("/", 1)[-1]
    return s


# ── Query executor ────────────────────────────────────────────────────

def execute_queries(g: Graph,
                    queries: list[tuple[str, str, str]]) -> dict:
    """Run SELECT queries and return structured results per query."""
    out = {}
    for qid, title, sparql in queries:
        entry = {"title": title}
        try:
            result = g.query(sparql)
            columns = [str(v) for v in result.vars]
            rows = []
            for row in result:
                rows.append({col: _to_json(row[col]) for col in columns})
            entry["columns"] = columns
            entry["rows"] = rows
            entry["row_count"] = len(rows)
        except Exception as e:
            entry["columns"] = []
            entry["rows"] = []
            entry["row_count"] = 0
            entry["error"] = str(e)
        out[qid] = entry
    return out


# ── Public API ────────────────────────────────────────────────────────

def run(tbox_path: str, regulatory_path: str,
        abox_path: str, sparql_path: str) -> dict:
    """Full pipeline: load → probe → execute → return structured dict."""
    g = load_graph(tbox_path, regulatory_path, abox_path)
    queries = parse_sparql_file(sparql_path)
    qids = [q[0] for q in queries]

    probes = run_probes(g, qids)
    results = execute_queries(g, queries)

    failed = [qid for qid, p in probes.items() if not p["pass"]]

    return {
        "meta": {
            "tbox": str(tbox_path),
            "regulatory_config": str(regulatory_path),
            "abox": str(abox_path),
            "sparql_file": str(sparql_path),
            "total_triples": len(g),
            "query_count": len(queries),
            "probes_failed": failed,
        },
        "probes": probes,
        "results": results,
    }


# ── CLI ───────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description="FiCR SPARQL Runner — load, probe, execute CQ queries")
    ap.add_argument("--tbox", required=True)
    ap.add_argument("--reg", required=True,
                     help="ficr_regulatory_config.ttl")
    ap.add_argument("--abox", required=True, help="ABox TTL file")
    ap.add_argument("--sparql", required=True, help=".sparql query file")
    ap.add_argument("-o", "--output", default=None, help="Output JSON path")
    ap.add_argument("--summary", action="store_true",
                     help="Print summary table to stdout")
    args = ap.parse_args()

    data = run(args.tbox, args.reg, args.abox, args.sparql)

    # Write JSON
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Results written to {args.output}")

    # Summary to stdout
    if args.summary or not args.output:
        m = data["meta"]
        print(f"\n{'='*60}")
        print(f"  FiCR SPARQL Runner")
        print(f"{'='*60}")
        print(f"  Triples : {m['total_triples']}")
        print(f"  Queries : {m['query_count']}")
        if m["probes_failed"]:
            print(f"  PROBES FAILED: {m['probes_failed']}")
        else:
            print(f"  All probes passed")
        print(f"{'='*60}")
        for qid, res in data["results"].items():
            p = data["probes"].get(qid, {})
            icon = "PASS" if p.get("pass", True) else "WARN"
            err = f"  [{res['error']}]" if "error" in res else ""
            print(f"  [{icon}] {qid:>3}: {res['title']:<55} "
                  f"{res['row_count']:>4} rows{err}")
        print()


if __name__ == "__main__":
    main()
