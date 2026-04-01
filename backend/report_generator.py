"""FiCR Deterministic Report Generator

Produces a structured Markdown compliance report from SPARQL query results.
NO LLM calls — pure Python string formatting. Same input always produces
the same output.

Input:  dict from ficr_sparql_runner.run()
        {
          "meta": { "total_triples": N, ... },
          "probes": { ... },
          "results": {
            "A1": { "title": "...", "columns": [...], "rows": [...], "row_count": N },
            ...  # 13 query results (A1-A6, B1-B3, C1-C4)
          }
        }

Output: Markdown string — structured compliance report
"""


def generate_report(sparql_results: dict) -> str:
    """Generate a deterministic compliance report from SPARQL results."""
    results = sparql_results.get("results", {})
    meta = sparql_results.get("meta", {})

    sections = [
        _section_header(meta),
        _section_overview(results),       # A1, A2
        _section_spatial(results),        # A3, A4
        _section_elements(results),       # A5, A6
        _section_compliance(results),     # B1, B2, B3
        _section_risk(results),           # C1, C2, C3, C4
        _section_inspection(results),     # D1, D2
    ]
    return "\n\n".join(s for s in sections if s)


# ── Helpers ──────────────────────────────────────────────────────────


def _get_rows(results: dict, query_id: str) -> list[dict]:
    """Safely get rows from a query result."""
    entry = results.get(query_id, {})
    return entry.get("rows", [])


def _get_columns(results: dict, query_id: str) -> list[str]:
    """Safely get column names from a query result."""
    entry = results.get(query_id, {})
    return entry.get("columns", [])


def _table(rows: list[dict], columns: list[str],
           headers: list[str] | None = None) -> str:
    """Format a list of dicts as a Markdown table."""
    if not rows or not columns:
        return "_No data available._"
    hdrs = headers or columns
    lines = [
        "| " + " | ".join(hdrs) + " |",
        "| " + " | ".join("---" for _ in hdrs) + " |",
    ]
    for row in rows:
        cells = [_fmt(row.get(col)) for col in columns]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def _fmt(val) -> str:
    """Format a value for table display."""
    if val is None:
        return "—"
    if isinstance(val, float):
        # Drop trailing zeros for cleaner display
        if val == int(val):
            return str(int(val))
        return f"{val:.2f}"
    return str(val)


# ── Report header ────────────────────────────────────────────────────


def _section_header(meta: dict) -> str:
    lines = ["# FiCR Compliance & Risk Report", ""]
    triples = meta.get("total_triples")
    qcount = meta.get("query_count")
    failed = meta.get("probes_failed", [])
    if triples:
        lines.append(f"- **Knowledge graph**: {triples:,} triples")
    if qcount is not None:
        lines.append(f"- **Queries executed**: {qcount}")
    if failed:
        lines.append(f"- **Probe warnings**: {', '.join(failed)}")
    else:
        lines.append("- **All data probes passed**")
    lines.append("- **Report mode**: Deterministic (no LLM)")
    return "\n".join(lines)


# ── Section 1: Building Overview (A1, A2) ────────────────────────────


def _section_overview(results: dict) -> str:
    parts = ["## 1. Building Overview"]

    # A1: Building overview
    rows_a1 = _get_rows(results, "A1")
    if rows_a1:
        r = rows_a1[0]
        parts.append(f"**Site**: {_fmt(r.get('siteLabel'))}")
        parts.append(
            f"**Building type**: {_fmt(r.get('buildingType'))}  \n"
            f"**Purpose group**: {_fmt(r.get('purposeGroup'))}  \n"
            f"**Utilization purpose**: {_fmt(r.get('utilizationPurpose'))}  \n"
            f"**Storeys**: {_fmt(r.get('storeyCount'))}  \n"
            f"**Total spaces**: {_fmt(r.get('totalSpaceCount'))}"
        )
    else:
        parts.append("_No building overview data available._")

    # A2: Storey inventory
    rows_a2 = _get_rows(results, "A2")
    if rows_a2:
        parts.append("### Storey Inventory")
        parts.append(_table(
            rows_a2,
            ["storeyLabel", "storeyType", "elevation_m",
             "storeyHeight_m", "spaceCount"],
            ["Storey", "Type", "Elevation (m)", "Height (m)", "Spaces"],
        ))
    return "\n\n".join(parts)


# ── Section 2: Spatial Inventory (A3, A4) ────────────────────────────


def _section_spatial(results: dict) -> str:
    parts = ["## 2. Spatial Inventory"]

    # A3: Space ledger
    rows_a3 = _get_rows(results, "A3")
    if rows_a3:
        parts.append("### Space Ledger")
        parts.append(_table(
            rows_a3,
            ["storeyLabel", "spaceLabel", "usageLabel",
             "areaM2", "adjacentSpaces"],
            ["Storey", "Space", "Usage", "Area (m\u00b2)", "Adjacent Spaces"],
        ))
    else:
        parts.append("_No space ledger data available._")

    # A4: Usage distribution
    rows_a4 = _get_rows(results, "A4")
    if rows_a4:
        parts.append("### Usage Distribution")
        parts.append(_table(
            rows_a4,
            ["usageType", "count"],
            ["Usage Type", "Count"],
        ))
    return "\n\n".join(parts)


