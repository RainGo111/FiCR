#!/usr/bin/env python3
"""
FiCR Ontology Sync Script
Usage: python scripts/sync_ontology.py

Reads ontology/VERSION and ontology/, then copies files to all
downstream locations. Updates siteConfig.json version string.
Run this every time ficr_tbox.ttl or ficr_demo.ttl is updated in Protégé.
"""
import shutil
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT / "ontology" / "VERSION"
ONTOLOGY = ROOT / "ontology"


def read_version() -> str:
    return VERSION_FILE.read_text().strip()


def sync():
    version = read_version()
    print(f"Syncing ontology v{version}...")

    # ── 1. Copy TBox to public/ ──────────────────────────────────────────
    shutil.copy2(ONTOLOGY / "ficr_tbox.ttl", ROOT / "public" / "ficr_tbox.ttl")
    print(f"  -> public/ficr_tbox.ttl")

    # ── 2. Copy demo to public/ ──────────────────────────────────────────
    shutil.copy2(ONTOLOGY / "ficr_demo.ttl", ROOT / "public" / "ficr_demo.ttl")
    print(f"  -> public/ficr_demo.ttl")

    # ── 3. Copy regulatory config and SPARQL to backend/references/ ──────
    refs = ROOT / "backend" / "references"
    shutil.copy2(
        ONTOLOGY / "ficr_regulatory_config.ttl",
        refs / "ficr_regulatory_config.ttl"
    )
    shutil.copy2(
        ONTOLOGY / "ficr_risk_discovery_queries.sparql",
        refs / "ficr_risk_discovery_queries.sparql"
    )
    print(f"  -> backend/references/ (regulatory_config + sparql)")

    # ── 4. Update siteConfig.json version string ─────────────────────────
    config_path = ROOT / "src" / "content" / "siteConfig.json"
    if config_path.exists():
        with open(config_path, encoding="utf-8") as f:
            config = json.load(f)
        config_str = json.dumps(config, indent=2, ensure_ascii=False)
        config_str = re.sub(r'\b0\.\d+\.\d+\b', version, config_str)
        with open(config_path, "w", encoding="utf-8") as f:
            f.write(config_str)
        print(f"  -> src/content/siteConfig.json (version -> {version})")

    # ── 5. Summary ───────────────────────────────────────────────────────
    print(f"\nSync complete. Ontology v{version} deployed to:")
    print(f"  public/ficr_tbox.ttl")
    print(f"  public/ficr_demo.ttl")
    print(f"  backend/references/ficr_regulatory_config.ttl")
    print(f"  backend/references/ficr_risk_discovery_queries.sparql")
    print(f"\nNext steps after a Protege update:")
    print(f"  1. Copy updated TTL(s) to ontology/")
    print(f"  2. Update ontology/VERSION if version changed")
    print(f"  3. Run: python scripts/sync_ontology.py")
    print(f"  4. If ficr_demo changed: update backend/references/duplex_a_survey.json")
    print(f"  5. Update test_data/llm_inputs/ markdown files if needed")


if __name__ == "__main__":
    sync()
