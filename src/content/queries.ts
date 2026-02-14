export const QUERY_PREFIXES = `PREFIX ficr: <https://w3id.org/bam/ficr#>
PREFIX bot:  <https://w3id.org/bot#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
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
        category: "Module 1: General Overview",
        queries: [
            {
                label: "Q1.1 Building Core Metrics",
                description: "Overview of building scale and counts of instances / 建筑规模概况及实例数量统计",
                query: `${QUERY_PREFIXES}
# --- Q1.1 Building Metrics & Statistics / 建筑核心指标与规模统计 ---
# Purpose: Overview of building scale and counts of instances.
# 目的：建筑规模概况及实例数量统计。
SELECT ?building ?label 
       (xsd:decimal(?height) AS ?heightM) 
       (xsd:integer(?configStoreys) AS ?configuredStoreyNum)
       (COUNT(DISTINCT ?storey) AS ?actualStoreyCount)
       (COUNT(DISTINCT ?space) AS ?actualRoomCount)
       (xsd:decimal(?unitVal) AS ?standardUnitValue)
WHERE {
    ?building a bot:Building ; rdfs:label ?label .
    OPTIONAL { ?building ficr:hasBuildingHeight ?height }
    OPTIONAL { ?building ficr:hasNumberOfStoreys ?configStoreys }
    OPTIONAL { ficr:GlobalRiskConfig ficr:hasStandardUnitValue ?unitVal }
    OPTIONAL {
        ?building bot:hasStorey ?storey .
        ?storey bot:hasSpace ?space .
    }
}
GROUP BY ?building ?label ?height ?configStoreys ?unitVal`
            },
            {
                label: "Q1.2 Space Ledger",
                description: "Space Ledger & Asset Distribution / 空间台账与资产分布",
                query: `${QUERY_PREFIXES}
# --- Q1.2 Space Ledger & Asset Distribution / 空间台账与资产分布 ---

SELECT DISTINCT ?storeyLabel ?spaceLabel 
       (xsd:decimal(?area) AS ?areaM2) 
       (xsd:decimal(?assetVal) AS ?assetValue)
WHERE {
    ?storey a/rdfs:subClassOf* bot:Storey ; 
            rdfs:label ?storeyLabel .
    ?storey bot:hasSpace ?space .
    ?space rdfs:label ?spaceLabel .
    OPTIONAL { ?space ficr:hasArea ?area }
    OPTIONAL { ?space ficr:hasFixedAssetValue ?assetVal }
}
ORDER BY ?storeyLabel`
            }
        ]
    },
    {
        category: "Module 2: Compliance Audit",
        queries: [
            {
                label: "Q2.1 Global Compliance Health",
                description: "Global Compliance Health Score / 全局合规健康统计",
                query: `${QUERY_PREFIXES}
# --- Q2.1 Global Compliance Health Score / 全局合规健康统计 ---
SELECT ?category ?status (COUNT(?item) AS ?count)
WHERE {
    {
        # 使用子查询确保每个构件只被统计一次
        # Use subquery to ensure each item is counted only once
        SELECT DISTINCT ?item ?category ?status
        WHERE {
            {
                ?item a ficr:Wall ; ficr:hasREI ?v . ficr:req_pg1b_wall ficr:hasREI ?r .
                BIND("Fire Wall" AS ?category) BIND(IF(xsd:integer(?v) >= xsd:integer(?r), "Compliant", "Non-Compliant") AS ?status)
            } UNION {
                ?item a/rdfs:subClassOf* ficr:Doorset ; ficr:isObscured ?obs .
                BIND("Fire Door" AS ?category) BIND(IF(?obs = true, "Non-Compliant (Obscured)", "Compliant") AS ?status)
            } UNION {
                { ?item a ficr:Floor } UNION { ?item a ficr:Slab }
                ?item ficr:hasREI ?v . ficr:req_pg1b_floor ficr:hasREI ?r .
                BIND("Floor Slab" AS ?category) BIND(IF(xsd:integer(?v) >= xsd:integer(?r), "Compliant", "Non-Compliant") AS ?status)
            }
        }
    }
}
GROUP BY ?category ?status`
            },
            {
                label: "Q2.2 Non-Compliance Detail List",
                description: "List all horizontal (Wall/Door) and vertical (Floor/Slab) failures / 不合规项异常清单",
                query: `${QUERY_PREFIXES}