# ── Section 3: Element Inventory (A5, A6) ────────────────────────────


def _section_elements(results: dict) -> str:
    parts = ["## 3. Element Inventory"]

    # A5: Element type counts
    rows_a5 = _get_rows(results, "A5")
    if rows_a5:
        parts.append("### Element Type Summary")
        parts.append(_table(
            rows_a5,
            ["elementType", "count"],
            ["Element Type", "Count"],
        ))
    else:
        parts.append("_No element inventory data available._")

    # A6: Per-space breakdown
    rows_a6 = _get_rows(results, "A6")
    if rows_a6:
        parts.append("### Per-Space Fire Protection Breakdown")
        # Group by space for readability
        spaces: dict[str, list[dict]] = {}
        for row in rows_a6:
            sp = row.get("spaceLabel", "Unknown")
            spaces.setdefault(sp, []).append(row)

        for space_label, items in spaces.items():
            parts.append(f"**{space_label}**")
            parts.append(_table(
                items,
                ["category", "itemType", "itemLabel"],
                ["Category", "Type", "Label"],
            ))
    return "\n\n".join(parts)


# ── Section 4: Compliance Assessment (B1, B2, B3) ───────────────────


def _section_compliance(results: dict) -> str:
    parts = ["## 4. Compliance Assessment"]

    # B1: Health score
    rows_b1 = _get_rows(results, "B1")
    if rows_b1:
        parts.append("### Health Score Summary")
        parts.append(_table(
            rows_b1,
            ["category", "status", "count"],
            ["Category", "Status", "Count"],
        ))

        # Compute summary stats
        total = sum(r.get("count", 0) for r in rows_b1)
        non_compliant = sum(
            r.get("count", 0) for r in rows_b1
            if "Non-Compliant" in str(r.get("status", ""))
        )
        if total > 0:
            rate = (total - non_compliant) / total * 100
            parts.append(
                f"**Overall compliance rate**: {rate:.1f}% "
                f"({total - non_compliant}/{total} checks passed)"
            )
    else:
        parts.append("_No compliance health score data available._")

    # B2: Non-compliant elements detail
    rows_b2 = _get_rows(results, "B2")
    if rows_b2:
        non_compliant_rows = [
            r for r in rows_b2
            if r.get("complianceStatus") == "Non-Compliant"
        ]
        if non_compliant_rows:
            parts.append("### Non-Compliant Elements")
            parts.append(_table(
                non_compliant_rows,
                ["assetType", "elementLabel", "spaceLabel",
                 "actualREI", "requiredREI", "issue"],
                ["Type", "Element", "Space",
                 "Actual REI", "Required REI", "Issue"],
            ))
        else:
            parts.append("### Element-Level REI Detail")
            parts.append(
                "_All elements with REI ratings meet regulatory requirements._"
            )

        # Also show compliant count
        compliant_count = len(rows_b2) - len(non_compliant_rows)
        parts.append(
            f"**Elements assessed**: {len(rows_b2)} "
            f"(Compliant: {compliant_count}, "
            f"Non-Compliant: {len(non_compliant_rows)})"
        )

    # B3: OWL-inferred classification
    rows_b3 = _get_rows(results, "B3")
    if rows_b3:
        parts.append("### OWL-Inferred Classification Audit")
        parts.append(_table(
            rows_b3,
            ["definedClassName", "inferredCount", "triggerCondition"],
            ["Defined Class", "Inferred Instances", "Trigger Condition"],
        ))
        total_inferred = sum(r.get("inferredCount", 0) for r in rows_b3)
        active_classes = sum(1 for r in rows_b3 if r.get("inferredCount", 0) > 0)
        parts.append(
            f"**Classification summary**: {total_inferred} instances "
            f"across {active_classes} active class definitions "
            f"(out of {len(rows_b3)} defined)"
        )

    return "\n\n".join(parts)


# ── Section 5: Risk Assessment (C1, C2, C3, C4) ─────────────────────


