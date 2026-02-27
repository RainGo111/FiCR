"""ficr_json_to_rdf.py — Convert FiCR survey JSON to ABox Turtle.

Reads a ficr-survey-v1 JSON file and emits an RDF/Turtle ABox graph
with instance IRIs under https://ficr.example.com/instances/{slug}/{id}.

Usage:
    python ficr_json_to_rdf.py <survey.json> [-o output.ttl]
"""

import json
import argparse
from collections import defaultdict
from rdflib import Graph, Namespace, Literal, URIRef, RDF, RDFS, OWL, XSD

FICR = Namespace("https://w3id.org/bam/ficr#")
BOT = Namespace("https://w3id.org/bot#")


def _resolve(curie: str) -> URIRef:
    """Convert a prefixed curie ('ficr:Wall', 'bot:Space') to a full IRI."""
    if curie.startswith("ficr:"):
        return FICR[curie[5:]]
    if curie.startswith("bot:"):
        return BOT[curie[4:]]
    return URIRef(curie)


def convert(survey: dict) -> Graph:
    """Convert a ficr-survey-v1 dict to an rdflib Graph (ABox)."""
    g = Graph()
    slug = survey["meta"]["project_slug"]

    base = f"https://ficr.example.com/instances/{slug}/"
    INST = Namespace(base)

    g.bind("ficr", FICR)
    g.bind("bot", BOT)
    g.bind("inst", INST)
    g.bind("owl", OWL)
    g.bind("xsd", XSD)

    def iri(local_id: str) -> URIRef:
        return INST[local_id]

    def add_typed(subject, rdf_type, label=None):
        g.add((subject, RDF.type, rdf_type))
        g.add((subject, RDF.type, OWL.NamedIndividual))
        if label:
            g.add((subject, RDFS.label, Literal(label, lang="en")))

    def opt_decimal(subject, predicate, value):
        if value is not None:
            g.add((subject, predicate, Literal(value, datatype=XSD.decimal)))

    def opt_integer(subject, predicate, value):
        if value is not None:
            g.add((subject, predicate, Literal(int(value), datatype=XSD.integer)))

    def opt_boolean(subject, predicate, value):
        if value is not None:
            g.add((subject, predicate, Literal(value, datatype=XSD.boolean)))

    # ── Building ──────────────────────────────────────────────────────
    bld = survey["building"]
    bld_iri = iri(bld["id"])
    add_typed(bld_iri, _resolve(bld["type"]), bld.get("label"))
    g.add((bld_iri, FICR.hasID, Literal(bld["id"], datatype=XSD.string)))
    if bld.get("purpose_group"):
        g.add((bld_iri, FICR.hasPurposeGroup, _resolve(bld["purpose_group"])))

    # ── Storeys ───────────────────────────────────────────────────────
    storeys_sorted = sorted(survey["storeys"], key=lambda s: s["elevation_m"])
    storey_info = []  # [(iri, elevation), ...]

    for s in storeys_sorted:
        s_iri = iri(s["id"])
        add_typed(s_iri, _resolve(s["type"]), s.get("label"))
        opt_decimal(s_iri, FICR.hasElevation, s.get("elevation_m"))
        g.add((bld_iri, BOT.hasStorey, s_iri))
        storey_info.append((s_iri, s["elevation_m"]))

    # Derived: ficr:isStoreyAbove / ficr:isStoreyBelow
    for i in range(len(storey_info) - 1):
        lower_iri = storey_info[i][0]
        upper_iri = storey_info[i + 1][0]
        g.add((upper_iri, FICR.isStoreyAbove, lower_iri))
        g.add((lower_iri, FICR.isStoreyBelow, upper_iri))

    # Derived: ficr:hasStoreyHeight (= next storey's base elevation)
    for i in range(len(storey_info)):
        if i + 1 < len(storey_info):
            top = storey_info[i + 1][1]
            g.add((storey_info[i][0], FICR.hasStoreyHeight,
                   Literal(top, datatype=XSD.decimal)))

    # ── Spaces ────────────────────────────────────────────────────────
    for sp in survey["spaces"]:
        sp_iri = iri(sp["id"])
        add_typed(sp_iri, _resolve(sp["type"]), sp.get("label"))

        # Storey containment
        g.add((iri(sp["storey_ref"]), BOT.hasSpace, sp_iri))

        opt_decimal(sp_iri, FICR.hasArea, sp.get("area_m2"))

        if sp.get("usage"):
            g.add((sp_iri, FICR.hasSpaceUsage, _resolve(sp["usage"])))

        for elem_ref in sp.get("adjacent_elements", []):
            g.add((sp_iri, BOT.adjacentElement, iri(elem_ref)))

    # ── Elements ──────────────────────────────────────────────────────
    for elem in survey["elements"]:
        e_iri = iri(elem["id"])
        e_type = elem["type"]
        add_typed(e_iri, _resolve(e_type), elem.get("label"))

        if e_type == "ficr:Wall":
            opt_integer(e_iri, FICR.hasREI, elem.get("rei"))
            opt_boolean(e_iri, FICR.isExternal, elem.get("is_external"))
            opt_boolean(e_iri, FICR.isLoadBearing, elem.get("is_load_bearing"))
            opt_decimal(e_iri, FICR.hasArea, elem.get("area_m2"))
            for role in elem.get("usage_roles", []):
                g.add((e_iri, FICR.hasElementUsage, _resolve(role)))

        elif e_type == "ficr:Slab":
            opt_integer(e_iri, FICR.hasREI, elem.get("rei"))
            opt_boolean(e_iri, FICR.isExternal, elem.get("is_external"))
            opt_boolean(e_iri, FICR.isLoadBearing, elem.get("is_load_bearing"))
            opt_decimal(e_iri, FICR.hasArea, elem.get("area_m2"))

        elif e_type == "ficr:Doorset":
            opt_boolean(e_iri, FICR.isObscured, elem.get("is_obscured"))
            opt_integer(e_iri, FICR.hasREI, elem.get("rei"))
            for role in elem.get("usage_roles", []):
                g.add((e_iri, FICR.hasElementUsage, _resolve(role)))

        elif e_type == "ficr:Ceiling":
            opt_decimal(e_iri, FICR.hasArea, elem.get("area_m2"))
            opt_decimal(e_iri, FICR.hasThickness, elem.get("thickness_m"))

        elif e_type == "ficr:Window":
            opt_boolean(e_iri, FICR.isExternal, elem.get("is_external"))

    # ── Derived: bot:adjacentZone (spaces sharing a doorset) ──────────
    door_spaces = defaultdict(list)
    for sp in survey["spaces"]:
        for elem_ref in sp.get("adjacent_elements", []):
            if elem_ref.startswith("D-"):
                door_spaces[elem_ref].append(sp["id"])

    seen_pairs = set()
    for sp_ids in door_spaces.values():
        for i in range(len(sp_ids)):
            for j in range(i + 1, len(sp_ids)):
                pair = tuple(sorted([sp_ids[i], sp_ids[j]]))
                if pair not in seen_pairs:
                    seen_pairs.add(pair)
                    a, b = iri(sp_ids[i]), iri(sp_ids[j])
                    g.add((a, BOT.adjacentZone, b))
                    g.add((b, BOT.adjacentZone, a))

    # ── Risk Units ────────────────────────────────────────────────────
    for ru in survey.get("risk_units", []):
        ru_iri = iri(ru["id"])
        add_typed(ru_iri, FICR.RiskUnit, ru.get("label"))

        for sp_ref in ru.get("covers_spaces", []):
            g.add((ru_iri, FICR.coversSpatialZone, iri(sp_ref)))

        if ru.get("installation_status"):
            g.add((ru_iri, FICR.hasInstallationStatus,
                   _resolve(ru["installation_status"])))

        for exp_ref in ru.get("is_exposed_to", []):
            g.add((ru_iri, FICR.isExposedTo, iri(exp_ref)))

        if ru.get("declared_exposure_value") is not None:
            g.add((ru_iri, FICR.declaredExposureValue,
                   Literal(ru["declared_exposure_value"], datatype=XSD.decimal)))

    # ── Boundary Assumptions ──────────────────────────────────────────
    for ba in survey.get("boundary_assumptions", []):
        ba_iri = iri(ba["id"])
        add_typed(ba_iri, FICR.BoundaryAssumption, ba.get("label"))

        if ba.get("assumption_type"):
            g.add((ba_iri, FICR.hasAssumptionType,
                   _resolve(ba["assumption_type"])))

        if ba.get("condition_state"):
            g.add((ba_iri, FICR.hasConditionState,
                   _resolve(ba["condition_state"])))

        if ba.get("applies_to_risk_unit"):
            g.add((ba_iri, FICR.appliesToRiskUnit,
                   iri(ba["applies_to_risk_unit"])))

        for ev_ref in ba.get("supported_by_evidence", []):
            g.add((ba_iri, FICR.supportedByEvidence, iri(ev_ref)))

    # ── Evidence Log ──────────────────────────────────────────────────
    for ev in survey.get("evidence_log", []):
        ev_iri = iri(ev["id"])
        add_typed(ev_iri, _resolve(ev["type"]), ev.get("label"))

        if ev.get("document_title"):
            g.add((ev_iri, FICR.documentTitle,
                   Literal(ev["document_title"], datatype=XSD.string)))

        if ev.get("document_uri"):
            g.add((ev_iri, FICR.documentURI,
                   Literal(ev["document_uri"], datatype=XSD.anyURI)))

    return g


def main():
    parser = argparse.ArgumentParser(
        description="Convert FiCR survey JSON to ABox Turtle")
    parser.add_argument("survey_json", help="Path to survey JSON file")
    parser.add_argument("-o", "--output", default=None,
                        help="Output TTL path (default: <slug>_abox.ttl)")
    args = parser.parse_args()

    with open(args.survey_json, encoding="utf-8") as f:
        survey = json.load(f)

    g = convert(survey)

    out_path = args.output or f"{survey['meta']['project_slug']}_abox.ttl"
    g.serialize(destination=out_path, format="turtle")
    print(f"ABox written to {out_path}  ({len(g)} triples)")


if __name__ == "__main__":
    main()
