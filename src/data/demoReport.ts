import demoResultsJson from './demo_sparql_results.json';
import type { SparqlResults } from '../components/report/types';

export const DEMO_SPARQL_RESULTS: SparqlResults = demoResultsJson as unknown as SparqlResults;

export const DEMO_LLM_NARRATIVE = `## Building Context Summary

This is a two-story residential duplex with a basement level and roof space, totaling 21 spaces across four storeys. The building consists of two dwelling units (A and B) on each level, with each unit containing typical residential spaces including habitable rooms, kitchens, bathrooms, and circulation areas. The ground floor units (A101-A105 and B101-B105) total approximately 120 square meters each, while the upper floor units (A201-A205 and B201-B205) are slightly smaller at approximately 70 square meters each. The roof space is a large 146 square meter service area. The building is equipped with basic fire safety equipment including smoke alarms in each unit and fire extinguishers, though one extinguisher is reported as damaged.

## Compliance Diagnostic Analysis

The compliance assessment reveals significant fire resistance deficiencies in both wall and floor slab elements. Twelve walls fail to meet the required 60-minute fire resistance period (REI), with internal partition walls in Unit B (B201, B202, B203, B204, B205) showing particularly concerning REI values of only 15 minutes. These walls are critical compartmentation boundaries that would fail within 15 minutes of fire exposure, drastically reducing escape time and allowing rapid fire spread between units. Additionally, five floor slabs in Level 2 spaces (A201, A204, A205, B202, B204, B205) have REI values ranging from 15-30 minutes, well below the required 60 minutes. This compromises the fire separation between floors, potentially allowing vertical fire spread to upper levels more quickly than intended by design.

One doorset is reported as obscured, which could impede escape routes during an emergency. The OWL classification audit shows that the building's storey types have been correctly inferred, with three ground and above storeys and one basement storey identified, confirming the building's vertical classification is properly represented in the model.

## Risk Narrative

The risk assessment identifies Dwelling Unit B as the higher priority due to its compromised cavity barrier assumption and multiple unknown boundary conditions. Unit B has one confirmed compromised assumption (cavity barrier) and two unknown assumptions (compartmentation and external spread), compared to Unit A's two unknown assumptions. Both units are unsprinklered, significantly elevating their fire risk. The evidence gaps in both units are substantial, with Unit A lacking documentation for cavity barriers and external spread assumptions, while Unit B additionally lacks compartmentation documentation. These unknown conditions represent significant uncertainties in the building's fire performance that cannot be verified without further investigation.

## Retrofit & Improvement Recommendations

For the walls with REI deficits:
- Apply fire-resistant board overlay or intumescent coating to internal partition walls in Unit B (B201, B202, B203, B204, B205) to increase their REI from 15 to at least 60 minutes
- For internal furring walls in Unit A (A103, A104) and Unit B (B103, B104) with REI values of 30 minutes, install additional fire-rated board or replace with fire-rated assemblies
- For internal plumbing walls in Unit B (B203, B204) with REI values of 45 minutes, apply intumescent coatings or install fire-rated linings

For the floor slabs with REI deficits:
- Install fire-rated suspended ceiling systems in Level 2 spaces (A201, A204, A205, B202, B204, B205) to provide additional fire resistance
- Apply intumescent paint to exposed structural elements in these areas
- Consider structural upgrades for severely deficient slabs (A201 with REI 15 minutes)

For the obscured doorset:
- Conduct immediate inspection to identify and remove obstructions
- Install appropriate "keep clear" signage
- Implement a maintenance schedule to ensure doorsets remain unobstructed

For evidence gaps:
- Conduct visual surveys and thermal imaging inspections to verify cavity barrier integrity in both units
- Perform destructive testing for compartment verification in areas with unknown assumptions
- Conduct external wall assessment to verify external spread assumptions
- Document all findings with photographic evidence and professional certification

## Priority Action Plan

1. **Immediate** — Investigate and remediate the compromised cavity barrier in Unit B, as this represents a confirmed deficiency in fire compartmentation
2. **Immediate** — Inspect and clear the obscured doorset to ensure escape route accessibility
3. **Short-term (1–3 months)** — Conduct visual surveys and thermal imaging to verify cavity barrier integrity in both units
4. **Short-term (1–3 months)** — Apply fire-resistant board overlay or intumescent coating to internal partition walls in Unit B (B201, B202, B203, B204, B205) to increase REI from 15 to 60 minutes
5. **Short-term (1–3 months)** — Install fire-rated suspended ceiling systems in Level 2 spaces with deficient slabs (A201, A204, A205, B202, B204, B205)
6. **Planned maintenance (3–12 months)** — Replace or upgrade internal furring walls in Unit A (A103, A104) and Unit B (B103, B104) with fire-rated assemblies
7. **Planned maintenance (3–12 months)** — Conduct external wall assessment to verify external spread assumptions and document findings

## Limitations & Caveats

This assessment is limited to elements with documented REI data; unlisted elements may also have compliance issues that were not captured. The scope of assessment is restricted to the elements present in the knowledge graph, which may not represent the complete building inventory. The OWL audit only reflects equivalentClass inference patterns, and other classification patterns may exist that were not exercised in this building data. The assessment does not include analysis of means of escape systems, fire alarm system performance, or emergency lighting, which are critical components of fire safety. Additional information including as-built drawings, fire engineering reports, and historical inspection records would improve the confidence of this assessment.
`;