def _section_risk(results: dict) -> str:
    parts = ["## 5. Risk Assessment"]

    # C1: Risk unit overview
    rows_c1 = _get_rows(results, "C1")
    if rows_c1:
        parts.append("### Risk Unit Inventory")
        # Summarise by risk unit
        ru_summary: dict[str, dict] = {}
        for row in rows_c1:
            ru = row.get("ruLabel", "Unknown")
            if ru not in ru_summary:
                ru_summary[ru] = {
                    "installStatus": row.get("installStatus", "—"),
                    "spaces": [],
                }
            sp = row.get("spaceLabel")
            if sp:
                ru_summary[ru]["spaces"].append(sp)

        summary_rows = [
            {
                "ruLabel": ru,
                "installStatus": info["installStatus"],
                "spaceCount": len(info["spaces"]),
                "spaces": ", ".join(info["spaces"][:5])
                          + ("..." if len(info["spaces"]) > 5 else ""),
            }
            for ru, info in ru_summary.items()
        ]
        parts.append(_table(
            summary_rows,
            ["ruLabel", "installStatus", "spaceCount", "spaces"],
            ["Risk Unit", "Sprinkler Status", "Spaces", "Covered Spaces"],
        ))
    else:
        parts.append("_No risk unit data available._")

    # C2: Condition state distribution
    rows_c2 = _get_rows(results, "C2")
    if rows_c2:
        parts.append("### Boundary Assumption Condition Distribution")
        parts.append(_table(
            rows_c2,
            ["ruLabel", "conditionState", "count"],
            ["Risk Unit", "Condition State", "Count"],
        ))

    # C3: Evidence completeness and gaps
    rows_c3 = _get_rows(results, "C3")
    if rows_c3:
        gaps = [r for r in rows_c3 if r.get("gapFlag") == "EVIDENCE GAP"]
        if gaps:
            parts.append("### Evidence Gaps (Action Required)")
            parts.append(_table(
                gaps,
                ["ruLabel", "assumptionLabel", "assumptionType",
                 "conditionState"],
                ["Risk Unit", "Assumption", "Type", "Condition"],
            ))
        else:
            parts.append(
                "### Evidence Completeness\n\n"
                "_All boundary assumptions have supporting evidence._"
            )

        # Full evidence table
        parts.append("### Full Evidence Ledger")
        parts.append(_table(
            rows_c3,
            ["ruLabel", "assumptionLabel", "assumptionType",
             "conditionState", "evidenceType", "docTitle", "gapFlag"],
            ["Risk Unit", "Assumption", "Type",
             "Condition", "Evidence Type", "Document", "Gap Flag"],
        ))

    # C4: Worst-first confidence ranking
    rows_c4 = _get_rows(results, "C4")
    if rows_c4:
        parts.append("### Risk Unit Priority Ranking (Worst-First)")
        parts.append(_table(
            rows_c4,
            ["ruLabel", "totalAssumptions", "unknownCount",
             "compromisedCount", "evidenceGapCount", "installStatus"],
            ["Risk Unit", "Total Assumptions", "Unknown", "Compromised",
             "Evidence Gaps", "Sprinkler Status"],
        ))

        # Highlight highest-risk unit
        worst = rows_c4[0]
        gaps = worst.get("evidenceGapCount", 0)
        unknowns = worst.get("unknownCount", 0)
        if gaps > 0 or unknowns > 0:
            parts.append(
                f"> **Priority**: **{_fmt(worst.get('ruLabel'))}** has the "
                f"highest uncertainty ({gaps} evidence gaps, "
                f"{unknowns} unknown assumptions) and should be "
                f"prioritised for inspection."
            )

    return "\n\n".join(parts)


# ── Section 6: Inspection Workflow (D1, D2) ──────────────────────────


def _section_inspection(results: dict) -> str:
    """Section 6: Inspection workflow summary and compliance assessment results."""
    parts = ["## 6. Inspection Workflow"]

    # D1: Inspection Workflow Summary
    rows_d1 = _get_rows(results, "D1")
    if rows_d1:
        parts.append("### Inspection Event Summary")
        parts.append(_table(
            rows_d1,
            ["eventLabel", "taskLabel", "taskType", "startTime", "endTime",
             "assessmentLabel", "assessmentType"],
            ["Event", "Task", "Task Type", "Start", "End",
             "Assessment", "Assessment Type"],
        ))
    else:
        parts.append(
            "_Module D (Inspection Workflow) requires operational system "
            "integration and is not populated in survey-text instantiation._"
        )

    # D2: Compliance Assessment Results
    rows_d2 = _get_rows(results, "D2")
    if rows_d2:
        parts.append("### Compliance Assessment Results")
        parts.append(_table(
            rows_d2,
            ["assessmentLabel", "resultType", "regulatorySourceLabel",
             "evidenceLabel"],
            ["Assessment", "Result", "Regulatory Source", "Evidence"],
        ))

        # Summary counts
        compliant = sum(1 for r in rows_d2
                        if "Compliant" in str(r.get("resultType", ""))
                        and "Non" not in str(r.get("resultType", "")))
        non_compliant = sum(1 for r in rows_d2
                            if "NonCompliant" in str(r.get("resultType", "")))
        undetermined = sum(1 for r in rows_d2
                           if "Undetermined" in str(r.get("resultType", "")))
        parts.append(
            f"> **Assessment Summary**: {compliant} compliant, "
            f"{non_compliant} non-compliant, {undetermined} undetermined"
        )
    else:
        parts.append(
            "_Module D2 (Compliance Assessment Results) requires operational "
            "system integration and is not populated in survey-text instantiation._"
        )

    return "\n\n".join(parts)
