import demoResultsJson from './demo_sparql_results.json';
import type { SparqlResults } from '../components/report/types';

export const DEMO_SPARQL_RESULTS: SparqlResults = demoResultsJson as unknown as SparqlResults;

export const DEMO_LLM_NARRATIVE = `## 1. Building Context Summary

This report assesses a multi-storey residential building designated as a Dwellinghouse under Purpose Group 1b. The structure comprises 4 storeys, including a basement level, and contains a total of 21 distinct spaces. The building is organised into two primary dwelling units (Unit A and Unit B) across two main above-ground levels (Level 1 and Level 2), with a single, large service space on the roof level.

The space usage is predominantly residential, with 6 habitable rooms, 4 bathrooms, and supporting spaces including kitchens, foyers, halls, and circulation areas. The building's fire safety element inventory is extensive, with 34 walls, 21 floor/roof slabs, 14 doorsets, and 4 each of fire extinguishers and smoke alarms distributed throughout the spaces. The detailed per-space breakdown shows a typical residential layout with fire protection equipment located in key areas such as foyers, kitchens, and circulation spaces on both levels.

## 2. Compliance Assessment

**B1 — Health Score Summary:**
The compliance assessment reveals several significant gaps. Specifically, 12 walls have a fire resistance period (REI) below the PG1b requirement of 60 minutes. Furthermore, 5 above-ground floor slabs have REI below the required 60 minutes. A single doorset is obscured and cannot perform its fire-resisting function, and 1 fire extinguisher is damaged, rendering it non-compliant.

**B2 — Non-Compliant Elements (Diagnostic Analysis):**
The non-compliant walls and slabs present a direct threat to the building's compartmentation and structural stability in a fire. For instance, walls with REI values as low as 15 or 20 minutes instead of 60 mean those compartment boundaries could fail in a quarter to a third of the required time, drastically reducing safe egress and firefighting timeframes. Similarly, floor slabs with REI values of 15, 20, or 25 minutes provide less than half the mandated 60-minute structural fire resistance. This deficit risks premature structural failure and vertical fire spread between storeys, compromising the entire passive fire protection strategy. The single obscured doorset and damaged fire extinguisher represent failures in active and means-of-escape protection that require immediate rectification.

**B3 — OWL Classification Audit:**
The OWL reasoner successfully inferred classifications for key building elements. It identified 23 External Walls based on the \`isExternal = true\` property, 3 GroundAndAboveStoreys, 2 StairSpaces (spaces containing a stair element), and 1 BasementStorey. These inferences confirm the ontology is correctly interpreting the building data to apply relevant regulatory classifications.

## 3. Risk Assessment

The building contains two primary unsprinklered dwelling units and a roof space unit. The risk assessment reveals concerning gaps in the knowledge of boundary conditions. For Dwelling Unit A, two of its four critical fire safety assumptions (Cavity Barrier and External Spread) are in an "Unknown" state. More critically, for Dwelling Unit B, one assumption (Cavity Barrier) is confirmed as "Compromised," and two others (Compartmentation and External Spread) are "Unknown."

These "Unknown" states, particularly those without any supporting evidence (identified as "EVIDENCE GAPS"), represent direct, actionable items for inspection. The "Compromised" cavity barrier assumption in Unit B indicates a known deficiency that is actively undermining the fire integrity of that unit's boundaries. Based on the conservative confidence assessment, **Dwelling Unit B is the highest priority** due to its confirmed compromised assumption combined with 2 evidence gaps and 2 unknown assumptions. Dwelling Unit A follows, with 2 evidence gaps but no confirmed compromise.

## 4. Retrofit & Improvement Recommendations

| Deficiency | Count | Remediation Options |
|---|---|---|
| Wall REI < 60 min | 12 | Fire-resistant board overlay (e.g., gypsum plasterboard), intumescent coating, or full replacement with certified fire-rated assembly |
| Floor Slab REI < 60 min | 5 | Fire-rated suspended ceiling system, intumescent paint on exposed joists, or structural upgrade for worst cases (REI 15) |
| Obscured Doorset | 1 | Immediate clearance of obstructions, "Fire Door — Keep Clear" signage, self-closing mechanism verification |
| Damaged Fire Extinguisher | 1 | Immediate replacement or professional servicing; quarterly visual check schedule for all units |
| Evidence Gaps — Cavity Barrier | 2 units | Visual and invasive inspection of cavity barriers at compartment lines by qualified fire engineer |
| Evidence Gaps — External Spread | 2 units | External wall assessment reviewing cladding and cavity details for fire spread risk |
| Evidence Gaps — Compartmentation | 1 unit (B) | Compartmentation review: penetration seal checks, wall continuity verification |

## 5. Priority Action Plan

| Priority | Timeframe | Action | Scope |
|---|---|---|---|
| 1 | Immediate | Remediate compromised cavity barrier | Dwelling Unit B — CavityBarrierAssumption |
| 2 | Immediate | Clear obscured doorset and verify self-closing | Identified doorset from B1 |
| 3 | Immediate | Replace damaged fire extinguisher | Identified unit from B1 |
| 4 | 1–3 months | Fire engineering survey for evidence gaps | Unit A: Cavity Barrier, External Spread; Unit B: Compartmentation, External Spread |
| 5 | 1–3 months | Design REI upgrade for worst deficits | Walls at REI 15, slabs at REI 15 |
| 6 | 3–12 months | Execute wall and slab retrofit works | 12 walls + 5 slabs to REI 60 |
| 7 | 3–12 months | Update fire safety documentation | All post-retrofit conditions |

## 6. Inspection Workflow

Inspection workflow data is present in the knowledge graph. An "Annual Fire Safety Inspection" event has been scheduled for 15 March 2026. This event encompasses three main tasks: a Compartmentation & REI Compliance Check, a Fire Equipment Service Inspection, and a Fire Risk Assessment for all risk units.

The resulting assessments show a mixed outcome. The Doorset Accessibility and Fire Equipment Operational assessments returned Compliant results. However, the Floor/Slab REI Compliance Assessment and the Wall REI Compliance Assessment both resulted in NonCompliant findings. These non-compliances were assessed against "Approved Document B Volume 1: Dwellings," with the wall assessment specifically citing "Unit A — Compartmentation Certificate 2023" as evidence. The workflow confirms the serious REI deficiencies identified elsewhere in this report.

## 7. Limitations & Caveats

This assessment is based on the data present in the FiCR knowledge graph. Its scope is limited to elements for which REI data and compliance rules have been explicitly modelled. Other building elements (e.g., ceilings, beams) may have fire safety implications but were not assessed in this cycle. The OWL inference (B3) successfully classified elements based on \`equivalentClass\` definitions, but other complex classification patterns may not be captured. The risk assessment highlights "Unknown" states, which signify a lack of data rather than a confirmed safe condition; these must be resolved via physical inspection to complete the safety picture. Confidence in the overall fire safety status would be significantly improved by closing the identified evidence gaps through a qualified fire engineering survey.
`;
