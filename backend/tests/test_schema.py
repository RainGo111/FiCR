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
    d["building"]["type"] = "SingleStoreyBuilding"
    run("Invalid building type", d, expect_valid=False)

    # 6. Invalid purpose group
    d = copy.deepcopy(survey)
    d["building"]["purpose_group"] = "PurposeGroup99"
    run("Invalid purpose group", d, expect_valid=False)

    # 7. Invalid storey type
    d = copy.deepcopy(survey)
    d["storeys"][0]["type"] = "UndergroundStorey"
    run("Invalid storey type", d, expect_valid=False)

    # 8. Invalid space type
    d = copy.deepcopy(survey)
    d["spaces"][0]["type"] = "ParkingSpace"
    run("Invalid space type", d, expect_valid=False)

    # 9. Invalid space usage
    d = copy.deepcopy(survey)
    d["spaces"][0]["usage"] = "SwimmingPool"
    run("Invalid space usage", d, expect_valid=False)

    # 10. Invalid element type
    d = copy.deepcopy(survey)
    d["elements"][0]["type"] = "Pipe"
    run("Invalid element type (Pipe)", d, expect_valid=False)

    # 11. Negative REI value
    d = copy.deepcopy(survey)
    for i, e in enumerate(d["elements"]):
        if e["type"] == "Wall":
            d["elements"][i]["rei"] = -10
            break
    run("Negative REI on Wall", d, expect_valid=False)

    # 12. String instead of number for area
    d = copy.deepcopy(survey)
    d["spaces"][0]["area_m2"] = "seventeen"
    run("String area_m2 on Space", d, expect_valid=False)

    # 13. Invalid condition_state
    d = copy.deepcopy(survey)
    d["boundary_assumptions"][0]["condition_state"] = "Broken"
    run("Invalid condition_state", d, expect_valid=False)

    # 14. Invalid installation_status
    d = copy.deepcopy(survey)
    d["risk_units"][0]["installation_status"] = "PartiallyInstalled"
    run("Invalid installation_status", d, expect_valid=False)

    # 15. Invalid assumption_type
    d = copy.deepcopy(survey)
    d["boundary_assumptions"][0]["assumption_type"] = "MagicAssumption"
    run("Invalid assumption_type", d, expect_valid=False)

    # 16. Invalid evidence type
    d = copy.deepcopy(survey)
    d["evidence_log"][0]["type"] = "HearsayEvidence"
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
        if e["type"] == "Wall":
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

    # 25. FloorSlab missing required field (rei)
    d = copy.deepcopy(survey)
    floor_slab_found = False
    for i, e in enumerate(d["elements"]):
        if e["type"] == "FloorSlab":
            # Remove a required field to trigger validation failure
            if "rei" in d["elements"][i]:
                del d["elements"][i]["rei"]
                floor_slab_found = True
                break
    if floor_slab_found:
        run("FloorSlab missing required 'rei'", d, expect_valid=False)
    else:
        print("  [SKIP] No FloorSlab elements in sample for destructive test")

    # ── New element type tests ─────────────────────────────────────
    print("\n=== NEW ELEMENT TYPE TESTS ===")

    # 26. Beam element validates
    d = copy.deepcopy(survey)
    beam_found = any(e["type"] == "Beam" for e in d["elements"])
    if beam_found:
        run("Beam elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No Beam elements in sample")

    # 27. WallFoundation element validates
    wf_found = any(e["type"] == "WallFoundation" for e in d["elements"])
    if wf_found:
        run("WallFoundation elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No WallFoundation elements in sample")

    # 28. Invalid Beam with extra property
    d = copy.deepcopy(survey)
    for i, e in enumerate(d["elements"]):
        if e["type"] == "Beam":
            d["elements"][i]["color"] = "blue"
            break
    run("Extra property on Beam element", d, expect_valid=False)

    # 29. Storey with new optional fields validates
    d = copy.deepcopy(survey)
    has_storey_above = any(
        "storey_above" in s for s in d["storeys"]
    )
    if has_storey_above:
        run("Storey with storey_above/storey_below valid", d, expect_valid=True)
    else:
        print("  [SKIP] No storey_above in sample storeys")

    # 30. Space with adjacent_spaces validates
    d = copy.deepcopy(survey)
    has_adj_spaces = any(
        "adjacent_spaces" in s for s in d["spaces"]
    )
    if has_adj_spaces:
        run("Space with adjacent_spaces valid", d, expect_valid=True)
    else:
        print("  [SKIP] No adjacent_spaces in sample spaces")

    # 31. Alarm element validates
    d = copy.deepcopy(survey)
    alarm_found = any(e["type"] == "Alarm" for e in d["elements"])
    if alarm_found:
        run("Alarm elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No Alarm elements in sample")

    # 32. FireExtinguisher element validates
    d = copy.deepcopy(survey)
    fe_found = any(e["type"] == "FireExtinguisher" for e in d["elements"])
    if fe_found:
        run("FireExtinguisher elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No FireExtinguisher elements in sample")

    # 33. StairFlight element validates
    d = copy.deepcopy(survey)
    sf_found = any(e["type"] == "StairFlight" for e in d["elements"])
    if sf_found:
        run("StairFlight elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No StairFlight elements in sample")

    # 34. Railing element validates
    d = copy.deepcopy(survey)
    rail_found = any(e["type"] == "Railing" for e in d["elements"])
    if rail_found:
        run("Railing elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No Railing elements in sample")

    # 35. FloorSlab element validates
    d = copy.deepcopy(survey)
    fs_found = any(e["type"] == "FloorSlab" for e in d["elements"])
    if fs_found:
        run("FloorSlab elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No FloorSlab elements in sample")

    # 36. RoofSlab element validates
    d = copy.deepcopy(survey)
    rs_found = any(e["type"] == "RoofSlab" for e in d["elements"])
    if rs_found:
        run("RoofSlab elements present and valid", d, expect_valid=True)
    else:
        print("  [SKIP] No RoofSlab elements in sample")

    # 37. Invalid Alarm with extra property
    d = copy.deepcopy(survey)
    for i, e in enumerate(d["elements"]):
        if e["type"] == "Alarm":
            d["elements"][i]["color"] = "red"
            break
    run("Extra property on Alarm element", d, expect_valid=False)

    # 38. Invalid StairFlight with extra property
    d = copy.deepcopy(survey)
    for i, e in enumerate(d["elements"]):
        if e["type"] == "StairFlight":
            d["elements"][i]["weight_kg"] = 100
            break
    run("Extra property on StairFlight element", d, expect_valid=False)

    # 39. 'Slab' is no longer a valid element type
    d = copy.deepcopy(survey)
    d["elements"].append({
        "id": "slab-invalid-test",
        "label": "Invalid Slab Element",
        "type": "Slab"
    })
    run("Rejected element type 'Slab' (must be FloorSlab or RoofSlab)", d, expect_valid=False)

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
