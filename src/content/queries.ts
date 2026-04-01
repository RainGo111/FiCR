export const QUERY_PREFIXES = `PREFIX ficr: <https://w3id.org/bam/ficr#>
PREFIX bot:  <https://w3id.org/bot#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
`;

export interface QueryGroup {
    category: string;
    queries: {
        label: string;
        description?: string;
        query: string;
    }[];
}

export const PRESET_GROUPS: QueryGroup[] = [
    {
        category: "Module A: INVENTORY",
        queries: [
            {
                label: "A1: Building Overview",
                description: "Building key identifiers and classification / 建筑关键标识与分类（场地、类型、用途组、楼层数、空间数）",
                query: `${QUERY_PREFIXES}
SELECT ?siteLabel
       (SAMPLE(STRAFTER(STR(?bt), "#")) AS ?buildingType)
       (SAMPLE(?pgLabel) AS ?purposeGroup)
       (SAMPLE(?upLabel) AS ?utilizationPurpose)
       (COUNT(DISTINCT ?storey) AS ?storeyCount)
       (COUNT(DISTINCT ?space)  AS ?totalSpaceCount)
WHERE {
    ?site a bot:Site ;
          rdfs:label ?siteLabel ;
          bot:hasBuilding ?building .
    ?building a ?bt .
    FILTER(?bt IN (ficr:MultiStoreyBuilding, ficr:SingleStoreyBuilding))
    OPTIONAL {
        ?building ficr:hasPurposeGroup ?pg .
        BIND(STRAFTER(STR(?pg), "#") AS ?pgLabel)
    }
    OPTIONAL {
        ?building ficr:hasUtilizationPurpose ?up .
        BIND(STRAFTER(STR(?up), "#") AS ?upLabel)
    }
    OPTIONAL { ?building bot:hasStorey ?storey }
    OPTIONAL {
        ?building bot:hasStorey ?s .
        ?s bot:hasSpace ?space .
    }
}
GROUP BY ?siteLabel`
            },
            {
                label: "A2: Storey Inventory and Typology",
                description: "Storey list with OWL-inferred type, elevation, height and space count / 楼层清单（含推理类型、标高、层高、空间数）",
                query: `${QUERY_PREFIXES}
SELECT ?storeyLabel ?storeyType
       (xsd:decimal(?elev) AS ?elevation_m)
       (xsd:decimal(?ht)   AS ?storeyHeight_m)
       (COUNT(DISTINCT ?space) AS ?spaceCount)
WHERE {
    ?building a ficr:MultiStoreyBuilding ;
              bot:hasStorey ?storey .
    ?storey rdfs:label ?storeyLabel ;
            a ?storeyType .
    FILTER(?storeyType IN (ficr:BasementStorey, ficr:GroundAndAboveStorey))
    OPTIONAL { ?storey ficr:hasElevation   ?elev }
    OPTIONAL { ?storey ficr:hasStoreyHeight ?ht  }
    OPTIONAL { ?storey bot:hasSpace ?space }
}
GROUP BY ?storeyLabel ?storeyType ?elev ?ht
ORDER BY ?elev`
            },
            {
                label: "A3: Space Ledger",
                description: "Detailed space ledger with usage, area and adjacency / 空间台账（用途、面积、相邻空间）",
                query: `${QUERY_PREFIXES}
SELECT DISTINCT
    ?storeyLabel
    ?spaceLabel
    ?adjacentSpaces
    (xsd:decimal(?area) AS ?areaM2)
    ?usageLabel
WHERE {
    ?storey a/rdfs:subClassOf* bot:Storey ;
            rdfs:label ?storeyLabel ;
            bot:hasSpace ?space .
    ?space  rdfs:label ?spaceLabel .
    OPTIONAL { ?space ficr:hasArea ?area }
    OPTIONAL {
        ?space ficr:hasSpaceUsage ?usage .
        OPTIONAL { ?usage rdfs:label ?uLabel }
    }
    OPTIONAL {
        SELECT ?space (GROUP_CONCAT(DISTINCT ?adjLbl ; separator=" | ") AS ?adjacentSpaces)
        WHERE {
            ?space bot:adjacentZone ?adjSp .
            ?adjSp rdfs:label ?adjLbl .
        }
        GROUP BY ?space
    }
    BIND(COALESCE(?uLabel, IF(BOUND(?usage), STRAFTER(STR(?usage), "#"), "")) AS ?usageLabel)
}
ORDER BY ?storeyLabel ?spaceLabel`
            },
            {
                label: "A4: Usage Distribution",
                description: "Space count distribution by usage type / 各用途类型空间数量分布",
                query: `${QUERY_PREFIXES}
SELECT ?usageType (COUNT(DISTINCT ?space) AS ?count)
WHERE {
    ?space a/rdfs:subClassOf* bot:Space ;
           ficr:hasSpaceUsage ?usage .
    BIND(STRAFTER(STR(?usage), "#") AS ?usageType)
}
GROUP BY ?usageType
ORDER BY DESC(?count)`
            },
            {
                label: "A5: Element Inventory",
                description: "Fire-relevant element and equipment type counts / 消防相关构件与设备类型数量清单",
                query: `${QUERY_PREFIXES}
SELECT ?elementType (COUNT(DISTINCT ?elem) AS ?count)
WHERE {
    {
        ?elem a ficr:Wall .
        BIND("Wall" AS ?elementType)
    } UNION {
        ?elem a/rdfs:subClassOf* ficr:Slab .
        BIND("FloorSlab/RoofSlab" AS ?elementType)
    } UNION {
        ?elem a ficr:Doorset .
        BIND("Doorset" AS ?elementType)
    } UNION {
        ?elem a ficr:Window .
        BIND("Window" AS ?elementType)
    } UNION {
        ?elem a ficr:Opening .
        BIND("Opening" AS ?elementType)
    } UNION {
        ?elem a ficr:Stair .
        BIND("Stair" AS ?elementType)
    } UNION {
        ?elem a ficr:StairFlight .
        BIND("StairFlight" AS ?elementType)
    } UNION {
        ?elem a ficr:Beam .
        BIND("Beam" AS ?elementType)
    } UNION {
        ?elem a ficr:Ceiling .
        BIND("Ceiling" AS ?elementType)
    } UNION {
        ?elem a ficr:WallFoundation .
        BIND("WallFoundation" AS ?elementType)
    } UNION {
        ?elem a ficr:Railing .
        BIND("Railing" AS ?elementType)
    } UNION {
        ?elem a ficr:Furnishings .
        BIND("Furnishings" AS ?elementType)
    } UNION {
        ?elem a ficr:FireExtinguisher .
        BIND("FireExtinguisher" AS ?elementType)
    } UNION {
        ?elem a ficr:Alarm .
        BIND("Alarm" AS ?elementType)
    }
}
GROUP BY ?elementType
ORDER BY DESC(?count)`
            },
            {
                label: "A6: Per-Space Fire Protection",
                description: "Boundary elements and fire equipment per space / 每个空间的边界构件与消防设备明细",
                query: `${QUERY_PREFIXES}
SELECT ?spaceLabel ?category ?itemType ?itemLabel
WHERE {
    ?space a/rdfs:subClassOf* bot:Space ;
           rdfs:label ?spaceLabel .
    {
        # Boundary fabric elements via bot:adjacentElement
        ?space bot:adjacentElement ?item .
        {
            ?item a ficr:Wall .
            BIND("BoundaryElement" AS ?category)
            BIND("Wall" AS ?itemType)
        } UNION {
            ?item a/rdfs:subClassOf* ficr:Slab .
            BIND("BoundaryElement" AS ?category)
            BIND("Slab" AS ?itemType)
        } UNION {
            ?item a ficr:Doorset .
            BIND("BoundaryElement" AS ?category)
            BIND("Doorset" AS ?itemType)
        }
        OPTIONAL { ?item rdfs:label ?itemLabel }
    }
    UNION
    {
        # Fire equipment via ficr:islocatedIn
        ?item ficr:islocatedIn ?space .
        {
            ?item a ficr:FireExtinguisher .
            BIND("FireEquipment" AS ?category)
            BIND("FireExtinguisher" AS ?itemType)
        } UNION {
            ?item a ficr:Alarm .
            BIND("FireEquipment" AS ?category)
            BIND("Alarm" AS ?itemType)
        }
        OPTIONAL { ?item rdfs:label ?itemLabel }
    }
}
ORDER BY ?spaceLabel ?category ?itemType`
            },
        ]
    },
    {
        category: "Module B: COMPLIANCE",
        queries: [
            {
                label: "B1: Compliance Health Score",
                description: "Aggregated compliance status by category (Wall REI, Floor REI, Doorset access, Equipment condition) / 按类别汇总合规状态",
                query: `${QUERY_PREFIXES}
SELECT ?category ?status (COUNT(?item) AS ?count)
WHERE {
    {
        SELECT DISTINCT ?item ?category ?status
        WHERE {
            {
                # Walls — REI compliance
                ?item a ficr:Wall ; ficr:hasREI ?v .
                ficr:req_pg1b_wall ficr:hasREI ?r .
                BIND("Wall — REI" AS ?category)
                BIND(IF(xsd:integer(?v) >= xsd:integer(?r),
                        "Compliant", "Non-Compliant") AS ?status)
            }
            UNION
            {
                # Floor/Slab in Basement — REI compliance (req 30)
                ?storey a ficr:BasementStorey ;
                        bot:hasSpace ?space .
                ?space bot:adjacentElement ?item .
                ?item a/rdfs:subClassOf* ficr:Slab ;
                      ficr:hasREI ?v .
                ficr:req_pg1b_floor_basement ficr:hasREI ?r .
                BIND("Floor — REI (Basement)" AS ?category)
                BIND(IF(xsd:integer(?v) >= xsd:integer(?r),
                        "Compliant", "Non-Compliant") AS ?status)
            }
            UNION
            {
                # Floor/Slab Above Ground — REI compliance (req 60)
                ?storey a ficr:GroundAndAboveStorey ;
                        bot:hasSpace ?space .
                ?space bot:adjacentElement ?item .
                ?item a/rdfs:subClassOf* ficr:Slab ;
                      ficr:hasREI ?v .
                ficr:req_pg1b_floor_above ficr:hasREI ?r .
                BIND("Floor — REI (Above Ground)" AS ?category)
                BIND(IF(xsd:integer(?v) >= xsd:integer(?r),
                        "Compliant", "Non-Compliant") AS ?status)
            }
            UNION
            {
                # Doorsets — obscured check
                ?item a ficr:Doorset ;
                      ficr:isObscured ?obs .
                BIND("Doorset — Access" AS ?category)
                BIND(IF(?obs = true,
                        "Non-Compliant (Obscured)", "Compliant") AS ?status)
            }
            UNION
            {
                # Fire equipment — damaged or service expired
                {
                    ?item a ficr:FireExtinguisher .
                    BIND("FireExtinguisher" AS ?eqType)
                } UNION {
                    ?item a ficr:Alarm .
                    BIND("Alarm" AS ?eqType)
                }
                OPTIONAL { ?item ficr:isDamaged ?dmg }
                OPTIONAL { ?item ficr:hasServiceExpiryDate ?expiry }
                BIND(
                    IF(BOUND(?dmg) && ?dmg = true, "Non-Compliant (Damaged)",
                    IF(BOUND(?expiry) && ?expiry < "2026-03-10"^^xsd:date,
                       "Non-Compliant (Expired)", "Compliant"))
                    AS ?status)
                BIND(CONCAT(?eqType, " — Condition") AS ?category)
            }
        }
    }
}
GROUP BY ?category ?status
ORDER BY ?category ?status`
            },
            {
                label: "B2: Element REI Compliance Detail",
                description: "Per-element REI actual vs required with storey-aware thresholds / 逐构件REI实际值与楼层感知规范阈值对比",
                query: `${QUERY_PREFIXES}
SELECT DISTINCT
    ?assetType
    ?elementLabel
    ?spaceLabel
    (xsd:decimal(?rei)    AS ?actualREI)
    (xsd:decimal(?reqREI) AS ?requiredREI)
    ?complianceStatus
    ?issue
WHERE {
    {
        # Walls — REI compliance (all storeys, req 60)
        ?elem a ficr:Wall ;
              rdfs:label ?elementLabel ;
              ficr:hasREI ?rei .
        ?space bot:adjacentElement ?elem ;
               rdfs:label ?spaceLabel .
        ficr:req_pg1b_wall ficr:hasREI ?reqREI .
        BIND("Wall" AS ?assetType)
        BIND(IF(xsd:integer(?rei) >= xsd:integer(?reqREI),
                "Compliant", "Non-Compliant") AS ?complianceStatus)
        BIND(IF(xsd:integer(?rei) <  xsd:integer(?reqREI),
                "Wall REI Deficit", "--") AS ?issue)
    }
    UNION
    {
        # Slab in Basement (req 30)
        ?storey a ficr:BasementStorey ;
                bot:hasSpace ?space .
        ?space bot:adjacentElement ?elem ;
               rdfs:label ?spaceLabel .
        ?elem a/rdfs:subClassOf* ficr:Slab ;
              rdfs:label ?elementLabel ;
              ficr:hasREI ?rei .
        ficr:req_pg1b_floor_basement ficr:hasREI ?reqREI .
        BIND("Slab (Basement)" AS ?assetType)
        BIND(IF(xsd:integer(?rei) >= xsd:integer(?reqREI),
                "Compliant", "Non-Compliant") AS ?complianceStatus)
        BIND(IF(xsd:integer(?rei) <  xsd:integer(?reqREI),
                "Slab REI Deficit", "--") AS ?issue)
    }
    UNION
    {
        # Slab Above Ground (req 60)
        ?storey a ficr:GroundAndAboveStorey ;
                bot:hasSpace ?space .
        ?space bot:adjacentElement ?elem ;
               rdfs:label ?spaceLabel .
        ?elem a/rdfs:subClassOf* ficr:Slab ;
              rdfs:label ?elementLabel ;
              ficr:hasREI ?rei .
        ficr:req_pg1b_floor_above ficr:hasREI ?reqREI .
        BIND("Slab (Above Ground)" AS ?assetType)
        BIND(IF(xsd:integer(?rei) >= xsd:integer(?reqREI),
                "Compliant", "Non-Compliant") AS ?complianceStatus)
        BIND(IF(xsd:integer(?rei) <  xsd:integer(?reqREI),
                "Slab REI Deficit", "--") AS ?issue)
    }
}
ORDER BY ?assetType ?complianceStatus ?elementLabel`
            },
            {
                label: "B3: OWL Classification Audit",
                description: "OWL reasoner inferred class memberships across all 23 equivalentClass definitions / OWL推理器推断的等价类成员审计",
                query: `${QUERY_PREFIXES}
SELECT ?definedClassName (COUNT(DISTINCT ?instance) AS ?inferredCount) ?triggerCondition
WHERE {
    VALUES (?definedClass ?triggerCondition) {
        # --- Physical elements ---
        (ficr:ExternalWall           "Wall AND isExternal = true")
        (ficr:ExternalWallDoor       "Doorset AND isExternal = true")
        (ficr:ExternalWallWindow     "Window AND isExternal = true")
        (ficr:CompartmentWall        "Wall AND hasElementUsage some FireSeparatingRole")
        (ficr:CompartmentFloor       "Floor AND hasElementUsage some FireSeparatingRole")
        (ficr:FireDamper             "Closing AND hasElementUsage some FireResistingRole")
        (ficr:FireDoorset            "Doorset AND hasREI restriction")
        (ficr:ProtectedStairway      "Stair AND hasElementUsage some PassiveFireProtectionRole")
        (ficr:ProtectedCircuit       "Circuit AND hasElementUsage some PassiveFireProtectionRole")

        # --- Storeys ---
        (ficr:BasementStorey         "Storey AND isAboveGround = false")
        (ficr:GroundAndAboveStorey   "Storey AND isAboveGround = true")

        # --- Spaces ---
        (ficr:BalconySpace           "Space AND isExternal = true")
        (ficr:ShaftSpace             "Space AND containsElement some VerticalTransportSystem")
        (ficr:StairSpace             "Space AND containsElement some Stair")

        # --- Fire safety zones ---
        (ficr:FireCompartment        "Zone AND adjElement some CompartmentFloor AND CompartmentWall")
        (ficr:ProtectedCorridor      "Zone AND PassiveFireProtection AND hasSpaceUsage Corridor")
        (ficr:ProtectedEntranceHall  "Zone AND PassiveFireProtection AND hasSpaceUsage EntranceHall")
        (ficr:ProtectedLobby         "Zone AND PassiveFireProtection AND hasSpaceUsage Lobby")
        (ficr:ProtectedShaft         "Zone AND PassiveFireProtection AND containsElement VTS")
        (ficr:ProtectedStairwaySpace "Zone AND PassiveFireProtection AND containsElement Stair")

        # --- Building systems ---
        (ficr:EvacuationLift         "LiftSystem AND hasElementUsage some EvacuationRole")
        (ficr:FireFightingLift       "LiftSystem AND hasElementUsage some FirefightingRole")
        (ficr:FireSprinklerSystem    "PipingSystem AND hasElementUsage some ActiveFireProtectionRole")
    }
    OPTIONAL { ?instance a ?definedClass }
    BIND(STRAFTER(STR(?definedClass), "#") AS ?definedClassName)
}
GROUP BY ?definedClass ?definedClassName ?triggerCondition
ORDER BY DESC(?inferredCount) ?definedClassName`
            },
        ]
    },
    {
        category: "Module C: RISK-INFORMED",
        queries: [
            {
                label: "C1: Risk Unit Inventory",
                description: "Risk units with spatial coverage, sprinkler status, area and usage / 风险单元清单（覆盖空间、喷淋状态、面积、用途）",
                query: `${QUERY_PREFIXES}
SELECT ?ruLabel ?installStatus
       ?spaceLabel
       (xsd:decimal(?area) AS ?areaM2)
       ?usageLabel
WHERE {
    ?ru a ficr:RiskUnit ;
        rdfs:label ?ruLabel .
    OPTIONAL {
        ?ru ficr:hasInstallationStatus ?is .
        BIND(STRAFTER(STR(?is), "#") AS ?installStatus)
    }
    OPTIONAL {
        ?ru ficr:coversSpatialZone ?space .
        ?space rdfs:label ?spaceLabel .
        OPTIONAL { ?space ficr:hasArea ?area }
        OPTIONAL {
            ?space ficr:hasSpaceUsage ?usage .
            OPTIONAL { ?usage rdfs:label ?uLabel }
        }
        BIND(COALESCE(?uLabel, IF(BOUND(?usage), STRAFTER(STR(?usage), "#"), "")) AS ?usageLabel)
    }
}
ORDER BY ?ruLabel ?spaceLabel`
            },
            {
                label: "C2: Condition State Distribution",
                description: "Boundary assumption condition distribution per risk unit / 每个风险单元的边界假设条件状态分布",
                query: `${QUERY_PREFIXES}
SELECT ?ruLabel ?conditionState (COUNT(DISTINCT ?ba) AS ?count)
WHERE {
    ?ru a ficr:RiskUnit ;
        rdfs:label ?ruLabel .
    ?ba a ficr:BoundaryAssumption ;
        ficr:appliesToRiskUnit ?ru ;
        ficr:hasConditionState ?cs .
    BIND(STRAFTER(STR(?cs), "#") AS ?conditionState)
}
GROUP BY ?ruLabel ?conditionState
ORDER BY ?ruLabel ?conditionState`
            },
            {
                label: "C3: Evidence Completeness",
                description: "Evidence detail per assumption with gap flags for Unknown without evidence / 每个假设的证据明细及缺口标记",
                query: `${QUERY_PREFIXES}
SELECT ?ruLabel
       ?assumptionLabel
       ?assumptionType
       ?conditionState
       ?evidenceType
       ?docTitle
       (IF(!BOUND(?ev) && ?conditionState = "Unknown", "EVIDENCE GAP", "--") AS ?gapFlag)
WHERE {
    ?ru a ficr:RiskUnit ;
        rdfs:label ?ruLabel .
    ?ba a ficr:BoundaryAssumption ;
        ficr:appliesToRiskUnit ?ru ;
        ficr:hasConditionState ?cs .
    BIND(STRAFTER(STR(?cs), "#") AS ?conditionState)
    OPTIONAL { ?ba rdfs:label ?assumptionLabel }
    OPTIONAL {
        ?ba ficr:hasAssumptionType ?at .
        BIND(STRAFTER(STR(?at), "#") AS ?assumptionType)
    }
    OPTIONAL {
        ?ba ficr:supportedByEvidence ?ev .
        OPTIONAL {
            ?ev rdf:type ?et .
            FILTER(?et != owl:NamedIndividual)
            BIND(STRAFTER(STR(?et), "#") AS ?evidenceType)
        }
        OPTIONAL { ?ev ficr:documentTitle ?docTitle }
    }
}
ORDER BY ?ruLabel ?assumptionType ?conditionState`
            },
            {
                label: "C4: Worst-First Confidence",
                description: "Risk units ranked by evidence gaps and unknowns for inspection priority / 按证据缺口与未知数排序的风险单元检查优先级",
                query: `${QUERY_PREFIXES}
SELECT ?ruLabel
       ?totalAssumptions ?unknownCount ?compromisedCount
       ?evidenceGapCount ?installStatus
WHERE {
    { SELECT ?ru ?ruLabel
             (COUNT(DISTINCT ?ba)  AS ?totalAssumptions)
             (COUNT(DISTINCT ?unk) AS ?unknownCount)
             (COUNT(DISTINCT ?cmp) AS ?compromisedCount)
      WHERE {
        ?ru a ficr:RiskUnit ; rdfs:label ?ruLabel .
        ?ba a ficr:BoundaryAssumption ; ficr:appliesToRiskUnit ?ru .
        OPTIONAL { ?ba ficr:hasConditionState ficr:Unknown .    BIND(?ba AS ?unk) }
        OPTIONAL { ?ba ficr:hasConditionState ficr:Compromised . BIND(?ba AS ?cmp) }
      } GROUP BY ?ru ?ruLabel }

    { SELECT ?ru (COUNT(DISTINCT ?gap) AS ?evidenceGapCount) WHERE {
        ?ru a ficr:RiskUnit .
        ?ba a ficr:BoundaryAssumption ;
            ficr:appliesToRiskUnit ?ru ;
            ficr:hasConditionState ficr:Unknown .
        FILTER NOT EXISTS { ?ba ficr:supportedByEvidence ?ev }
        BIND(?ba AS ?gap)
      } GROUP BY ?ru }

    OPTIONAL { ?ru ficr:hasInstallationStatus ?is .
               BIND(STRAFTER(STR(?is), "#") AS ?installStatus) }
}
ORDER BY DESC(?evidenceGapCount) DESC(?unknownCount)`
            },
        ]
    },
    {
        category: "Module D: INSPECTION WORKFLOW",
        queries: [
            {
                label: "D1: Inspection Workflow Summary",
                description: "Inspection events, triggered tasks, and produced assessments / 检查事件、触发任务及生成的评估",
                query: `${QUERY_PREFIXES}
SELECT ?eventLabel ?taskLabel ?taskType ?startTime ?endTime
       ?assessmentLabel ?assessmentType
WHERE {
    ?event a/rdfs:subClassOf* ficr:Event ;
           rdfs:label ?eventLabel ;
           ficr:triggersTask ?task .
    ?task rdfs:label ?taskLabel ;
          a ?taskType .
    FILTER(?taskType IN (ficr:ComplianceCheckingTask,
                         ficr:EquipmentInspectionTask,
                         ficr:FireRiskAssessmentTask))
    OPTIONAL { ?task ficr:plannedStartTime ?startTime }
    OPTIONAL { ?task ficr:plannedEndTime ?endTime }
    OPTIONAL {
        ?task ficr:producesAssessment ?assessment .
        ?assessment rdfs:label ?assessmentLabel ;
                    a ?assessmentType .
        FILTER(?assessmentType IN (ficr:ComplianceChecking, ficr:RiskAnalysis))
    }
}
ORDER BY ?startTime`
            },
            {
                label: "D2: Compliance Assessment Results",
                description: "Compliance assessments with results, regulatory basis, and evidence / 合规评估结果及其法规依据与证据",
                query: `${QUERY_PREFIXES}
SELECT ?assessmentLabel ?resultType ?regulatorySourceLabel ?evidenceLabel
WHERE {
    ?assessment a ficr:ComplianceChecking ;
                rdfs:label ?assessmentLabel ;
                ficr:hasComplianceResult ?result .
    ?result a ?resultType .
    FILTER(?resultType IN (ficr:CompliantResult, ficr:NonCompliantResult,
                           ficr:UndeterminedResult))
    OPTIONAL {
        ?assessment ficr:basedOnRegulation ?source .
        ?source rdfs:label ?regulatorySourceLabel .
    }
    OPTIONAL {
        ?assessment ficr:hasAssessmentBasis ?evidence .
        ?evidence rdfs:label ?evidenceLabel .
    }
}
ORDER BY ?assessmentLabel`
            },
        ]
    },
];
