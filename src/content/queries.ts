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
                label: "A1: Building and Storey Overview",
                description: "建筑与楼层概览: 每层楼层名称、类型、标高(m)、层高(m)、空间数\\nficr:hasElevation   — 楼层基准标高 (m), 来自 ficr_merged.ttl 原始数据\\nficr:hasStoreyHeight — 楼层顶面标高 (m), 层净高 ≈ hasStoreyHeight − hasElevation\\n返回 4 行 (T/FDN, Level 1, Level 2, Roof), 按标高升序排列",
                query: `${QUERY_PREFIXES}\n# --- A1: Building and Storey Overview ------------------------------------------\n# 建筑与楼层概览: 每层楼层名称、类型、标高(m)、层高(m)、空间数\n# ficr:hasElevation   — 楼层基准标高 (m), 来自 ficr_merged.ttl 原始数据\n# ficr:hasStoreyHeight — 楼层顶面标高 (m), 层净高 ≈ hasStoreyHeight − hasElevation\n# 返回 4 行 (T/FDN, Level 1, Level 2, Roof), 按标高升序排列\n\nSELECT ?buildingID ?storeyLabel ?storeyType
       (xsd:decimal(?elev) AS ?elevation_m)
       (xsd:decimal(?ht)   AS ?storeyHeight_m)
       (COUNT(DISTINCT ?space) AS ?spaceCount)
WHERE {
    ?building a ficr:MultiStoreyBuilding .
    OPTIONAL { ?building ficr:hasID ?buildingID }
    ?building bot:hasStorey ?storey .
    ?storey rdfs:label ?storeyLabel .
    ?storey a ?storeyType .
    FILTER(?storeyType IN (ficr:BasementStorey, ficr:GroundAndAboveStorey))
    OPTIONAL { ?storey ficr:hasElevation    ?elev }
    OPTIONAL { ?storey ficr:hasStoreyHeight ?ht   }
    OPTIONAL { ?storey bot:hasSpace ?space }
}
GROUP BY ?buildingID ?storeyLabel ?storeyType ?elev ?ht
ORDER BY ?elev`
            },
            {
                label: "A2: Space Ledger with Usage and Adjacency",
                description: "完整空间台账: 楼层、空间名、贯通空间、面积、用途\\nNOTE: ficr:hasSpaceUsage 命名个体 (如 ficr:HabitableRoom) 多数无 rdfs:label,\\n用途名用 STRAFTER(STR(?usage),\"#\") 提取;\\nOPTIONAL 内嵌套 OPTIONAL 避免因 label 缺失导致整块 OPTIONAL 失效.",
                query: `${QUERY_PREFIXES}\n# --- A2: Space Ledger with Usage and Adjacency ---------------------------------\n# 完整空间台账: 楼层、空间名、贯通空间、面积、用途\n# NOTE: ficr:hasSpaceUsage 命名个体 (如 ficr:HabitableRoom) 多数无 rdfs:label,\n# 用途名用 STRAFTER(STR(?usage),"#") 提取;\n# OPTIONAL 内嵌套 OPTIONAL 避免因 label 缺失导致整块 OPTIONAL 失效.\n\nSELECT DISTINCT
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
    # 贯通空间: 用 | 分隔相邻空间名称
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
                label: "A3: Space Usage Distribution",
                description: "各用途类型空间数量分布\\nNOTE: 用途命名个体 (ficr:HabitableRoom 等) 多数无 rdfs:label,\\n直接用 STRAFTER 从 URI 提取名称",
                query: `${QUERY_PREFIXES}\n# --- A3: Space Usage Distribution ----------------------------------------------\n# 各用途类型空间数量分布\n# NOTE: 用途命名个体 (ficr:HabitableRoom 等) 多数无 rdfs:label,\n# 直接用 STRAFTER 从 URI 提取名称\n\nSELECT ?usageType (COUNT(DISTINCT ?space) AS ?count)
WHERE {
    ?space a/rdfs:subClassOf* bot:Space ;
           ficr:hasSpaceUsage ?usage .
    BIND(STRAFTER(STR(?usage), "#") AS ?usageType)
}
GROUP BY ?usageType
ORDER BY DESC(?count)`
            },
            {
                label: "A4: Fire Safety Element Inventory",
                description: "消防构件清单: 各类构件数量\\nNOTE: ficr_demo 中无 FireAlarmSystem/FireExtinguisher 独立实例,\\n仅有类声明 (owl:Class). 以下仅查询实际存在的实例类型.",
                query: `${QUERY_PREFIXES}\n# --- A4: Fire Safety Element Inventory -----------------------------------------\n# 消防构件清单: 各类构件数量\n# NOTE: ficr_demo 中无 FireAlarmSystem/FireExtinguisher 独立实例,\n# 仅有类声明 (owl:Class). 以下仅查询实际存在的实例类型.\n\nSELECT ?elementType (COUNT(DISTINCT ?elem) AS ?count)
WHERE {
    {
        ?elem a ficr:Wall .
        BIND("Wall" AS ?elementType)
    } UNION {
        ?elem a ficr:Slab .
        BIND("Slab" AS ?elementType)
    } UNION {
        ?elem a ficr:Doorset .
        BIND("Doorset" AS ?elementType)
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
        ?elem a ficr:Window .
        BIND("Window" AS ?elementType)
    } UNION {
        ?elem a ficr:WallFoundation .
        BIND("WallFoundation" AS ?elementType)
    } UNION {
        ?elem a ficr:Railing .
        BIND("Railing" AS ?elementType)
    } UNION {
        ?elem a ficr:Furnishings .
        BIND("Furnishings" AS ?elementType)
    }
}
GROUP BY ?elementType
ORDER BY DESC(?count)`
            },
            {
                label: "A5: Space — Fire Element Breakdown",
                description: "每个空间的相邻消防构件台账: 构件类型、构件标签\\n仅列 Wall / Slab / Doorset 三类边界构件 (via bot:adjacentElement).\\n可按空间或构件类型过滤以聚焦关键房间.\\nNOTE: 使用 UNION 显式绑定类型 (替代 ?elem a ?elemClass + FILTER 的变量类型写法).\\n在 GraphDB 等开启 OWL 推理的引擎中, ?elem a ?elemClass 会匹配推断出的所有\\nrdf:type 三元组, 导致同一构件被重复返回. 固定类型 UNION + DISTINCT 可避免此问题.",
                query: `${QUERY_PREFIXES}\n# --- A5: Space — Fire Element Breakdown ----------------------------------------\n# 每个空间的相邻消防构件台账: 构件类型、构件标签\n# 仅列 Wall / Slab / Doorset 三类边界构件 (via bot:adjacentElement).\n# 可按空间或构件类型过滤以聚焦关键房间.\n# NOTE: 使用 UNION 显式绑定类型 (替代 ?elem a ?elemClass + FILTER 的变量类型写法).\n# 在 GraphDB 等开启 OWL 推理的引擎中, ?elem a ?elemClass 会匹配推断出的所有\n# rdf:type 三元组, 导致同一构件被重复返回. 固定类型 UNION + DISTINCT 可避免此问题.\n\nSELECT DISTINCT ?spaceLabel ?elemType ?elemLabel
WHERE {
    ?space a/rdfs:subClassOf* bot:Space ;
           rdfs:label ?spaceLabel .
    ?space bot:adjacentElement ?elem .
    {
        ?elem a ficr:Wall .
        BIND("Wall" AS ?elemType)
    } UNION {
        ?elem a ficr:Slab .
        BIND("Slab" AS ?elemType)
    } UNION {
        ?elem a ficr:Doorset .
        BIND("Doorset" AS ?elemType)
    }
    OPTIONAL { ?elem rdfs:label ?elemLabel }
}
ORDER BY ?spaceLabel ?elemType`
            },
        ]
    },
    {
        category: "Module B: COMPLIANCE",
        queries: [
            {
                label: "B1: Global Compliance Health Score",
                description: "合规汇总: Wall REI / Floor/Slab REI / Doorset 遮挡",
                query: `${QUERY_PREFIXES}\n# --- B1: Global Compliance Health Score ----------------------------------------\n# 合规汇总: Wall REI / Floor/Slab REI / Doorset 遮挡\n\nSELECT ?category ?status (COUNT(?item) AS ?count)
WHERE {
    {
        SELECT DISTINCT ?item ?category ?status
        WHERE {
            {
                # Walls — 防火等级检查
                ?item a ficr:Wall ; ficr:hasREI ?v .
                <https://w3id.org/bam/ficr#BDM02_Wall_REI_Requirement_—_PG_1b> ficr:hasREI ?r .
                BIND("Wall — REI" AS ?category)
                BIND(IF(xsd:integer(?v) >= xsd:integer(?r),
                        "Compliant", "Non-Compliant") AS ?status)
            }
            UNION
            {
                # Slabs — 防火等级检查
                ?item a ficr:Slab ; ficr:hasREI ?v .
                <https://w3id.org/bam/ficr#BDM02_Floor_REI_Requirement_—_PG_1b> ficr:hasREI ?r .
                BIND("Slab — REI" AS ?category)
                BIND(IF(xsd:integer(?v) >= xsd:integer(?r),
                        "Compliant", "Non-Compliant") AS ?status)
            }
            UNION
            {
                # Doorsets — 遮挡检查 (维护问题)
                ?item a ficr:Doorset ;
                      ficr:isObscured ?obs .
                BIND("Doorset — Access" AS ?category)
                BIND(IF(?obs = true,
                        "Non-Compliant (Obscured)", "Compliant") AS ?status)
            }
        }
    }
}
GROUP BY ?category ?status
ORDER BY ?category ?status`
            },
            {
                label: "B2: Element Compliance Detail",
                description: "全量构件合规明细: 所有 Wall / Slab / Doorset，含合规状态\\ncomplianceStatus: Compliant (actualREI ≥ requiredREI 或 门未遮挡)\\nNon-Compliant (actualREI < requiredREI 或 门遮挡)\\nissue: 不合规原因，合规时显示 \"--\"\\nDoorset 无 REI 属性，actualREI/requiredREI 以 0/1 占位 (实意: 遮挡 vs 未遮挡)",
                query: `${QUERY_PREFIXES}\n# --- B2: Element Compliance Detail ---------------------------------------------\n# 全量构件合规明细: 所有 Wall / Slab / Doorset，含合规状态\n# complianceStatus: Compliant (actualREI ≥ requiredREI 或 门未遮挡)\n# Non-Compliant (actualREI < requiredREI 或 门遮挡)\n# issue: 不合规原因，合规时显示 "--"\n# Doorset 无 REI 属性，actualREI/requiredREI 以 0/1 占位 (实意: 遮挡 vs 未遮挡)\n\nSELECT DISTINCT
    ?direction
    ?assetType
    ?elementLabel
    ?complianceStatus
    ?issue
    ?spaceLabel
    (xsd:decimal(?rei)    AS ?actualREI)
    (xsd:decimal(?reqREI) AS ?requiredREI)
WHERE {
    {
        # 水平方向: Wall (含合规和不合规)
        ?elem a ficr:Wall ;
              rdfs:label ?elementLabel ;
              ficr:hasREI ?rei .
        ?space bot:adjacentElement ?elem ;
               rdfs:label ?spaceLabel .
        <https://w3id.org/bam/ficr#BDM02_Wall_REI_Requirement_—_PG_1b> ficr:hasREI ?reqREI .
        BIND("Horizontal" AS ?direction)
        BIND("Wall"        AS ?assetType)
        BIND(IF(xsd:integer(?rei) >= xsd:integer(?reqREI),
                "Compliant", "Non-Compliant") AS ?complianceStatus)
        BIND(IF(xsd:integer(?rei) <  xsd:integer(?reqREI),
                "Wall REI Deficit", "--") AS ?issue)
    }
    UNION
    {
        # 水平方向: Doorset (含合规和不合规)
        ?elem a ficr:Doorset ;
              rdfs:label ?elementLabel .
        ?space bot:adjacentElement ?elem ;
               rdfs:label ?spaceLabel .
        OPTIONAL { ?elem ficr:isObscured ?obs }
        BIND("Horizontal" AS ?direction)
        BIND("Doorset"    AS ?assetType)
        BIND(IF(BOUND(?obs) && ?obs = true,
                "Non-Compliant", "Compliant") AS ?complianceStatus)
        BIND(IF(BOUND(?obs) && ?obs = true,
                "Door Obscured", "--") AS ?issue)
        BIND(0 AS ?rei)
        BIND(1 AS ?reqREI)
    }
    UNION
    {
        # 垂直方向: Slab (含合规和不合规)
        ?elem a ficr:Slab ;
              rdfs:label ?elementLabel ;
              ficr:hasREI ?rei .
        ?space bot:adjacentElement ?elem ;
               rdfs:label ?spaceLabel .
        <https://w3id.org/bam/ficr#BDM02_Floor_REI_Requirement_—_PG_1b> ficr:hasREI ?reqREI .
        BIND("Vertical"        AS ?direction)
        BIND("Slab"            AS ?assetType)
        BIND(IF(xsd:integer(?rei) >= xsd:integer(?reqREI),
                "Compliant", "Non-Compliant") AS ?complianceStatus)
        BIND(IF(xsd:integer(?rei) <  xsd:integer(?reqREI),
                "Slab REI Deficit", "--") AS ?issue)
    }
}
ORDER BY ?direction ?assetType ?complianceStatus`
            },
        ]
    },
    {
        category: "Module C: RISK-INFORMED INSIGHTS",
        queries: [
            {
                label: "C1: RiskUnit Inventory and Spatial Coverage",
                description: "RiskUnit 清单: 覆盖空间数、喷淋状态、Fire Alarm 状态、声明风险敞口\\nalarmStatus: Operational (年检通过) / ImpairmentUnknown (状态未知) / -- (无关联)\\ndeclaredExposure_GBP: RiskUnit 级声明风险敞口 (= 覆盖空间面积之和 × 标准单价)",
                query: `${QUERY_PREFIXES}\n# --- C1: RiskUnit Inventory and Spatial Coverage -------------------------------\n# RiskUnit 清单: 覆盖空间数、喷淋状态、Fire Alarm 状态、声明风险敞口\n# alarmStatus: Operational (年检通过) / ImpairmentUnknown (状态未知) / -- (无关联)\n# declaredExposure_GBP: RiskUnit 级声明风险敞口 (= 覆盖空间面积之和 × 标准单价)\n\nSELECT ?ruLabel
       (COUNT(DISTINCT ?space)  AS ?spacesCovered)
       ?installStatus
       ?alarmStatus
       (xsd:decimal(?exposure)  AS ?declaredExposure_GBP)
WHERE {
    ?ru a ficr:RiskUnit ;
        rdfs:label ?ruLabel .
    OPTIONAL { ?ru ficr:coversSpatialZone ?space }
    OPTIONAL { ?ru ficr:declaredExposureValue ?exposure }
    OPTIONAL {
        ?ru ficr:hasInstallationStatus ?is .
        BIND(STRAFTER(STR(?is), "#") AS ?installStatus)
    }
    OPTIONAL {
        ?imp ficr:appliesToRiskUnit ?ru .
        ?imp a ?impType .
        FILTER(?impType IN (ficr:Operational, ficr:Impaired, ficr:ImpairmentUnknown))
        BIND(STRAFTER(STR(?impType), "#") AS ?alarmStatus)
    }
}
GROUP BY ?ruLabel ?exposure ?installStatus ?alarmStatus
ORDER BY ?ruLabel`
            },
            {
                label: "C2: RiskUnit — Space Membership Detail",
                description: "RiskUnit 空间成员明细",
                query: `${QUERY_PREFIXES}\n# --- C2: RiskUnit — Space Membership Detail ------------------------------------\n# RiskUnit 空间成员明细\n\nSELECT ?ruLabel ?spaceLabel
       (xsd:decimal(?area) AS ?areaM2)
       ?usageLabel
WHERE {
    ?ru a ficr:RiskUnit ;
        rdfs:label ?ruLabel ;
        ficr:coversSpatialZone ?space .
    ?space rdfs:label ?spaceLabel .
    OPTIONAL { ?space ficr:hasArea ?area }
    OPTIONAL {
        ?space ficr:hasSpaceUsage ?usage .
        OPTIONAL { ?usage rdfs:label ?uLabel }
    }
    BIND(COALESCE(?uLabel, IF(BOUND(?usage), STRAFTER(STR(?usage), "#"), "")) AS ?usageLabel)
}
ORDER BY ?ruLabel ?spaceLabel`
            },
            {
                label: "C3: BoundaryAssumption Condition State Distribution",
                description: "边界假设条件状态分布 (按 RiskUnit)\\nBUG-FIX: 加 ?ba a ficr:BoundaryAssumption, 防止 ImpairmentState 混入.\\nficr:appliesToRiskUnit 和 ficr:hasConditionState 两个属性在 TBox 中\\ndomain 同时包含 BoundaryAssumption 和 ImpairmentState (有意设计),\\n无类型过滤时 SPARQL 会同时匹配两类节点导致计数虚高.",
                query: `${QUERY_PREFIXES}\n# --- C3: BoundaryAssumption Condition State Distribution -----------------------\n# 边界假设条件状态分布 (按 RiskUnit)\n# BUG-FIX: 加 ?ba a ficr:BoundaryAssumption, 防止 ImpairmentState 混入.\n# ficr:appliesToRiskUnit 和 ficr:hasConditionState 两个属性在 TBox 中\n# domain 同时包含 BoundaryAssumption 和 ImpairmentState (有意设计),\n# 无类型过滤时 SPARQL 会同时匹配两类节点导致计数虚高.\n\nSELECT ?ruLabel ?conditionState (COUNT(DISTINCT ?ba) AS ?count)
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
                label: "C4: Unknown Assumptions with Missing Evidence",
                description: "缺失证据的 Unknown 假设 (可操作检查清单)\\nBUG-FIX: 必须显式声明 ?ba a ficr:BoundaryAssumption, 否则 ImpairmentState\\n实例 (如 impairment_alarm_B 亦有 appliesToRiskUnit + hasConditionState Unknown)\\n会混入结果. 修复后精确返回 4 条 BoundaryAssumption.",
                query: `${QUERY_PREFIXES}\n# --- C4: Unknown Assumptions with Missing Evidence -----------------------------\n# 缺失证据的 Unknown 假设 (可操作检查清单)\n# BUG-FIX: 必须显式声明 ?ba a ficr:BoundaryAssumption, 否则 ImpairmentState\n# 实例 (如 impairment_alarm_B 亦有 appliesToRiskUnit + hasConditionState Unknown)\n# 会混入结果. 修复后精确返回 4 条 BoundaryAssumption.\n\nSELECT ?ruLabel ?assumptionLabel ?assumptionType
WHERE {
    ?ru a ficr:RiskUnit ;
        rdfs:label ?ruLabel .
    ?ba a ficr:BoundaryAssumption ;
        ficr:appliesToRiskUnit ?ru ;
        ficr:hasConditionState ficr:Unknown .
    OPTIONAL { ?ba rdfs:label ?assumptionLabel }
    OPTIONAL {
        ?ba ficr:hasAssumptionType ?at .
        BIND(STRAFTER(STR(?at), "#") AS ?assumptionType)
    }
    FILTER NOT EXISTS { ?ba ficr:supportedByEvidence ?ev }
}
ORDER BY ?ruLabel ?assumptionType`
            },
            {
                label: "C5: ImpairmentState — Critical System Status x RiskUnit",
                description: "消防系统运行状态 (按 RiskUnit)",
                query: `${QUERY_PREFIXES}\n# --- C5: ImpairmentState — Critical System Status x RiskUnit -------------------\n# 消防系统运行状态 (按 RiskUnit)\n\nSELECT ?ruLabel ?impairmentLabel ?systemName ?conditionName
WHERE {
    ?imp ficr:appliesToRiskUnit ?ru .
    ?ru  a ficr:RiskUnit ;
         rdfs:label ?ruLabel .
    # 只匹配 ImpairmentState 子类实例 (Operational / ImpairmentUnknown)
    ?imp a ?impType .
    FILTER(?impType IN (ficr:Operational, ficr:Impaired, ficr:ImpairmentUnknown))
    OPTIONAL { ?imp rdfs:label ?impairmentLabel }
    OPTIONAL {
        ?imp ficr:affectsSystem ?sys .
        BIND(STRAFTER(STR(?sys), "#") AS ?systemName)
    }
    OPTIONAL {
        ?imp ficr:hasConditionState ?cs .
        BIND(STRAFTER(STR(?cs), "#") AS ?conditionName)
    }
}
ORDER BY ?ruLabel ?systemName`
            },
            {
                label: "C6: Evidence Items — Detail per Assumption",
                description: "每个边界假设的证据明细 (仅限 BoundaryAssumption)\\nBUG-FIX: 加 ?ba a ficr:BoundaryAssumption.\\n未过滤时 alarm_A (ImpairmentState) 的证据以 assumptionType=\"--\" 混入结果.\\nalarm 证据由 C5 负责, C6 专注 BoundaryAssumption 证据.\\n预期 4 条 (cert_comp_A, drawing_struct_A, obs_cavity_B, drawing_struct_B).",
                query: `${QUERY_PREFIXES}\n# --- C6: Evidence Items — Detail per Assumption --------------------------------\n# 每个边界假设的证据明细 (仅限 BoundaryAssumption)\n# BUG-FIX: 加 ?ba a ficr:BoundaryAssumption.\n# 未过滤时 alarm_A (ImpairmentState) 的证据以 assumptionType="--" 混入结果.\n# alarm 证据由 C5 负责, C6 专注 BoundaryAssumption 证据.\n# 预期 4 条 (cert_comp_A, drawing_struct_A, obs_cavity_B, drawing_struct_B).\n\nSELECT ?ruLabel ?assumptionLabel ?assumptionType ?evidenceType ?docTitle ?docURI
WHERE {
    ?ru a ficr:RiskUnit ;
        rdfs:label ?ruLabel .
    ?ba a ficr:BoundaryAssumption ;
        ficr:appliesToRiskUnit ?ru ;
        ficr:supportedByEvidence ?ev .
    OPTIONAL { ?ba rdfs:label ?assumptionLabel }
    OPTIONAL {
        ?ba ficr:hasAssumptionType ?at .
        BIND(STRAFTER(STR(?at), "#") AS ?assumptionType)
    }
    OPTIONAL {
        ?ev rdf:type ?et .
        FILTER(?et != owl:NamedIndividual)
        BIND(STRAFTER(STR(?et), "#") AS ?evidenceType)
    }
    OPTIONAL { ?ev ficr:documentTitle ?docTitle }
    OPTIONAL { ?ev ficr:documentURI   ?docURI   }
}
ORDER BY ?ruLabel ?assumptionType`
            },
            {
                label: "C7: Risk Unit Conservative Confidence Assessment — Worst-First",
                description: "保守置信评级: 按证据缺口数 + Unknown假设数降序，优先暴露最不利单元\\nFiCR 设计理念: 不输出 insurer-grade EML 数值; 贡献在于将风险评估依赖的\\nRisk Unit 划分 / 边界假设 / 系统损害 / 证据缺口 结构化并可查询.\\n关键前提不足时保守标记, 优先暴露最不利单元与证据缺口.\\n字段说明:\\nunknownCount       — BoundaryAssumption 中 Unknown 状态数 (越高越不确定)\\ncompromisedCount   — BoundaryAssumption 中 Compromised 状态数 (已确认缺陷)\\nevidenceGapCount   — Unknown 状态中无任何 Evidence 支撑的数量 (审计优先)\\ninstallStatus      — 喷淋状态 (UnsprinkleredOrNonCompliant 为高关注)\\nalarmStatus        — 火警系统状态 (ImpairmentUnknown 时需优先核查)\\nNOTE: Roof Space Unit (riskunit_roof) 无 BoundaryAssumption → 不出现在本查询.",
                query: `${QUERY_PREFIXES}\n# --- C7: Risk Unit Conservative Confidence Assessment — Worst-First ------------\n# 保守置信评级: 按证据缺口数 + Unknown假设数降序，优先暴露最不利单元\n# FiCR 设计理念: 不输出 insurer-grade EML 数值; 贡献在于将风险评估依赖的\n# Risk Unit 划分 / 边界假设 / 系统损害 / 证据缺口 结构化并可查询.\n# 关键前提不足时保守标记, 优先暴露最不利单元与证据缺口.\n# 字段说明:\n# unknownCount       — BoundaryAssumption 中 Unknown 状态数 (越高越不确定)\n# compromisedCount   — BoundaryAssumption 中 Compromised 状态数 (已确认缺陷)\n# evidenceGapCount   — Unknown 状态中无任何 Evidence 支撑的数量 (审计优先)\n# installStatus      — 喷淋状态 (UnsprinkleredOrNonCompliant 为高关注)\n# alarmStatus        — 火警系统状态 (ImpairmentUnknown 时需优先核查)\n# NOTE: Roof Space Unit (riskunit_roof) 无 BoundaryAssumption → 不出现在本查询.\n\nSELECT ?ruLabel
       ?totalAssumptions ?unknownCount ?compromisedCount
       ?evidenceGapCount ?installStatus ?alarmStatus
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
    OPTIONAL { ?imp ficr:appliesToRiskUnit ?ru ; a ficr:ImpairmentUnknown .
               BIND("ImpairmentUnknown" AS ?alarmStatus) }
}
ORDER BY DESC(?evidenceGapCount) DESC(?unknownCount)`
            },
        ]
    },
];