# --- Q2.2 Non-Compliance Detail List / 不合规项异常清单 ---
# Goal: List all horizontal (Wall/Door) and vertical (Floor/Slab) failures with asset context.
# 目标：列出所有横向（墙/门）和纵向（楼板）的失效项，并关联受影响资产背景。

SELECT DISTINCT ?assetType ?elementLabel ?issue ?spaceLabel
       (xsd:decimal(?actualREI) AS ?actualREIValue)
       (xsd:decimal(?requiredREI) AS ?requiredREIValue)
       (xsd:decimal(?affectedAsset) AS ?affectedAssetValue)
WHERE {
    {
        # 1. Horizontal: Non-compliant Walls / 横向：不合规墙体
        ?element a ficr:Wall ; rdfs:label ?elementLabel ; ficr:hasREI ?actualREI .
        ?space bot:adjacentElement ?element ; rdfs:label ?spaceLabel .
        ficr:req_pg1b_wall ficr:hasREI ?requiredREI .
        FILTER(xsd:integer(?actualREI) < xsd:integer(?requiredREI))
        BIND("Horizontal" AS ?direction) BIND("Wall REI Deficit" AS ?issue) BIND("Wall" AS ?assetType)
    }
    UNION
    {
        # 2. Horizontal: Obscured Fire Doors / 横向：被遮挡的防火门
        ?element a/rdfs:subClassOf* ficr:Doorset ; rdfs:label ?elementLabel ; ficr:isObscured true .
        ?space bot:adjacentElement ?element ; rdfs:label ?spaceLabel .
        BIND("Horizontal" AS ?direction) BIND("Door Obscured/Blocked" AS ?issue) BIND("Door" AS ?assetType)
        BIND(0 AS ?actualREI) BIND(1 AS ?requiredREI) # Semantic flag / 语义化标记
    }
    UNION
    {
        # 3. Vertical: Non-compliant Floors/Slabs / 纵向：不合规楼板
        { ?element a ficr:Floor } UNION { ?element a ficr:Slab }
        ?element rdfs:label ?elementLabel ; ficr:hasREI ?actualREI .
        ?space bot:adjacentElement ?element ; rdfs:label ?spaceLabel .
        ficr:req_pg1b_floor ficr:hasREI ?requiredREI .
        FILTER(xsd:integer(?actualREI) < xsd:integer(?requiredREI))
        BIND("Vertical" AS ?direction) BIND("Floor REI Deficit" AS ?issue) BIND("Floor/Slab" AS ?assetType)
    }
    
    # Associate affected asset value / 关联受影响资产价值
    OPTIONAL { ?space ficr:hasFixedAssetValue ?affectedAsset }
}
ORDER BY ?direction ?assetType ?spaceLabel`
            }
        ]
    },
    {
        category: "Module 3: Dynamic Simulation",
        queries: [
            {
                label: "Q3.1 Vulnerable Spread Paths",
                description: "Identify horizontal (Wall) and vertical (Floor/Slab) structural spread channels / 潜在风险蔓延路径",
                query: `${QUERY_PREFIXES}
# --- Q3.1 Vulnerable Spread Paths / 潜在风险蔓延路径 ---
# Goal: Identify horizontal (Wall) and vertical (Floor/Slab) structural spread channels.
# 目标：识别横向（墙体 REI 失效）与纵向（楼板 REI 失效）的火灾蔓延通道。
# NOTE: Door obstruction is a maintenance issue, not a structural fire spread trigger.
# 注意：门遮挡属于维护问题，不构成结构性蔓延通道。

