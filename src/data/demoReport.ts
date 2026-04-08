import demoResultsJson from './demo_sparql_results.json';
import type { SparqlResults } from '../components/report/types';

export const DEMO_SPARQL_RESULTS: SparqlResults = demoResultsJson as unknown as SparqlResults;

export const DEMO_LLM_NARRATIVE = `## 1. Building Context Summary

This assessment concerns a four-storey multi-storey building designated as a Dwellinghouse under Purpose Group 1b. The building contains 21 distinct spaces distributed across its storeys. The ground and first floors (Level 1 and Level 2) are the primary occupied levels, each containing 10 spaces. A basement storey (T/FDN) is present but contains no spaces, and a roof level contains a single large service space.

The space usage is characteristic of a residential duplex arrangement, with 6 habitable rooms, 4 bathrooms, 3 service spaces, 2 halls, 2 foyers, 2 kitchens, and 2 circulation spaces. The fire safety element inventory comprises 57 walls, 21 floor/roof slabs, 14 doorsets, 24 windows, and 13 ceilings. Active fire protection equipment includes 4 smoke alarms and 4 fire extinguishers. The building also contains 8 beams, 7 wall foundations, 6 stair flights, and 4 railings.

## 2. Compliance Assessment

**B1 — Health Score Summary:**
The compliance assessment reveals several significant deficiencies. 22 walls have a fire resistance period (REI) below the PG1b requirement of 60 minutes. 5 above-ground floor slabs have REI below 60 minutes. 1 fire extinguisher is damaged and 1 doorset is obscured and cannot perform its fire-resisting function. In contrast, 35 walls and 13 above-ground floor slabs meet the REI requirements, and all 4 smoke alarms are compliant.

**B2 — Non-Compliant Elements (Diagnostic Analysis):**
The 22 non-compliant walls represent a serious compartmentation failure. Several exterior brick-on-block walls have an REI of only 15 minutes — just one-quarter of the required 60-minute integrity. This means a fire could breach these critical boundaries in 15 minutes, drastically reducing the safe evacuation window. Internal furring and partition walls with REIs of 20–45 minutes also compromise the separation between dwelling units and internal rooms. The 5 non-compliant floor slabs with REIs as low as 15–30 minutes provide less than half the required structural fire resistance, risking progressive collapse and vertical fire spread, particularly for the timber joist construction.

**B3 — OWL Classification Audit:**
The OWL reasoner successfully inferred classifications for key building elements. It identified 23 instances as \`ExternalWall\` based on the \`isExternal = true\` property, 3 storeys as \`GroundAndAboveStorey\`, 2 \`StairSpace\` instances (spaces containing stair elements), and 1 \`BasementStorey\`. These inferences confirm the ontology is correctly interpreting the building data to apply relevant regulatory classifications.

## 3. Risk Assessment

The building contains two primary unsprinklered dwelling units and a roof space unit. For Dwelling Unit A, two of its four critical fire safety assumptions (Cavity Barrier and External Spread) are in an "Unknown" state. More critically, Dwelling Unit B has one "Compromised" assumption (Cavity Barrier) plus two "Unknown" assumptions (Compartmentation and External Spread). The compromised cavity barrier represents a known defect that could allow fire to spread unseen through wall and floor voids.

These "Unknown" states without supporting evidence represent direct, actionable inspection items. Based on the conservative confidence assessment, **Dwelling Unit B is the highest priority** due to its confirmed compromised assumption combined with 2 evidence gaps. Dwelling Unit A follows, with 2 evidence gaps but no confirmed compromise.

## 4. Retrofit & Improvement Recommendations

| Deficiency | Count | Remediation Options |
|---|---|---|
| Wall REI < 60 min | 22 | Fire-resistant board overlay, intumescent coating, or full replacement with certified fire-rated assembly; priority for REI 15 walls |
| Floor Slab REI < 60 min | 5 | Fire-rated suspended ceiling system, intumescent paint on exposed joists, or structural upgrade for worst cases (REI 15) |
| Obscured Doorset | 1 | Immediate clearance of obstructions, "Fire Door — Keep Clear" signage, self-closing mechanism verification |
| Damaged Fire Extinguisher | 1 | Immediate replacement or professional servicing; quarterly visual check schedule for all units |
| Compromised Cavity Barrier | Unit B | Immediate repair by qualified fire-stopping contractors using tested and certified systems |
| Evidence Gaps — Cavity Barrier | Unit A | Visual and invasive inspection, borescope examination of wall and floor voids at compartment boundaries |
| Evidence Gaps — External Spread | Units A & B | External wall assessment reviewing cladding and cavity details for fire spread risk |
| Evidence Gaps — Compartmentation | Unit B | Detailed inspection of all compartment boundaries including doors, walls, and service penetrations |

## 5. Priority Action Plan

| Priority | Timeframe | Action | Scope |
|---|---|---|---|
| 1 | Immediate | Repair compromised cavity barrier | Dwelling Unit B — CavityBarrierAssumption |
| 2 | Immediate | Clear obscured doorset and verify self-closing | Identified doorset from B1 |
| 3 | Immediate | Replace damaged fire extinguisher | Identified unit from B1 |
| 4 | 1–3 months | Fire engineering survey for evidence gaps | Unit A: Cavity Barrier, External Spread; Unit B: Compartmentation, External Spread |
| 5 | 1–3 months | Address most severe REI deficits | Walls and slabs at REI 15 |
| 6 | 3–12 months | Execute remaining wall and slab retrofit works | 22 walls + 5 slabs to REI 60 |
| 7 | 3–12 months | Update fire safety documentation, consider sprinkler retrofit | All post-retrofit conditions |

## 6. Inspection Workflow

An Annual Fire Safety Inspection was scheduled for 15 March 2026, comprising three main tasks. The Compartmentation & REI Compliance Check resulted in mixed outcomes: the Doorset Accessibility Assessment found compliance, but both Floor/Slab REI and Wall REI Compliance Assessments found non-compliance against "Approved Document B Volume 1: Dwellings," with the wall assessment citing "Unit A — Compartmentation Certificate 2023" as evidence. A separate Equipment Inspection Task found fire equipment operational. A Fire Risk Assessment Task was also completed for the dwelling units.

## 7. Limitations & Caveats

This assessment is limited to elements with REI data in the knowledge graph. The 57 walls and 21 slabs assessed represent only those elements with specified fire resistance values; other unlisted elements may also have compliance issues. The OWL inference (B3) reflects only \`equivalentClass\` definitions; other classification patterns may exist. The risk assessment depends on boundary assumption accuracy, which for several assumptions remains "Unknown" due to evidence gaps. Additional destructive testing, intrusive surveys, and review of construction specifications would significantly improve confidence in the compartmentation and external wall assessments.
`;
