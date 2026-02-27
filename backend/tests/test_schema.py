"""test_schema.py — Validate survey_schema.json with positive + destructive samples."""

import json
import copy
import sys
from pathlib import Path
from jsonschema import validate, ValidationError, Draft202012Validator

# Project root = parent of tests/
ROOT = Path(__file__).resolve().parent.parent


def load_json(path):
    with open(ROOT / path, encoding="utf-8") as f:
        return json.load(f)


def check(label, schema, instance, expect_valid=True):
    """Validate and report. Returns True if outcome matches expectation."""
    try:
        validate(instance=instance, schema=schema,
                 format_checker=Draft202012Validator.FORMAT_CHECKER)
        valid = True
        err_msg = None
    except ValidationError as e:
        valid = False
        err_msg = e.message[:120]

    ok = (valid == expect_valid)
    icon = "PASS" if ok else "FAIL"
    detail = ""
    if expect_valid and not valid:
        detail = f"  unexpected error: {err_msg}"
    elif not expect_valid and valid:
        detail = "  should have been rejected"
    elif not expect_valid and not valid:
        detail = f"  correctly rejected: {err_msg}"

    print(f"  [{icon}] {label}{detail}")
    return ok


def main():
    schema = load_json("schemas/survey_schema.json")
    survey = load_json("references/duplex_a_survey.json")

    passed = 0
    failed = 0

    def run(label, instance, expect_valid=True):
        nonlocal passed, failed
        if check(label, schema, instance, expect_valid):
            passed += 1
        else:
            failed += 1

    # ── Positive test ─────────────────────────────────────────────
    print("\n=== POSITIVE SAMPLE (duplex_a_survey.json) ===")
    run("Full survey JSON", survey, expect_valid=True)

    # ── Destructive tests ─────────────────────────────────────────
    print("\n=== DESTRUCTIVE SAMPLES ===")

    # 1. Missing required top-level key
    d = copy.deepcopy(survey)
    del d["risk_units"]
    run("Missing 'risk_units' key", d, expect_valid=False)

    # 2. Extra top-level key
    d = copy.deepcopy(survey)
    d["extra_field"] = "bad"
    run("Extra top-level key", d, expect_valid=False)

    # 3. Wrong schema_version
    d = copy.deepcopy(survey)
    d["meta"]["schema_version"] = "ficr-survey-v2"
    run("Wrong schema_version", d, expect_valid=False)

    # 4. Invalid project_slug (spaces)
    d = copy.deepcopy(survey)
    d["meta"]["project_slug"] = "duplex a"
    run("project_slug with spaces", d, expect_valid=False)

    # 5. Invalid building type
    d = copy.deepcopy(survey)
    d["building"]["type"] = "ficr:SingleStoreyBuilding"
    run("Invalid building type", d, expect_valid=False)

    # 6. Invalid purpose group
    d = copy.deepcopy(survey)
    d["building"]["purpose_group"] = "ficr:PurposeGroup99"
    run("Invalid purpose group", d, expect_valid=False)

    # 7. Invalid storey type
    d = copy.deepcopy(survey)
    d["storeys"][0]["type"] = "ficr:UndergroundStorey"
    run("Invalid storey type", d, expect_valid=False)

    # 8. Invalid space type
    d = copy.deepcopy(survey)
    d["spaces"][0]["type"] = "ficr:ParkingSpace"
    run("Invalid space type", d, expect_valid=False)

    # 9. Invalid space usage
    d = copy.deepcopy(survey)
    d["spaces"][0]["usage"] = "ficr:SwimmingPool"
    run("Invalid space usage", d, expect_valid=False)

    # 10. Invalid element type
    d = copy.deepcopy(survey)
    d["elements"][0]["type"] = "ficr:Beam"
    run("Invalid element type (Beam)", d, expect_valid=False)

    # 11. Negative REI value
    d = copy.deepcopy(survey)
    # Find first wall
    for i, e in enumerate(d["elements"]):
        if e["type"] == "ficr:Wall":
            d["elements"][i]["rei"] = -10
            break
    run("Negative REI on Wall", d, expect_valid=False)

    # 12. String instead of number for area
    d = copy.deepcopy(survey)
    d["spaces"][0]["area_m2"] = "seventeen"
    run("String area_m2 on Space", d, expect_valid=False)

    # 13. Invalid condition_state
    d = copy.deepcopy(survey)
    d["boundary_assumptions"][0]["condition_state"] = "ficr:Broken"
    run("Invalid condition_state", d, expect_valid=False)

    # 14. Invalid installation_status
    d = copy.deepcopy(survey)
    d["risk_units"][0]["installation_status"] = "ficr:PartiallyInstalled"
    run("Invalid installation_status", d, expect_valid=False)

    # 15. Invalid assumption_type
    d = copy.deepcopy(survey)
    d["boundary_assumptions"][0]["assumption_type"] = "ficr:MagicAssumption"
    run("Invalid assumption_type", d, expect_valid=False)

    # 16. Invalid evidence type
    d = copy.deepcopy(survey)
    d["evidence_log"][0]["type"] = "ficr:HearsayEvidence"
    run("Invalid evidence type", d, expect_valid=False)

    # 17. Empty storeys array
    d = copy.deepcopy(survey)
    d["storeys"] = []
    run("Empty storeys array", d, expect_valid=False)

    # 18. Empty spaces array
    d = copy.deepcopy(survey)
    d["spaces"] = []
    run("Empty spaces array", d, expect_valid=False)

    # 19. Empty elements array
    d = copy.deepcopy(survey)
    d["elements"] = []
    run("Empty elements array", d, expect_valid=False)

    # 20. Missing required field on building
    d = copy.deepcopy(survey)
    del d["building"]["purpose_group"]
    run("Missing building.purpose_group", d, expect_valid=False)

    # 21. Extra property on element
    d = copy.deepcopy(survey)
    for i, e in enumerate(d["elements"]):
        if e["type"] == "ficr:Wall":
            d["elements"][i]["color"] = "red"
            break
    run("Extra property on Wall element", d, expect_valid=False)

    # 22. Missing storey_ref on space
    d = copy.deepcopy(survey)
    del d["spaces"][0]["storey_ref"]
    run("Missing space.storey_ref", d, expect_valid=False)

    # 23. Missing applies_to_risk_unit on boundary assumption
    d = copy.deepcopy(survey)
    del d["boundary_assumptions"][0]["applies_to_risk_unit"]
    run("Missing BA.applies_to_risk_unit", d, expect_valid=False)

    # 24. Risk unit covers_spaces empty
    d = copy.deepcopy(survey)
    d["risk_units"][0]["covers_spaces"] = []
    run("Empty covers_spaces on risk unit", d, expect_valid=False)

    # 25. Invalid slab_type
    d = copy.deepcopy(survey)
    for i, e in enumerate(d["elements"]):
        if e["type"] == "ficr:Slab":
            d["elements"][i]["slab_type"] = "wall_slab"
            break
    run("Invalid slab_type", d, expect_valid=False)

    # ── Summary ───────────────────────────────────────────────────
    total = passed + failed
    print(f"\n{'='*50}")
    print(f"  {passed}/{total} tests passed", end="")
    if failed:
        print(f"  ({failed} FAILED)")
    else:
        print("  — all green")
    print()
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