SELECT DISTINCT ?direction ?fromLabel ?toLabel ?elementLabel ?issue
WHERE {
    {
        # 1. Horizontal Paths (Wall REI Failure) / 横向路径（墙体 REI 失效）
        # Logic: Spaces are adjacent, and the shared wall has insufficient fire resistance.
        # 逻辑：空间相邻，且共享墙体耐火极限不足。
        ?s1 bot:adjacentZone ?s2 ; rdfs:label ?fromLabel .
        ?s2 rdfs:label ?toLabel .
        FILTER(STR(?s1) < STR(?s2)) # Remove duplicate reciprocal paths / 消除重复的往返路径
        
        ?s1 bot:adjacentElement ?e . ?s2 bot:adjacentElement ?e .
        ?e a ficr:Wall ; rdfs:label ?elementLabel ; ficr:hasREI ?v .
        ficr:req_pg1b_wall ficr:hasREI ?r . FILTER(xsd:integer(?v) < xsd:integer(?r))
        BIND("Horizontal" AS ?direction) BIND("Wall REI Failure" AS ?issue)
    }
    UNION
    {
        # 2. Vertical Paths (Floor/Slab REI Failure) / 纵向路径（楼板 REI 失效）
        # Logic: Fire spreads between storeys via non-compliant slabs.
        # 逻辑：火灾通过不合规的楼板在楼层间蔓延。
        ?lowerStorey ficr:isStoreyBelow ?upperStorey .
        ?lowerStorey rdfs:label ?fromLabel . ?upperStorey rdfs:label ?toLabel .
        
        # Identify rooms in these storeys linked by a failed floor / 识别由失效楼板连接的楼层空间
        ?lowerStorey bot:hasSpace ?s_low . ?s_low bot:adjacentElement ?f .
        { ?f a ficr:Floor } UNION { ?f a ficr:Slab }
        ?f rdfs:label ?elementLabel ; ficr:hasREI ?fv .
        ficr:req_pg1b_floor ficr:hasREI ?fr . FILTER(xsd:integer(?fv) < xsd:integer(?fr))
        
        BIND("Vertical" AS ?direction) BIND("Floor REI Failure" AS ?issue)
    }
}
ORDER BY ?direction ?fromLabel`
            }
        ]
    },
    {
        category: "Module 4: Financial Decision",
        queries: [
            {
                label: "Q4.1 Scenario Impact Analysis",
                description: "Scenario Impact Analysis (Per Room Loss) / 场景化损失分析 (单房起火损失)",
                query: `${QUERY_PREFIXES}
# --- Q4.1: Scenario Impact Analysis (Per Room Loss) / 场景化损失分析 (单房起火损失) ---
# Purpose: What is the financial loss if a specific room catches fire?
# 目的：如果特定房间起火，会导致哪些关联资产损失？
SELECT ?originSpaceLabel ?affectedSpaceLabel 
       (xsd:decimal(?lossCoefficient) AS ?coefficient) 
       (xsd:decimal(?contribution) AS ?lossAmount)
