"""Quick test: load TBox + regulatory config + ABox, run all 14 CQ queries."""

import re
from pathlib import Path
from rdflib import Graph

# Project root = parent of tests/
ROOT = Path(__file__).resolve().parent.parent


def load_merged_graph():
    g = Graph()
    g.parse(str(ROOT / "references/ficr_tbox.ttl"), format="turtle")
    g.parse(str(ROOT / "references/ficr_regulatory_config.ttl"), format="turtle")
    g.parse(str(ROOT / "output/duplex_a_abox.ttl"), format="turtle")
    print(f"Merged graph: {len(g)} triples\n")
    return g


def split_queries(path):
    """Split a multi-query .sparql file on blank-line-separated SELECT blocks."""
    with open(path, encoding="utf-8") as f:
        text = f.read()

    # Extract PREFIX block (shared)
    prefix_lines = []
    body_start = 0
    for line in text.splitlines():
        if line.strip().upper().startswith("PREFIX"):
            prefix_lines.append(line)
            body_start = text.index(line) + len(line) + 1
        elif line.strip().startswith("#") and not prefix_lines:
            continue
        elif prefix_lines and not line.strip().upper().startswith("PREFIX"):
            break
    prefix_block = "\n".join(prefix_lines)

    # Split on comment headers (# --- Xx: ...)
    pattern = r'(# ---\s+\w+:.*?)(?=# ---|\Z)'
    blocks = re.findall(pattern, text[body_start:], re.DOTALL)

    queries = []
    for block in blocks:
        # Extract query name from first comment line
        header_match = re.match(r'# ---\s+(\w+):', block)
        name = header_match.group(1) if header_match else "?"
        # Find SELECT ... (to end of block)
        sel_match = re.search(r'(SELECT.*)', block, re.DOTALL)
        if sel_match:
            full_query = prefix_block + "\n\n" + sel_match.group(1).strip()
            queries.append((name, full_query))
    return queries


def main():
    g = load_merged_graph()
    queries = split_queries(str(ROOT / "references/ficr_risk_discovery_queries.sparql"))
    print(f"Found {len(queries)} queries\n")

    for name, query in queries:
        print(f"{'='*60}")
        print(f"  {name}")
        print(f"{'='*60}")
        try:
            results = list(g.query(query))
            print(f"  Rows: {len(results)}")
            if results:
                # Print header
                varnames = [str(v) for v in results[0].labels]
                print(f"  Columns: {varnames}")
                # Print first few rows
                for i, row in enumerate(results):
                    if i >= 10:
                        print(f"  ... ({len(results) - 10} more rows)")
                        break
                    vals = [str(row[v]) if row[v] is not None else "--"
                            for v in results[0].labels]
                    print(f"  {vals}")
        except Exception as e:
            print(f"  ERROR: {e}")
        print()


if __name__ == "__main__":
    main()