WHERE {
    {
        # 使用子查询确保来源-影响对唯一
        # Use subquery to ensure unique origin-affected pairs
        SELECT DISTINCT ?originSpaceLabel ?affectedSpaceLabel ?lossCoefficient ?contribution
        WHERE {
            ?originSpace a/rdfs:subClassOf* bot:Space ; rdfs:label ?originSpaceLabel ; ficr:hasFixedAssetValue ?originVal .
            
            {
                # 1. Self Loss (1.0) / 起火点自损 (100%)
                BIND(?originSpaceLabel AS ?affectedSpaceLabel)
                BIND(1.0 AS ?lossCoefficient)
                BIND(?originVal * 1.0 AS ?contribution)
            }
            UNION
            {
                # 2. Horizontal Spread (1.0) / 横向蔓延损失 (100%)
                # Triggered by shared wall with insufficient REI / 由共享墙体 REI 不足触发
                ?originSpace bot:adjacentZone ?affectedSpace .
                ?affectedSpace rdfs:label ?affectedSpaceLabel ; ficr:hasFixedAssetValue ?affectedVal .
                FILTER EXISTS {
                    ?originSpace bot:adjacentElement ?e1 . ?affectedSpace bot:adjacentElement ?e1 . ?e1 a ficr:Wall ; ficr:hasREI ?v1 . ficr:req_pg1b_wall ficr:hasREI ?r1 . FILTER(xsd:integer(?v1) < xsd:integer(?r1))
                }
                BIND(1.0 AS ?lossCoefficient)
                BIND(?affectedVal * 1.0 AS ?contribution)
            }
            UNION
            {
                # 3. Vertical Spread (0.1) / 纵向蔓延损失 (10%)
                # Triggered between storeys / 在楼层间蔓延
                ?originStorey bot:hasSpace ?originSpace .
                { ?originStorey ficr:isStoreyBelow ?vStorey } UNION { ?originStorey ficr:isStoreyAbove ?vStorey }
                ?vStorey bot:hasSpace ?affectedSpace .
                ?affectedSpace rdfs:label ?affectedSpaceLabel ; ficr:hasFixedAssetValue ?vVal .
                BIND(0.1 AS ?lossCoefficient)
                BIND(?vVal * 0.1 AS ?contribution)
            }
        }
    }
}
ORDER BY ?originSpaceLabel DESC(?lossAmount)`
            },
            {
                label: "Q4.2 Portfolio EML Summary",
                description: "Building Portfolio EML Summary / 全局 EML 风险统计 (CEO 视图)",
                query: `${QUERY_PREFIXES}
# --- Q4.2: Building Portfolio EML Summary / 全局 EML 风险统计 (CEO 视图) ---
# Purpose: Calculate the overall risk metrics (EML, Average Loss) for the entire building.
# 目的：计算整栋建筑的综合风险指标（最大预期损失、平均损失）。

SELECT
    ?totalScenarios
    (xsd:decimal(ROUND(?totalRisk * 1000) / 1000.0) AS ?totalPortfolioRisk)
    (xsd:decimal(ROUND(?avgLoss * 1000) / 1000.0) AS ?averageScenarioLoss)
    (xsd:decimal(ROUND(?maxLoss * 1000) / 1000.0) AS ?maximumPossibleLoss_EML)
WHERE {
    {
        SELECT (COUNT(?scenarioEML) AS ?totalScenarios) 
               (SUM(?scenarioEML) AS ?totalRisk) 
               (AVG(?scenarioEML) AS ?avgLoss) 
               (MAX(?scenarioEML) AS ?maxLoss)
        WHERE {
            {
                SELECT ?riskSpace (SUM(?dv) AS ?scenarioEML)
                WHERE {
                    {
                        SELECT DISTINCT ?riskSpace ?affectedSpace ?values
                        WHERE {
                            ?riskSpace a/rdfs:subClassOf* bot:Space ; ficr:hasFixedAssetValue ?originVal .
                            { BIND(?riskSpace AS ?affectedSpace) BIND(?originVal AS ?values) }
                            UNION
                            {
                                ?riskSpace bot:adjacentZone ?affectedSpace . ?affectedSpace ficr:hasFixedAssetValue ?hVal .
                                FILTER EXISTS {
                                    ?riskSpace bot:adjacentElement ?sw . ?affectedSpace bot:adjacentElement ?sw . ?sw a ficr:Wall ; ficr:hasREI ?wV . ficr:req_pg1b_wall ficr:hasREI ?wR . FILTER(xsd:integer(?wV) < xsd:integer(?wR))
                                }
                                BIND(?hVal * 1.0 AS ?values)
                            }
                            UNION
                            {
                                ?os bot:hasSpace ?riskSpace . {?os ficr:isStoreyBelow ?vs} UNION {?os ficr:isStoreyAbove ?vs}
                                ?vs bot:hasSpace ?affectedSpace . ?affectedSpace ficr:hasFixedAssetValue ?vVal .
                                BIND(?vVal * 0.1 AS ?values)
                            }
                        }
                    }
                    BIND(?values AS ?dv)
                } GROUP BY ?riskSpace
            }
        }
    }
}`
            },
            {
                label: "Q4.3 Component Non-Compliance",
                description: "Component Non-Compliance Analysis / 构件级不合规率分析",
                query: `${QUERY_PREFIXES}
# --- Q4.3: Component Non-Compliance Analysis / 构件级不合规率分析 ---
# Purpose: What percentage of fire safety components are non-compliant?
# 目的：各类消防构件的不合规比例是多少？提供比资产价值比更精确的建筑合规概况。
# NOTE: Door obstruction is tracked separately as a maintenance issue.
# 注意：门遮挡单独作为维护问题统计，不纳入结构性不合规。

SELECT
    (xsd:integer(?tw) AS ?totalWalls)
    (xsd:integer(?nw) AS ?nonCompliantWalls)
    (xsd:decimal(ROUND(?nw * 10000.0 / ?tw) / 100.0) AS ?wallNonComplianceRate)
    (xsd:integer(?tf) AS ?totalFloors)
    (xsd:integer(?nf) AS ?nonCompliantFloors)
    (xsd:decimal(ROUND(?nf * 10000.0 / ?tf) / 100.0) AS ?floorNonComplianceRate)
    (xsd:integer(?td) AS ?totalDoors)
    (xsd:integer(?od) AS ?obscuredDoors)
    (xsd:decimal(ROUND(?od * 10000.0 / ?td) / 100.0) AS ?doorObstructionRate)
    (xsd:integer(?tw + ?tf + ?td) AS ?totalComponents)
    (xsd:integer(?nw + ?nf + ?od) AS ?totalNonCompliant)
    (xsd:decimal(ROUND((?nw + ?nf + ?od) * 10000.0 / (?tw + ?tf + ?td)) / 100.0) AS ?overallNonComplianceRate)
WHERE {
    # Subquery 1: Wall counts / 子查询1：墙体统计
    { SELECT (COUNT(DISTINCT ?w) AS ?tw) WHERE { ?w a ficr:Wall ; ficr:hasREI ?dummy1 . } }
    # Subquery 2: Non-compliant wall counts / 子查询2：不合规墙体统计
    { SELECT (COUNT(DISTINCT ?ncw) AS ?nw) WHERE {
        ?ncw a ficr:Wall ; ficr:hasREI ?wv . ficr:req_pg1b_wall ficr:hasREI ?wr . FILTER(xsd:integer(?wv) < xsd:integer(?wr))
    } }
    # Subquery 3: Floor counts / 子查询3：楼板统计
    { SELECT (COUNT(DISTINCT ?fl) AS ?tf) WHERE {
        { ?fl a ficr:Floor } UNION { ?fl a ficr:Slab }
        ?fl ficr:hasREI ?dummy2 .
    } }
    # Subquery 4: Non-compliant floor counts / 子查询4：不合规楼板统计
    { SELECT (COUNT(DISTINCT ?ncf) AS ?nf) WHERE {
        { ?ncf a ficr:Floor } UNION { ?ncf a ficr:Slab }
        ?ncf ficr:hasREI ?fv . ficr:req_pg1b_floor ficr:hasREI ?fr . FILTER(xsd:integer(?fv) < xsd:integer(?fr))
    } }
    # Subquery 5: Door counts / 子查询5：门统计
    { SELECT (COUNT(DISTINCT ?dr) AS ?td) WHERE { ?dr a/rdfs:subClassOf* ficr:Doorset . } }
    # Subquery 6: Obscured door counts / 子查询6：遮挡门统计
    { SELECT (COUNT(DISTINCT ?odr) AS ?od) WHERE {
        ?odr a/rdfs:subClassOf* ficr:Doorset ; ficr:isObscured true .
    } }
}`
            }
        ]
    }
];
