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
                BIND("Fire Wall" AS ?category) BIND(IF(?v >= ?r, "Compliant", "Non-Compliant") AS ?status)
            } UNION {
                ?item a/rdfs:subClassOf* ficr:Doorset ; ficr:isObscured ?obs .
                BIND("Fire Door" AS ?category) BIND(IF(?obs = true, "Non-Compliant (Obscured)", "Compliant") AS ?status)
            } UNION {
                { ?item a ficr:Floor } UNION { ?item a ficr:Slab }
                ?item ficr:hasREI ?v . ficr:req_pg1b_floor ficr:hasREI ?r .
                BIND("Floor Slab" AS ?category) BIND(IF(?v >= ?r, "Compliant", "Non-Compliant") AS ?status)
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
        FILTER(?actualREI < ?requiredREI)
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
        FILTER(?actualREI < ?requiredREI)
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
                description: "Identify horizontal and vertical spread channels / 潜在风险蔓延路径",
                query: `${QUERY_PREFIXES}
# --- Q3.1 Vulnerable Spread Paths / 潜在风险蔓延路径 ---
# Goal: Identify horizontal (Wall/Door) and vertical (Floor/Slab) spread channels.
# 目标：识别横向（墙/门）与纵向（楼板）的火灾蔓延通道。

SELECT DISTINCT ?direction ?fromLabel ?toLabel ?elementLabel ?issue
WHERE {
    {
        # 1. Horizontal Paths (Wall & Door) / 横向路径（墙与门）
        # Logic: Spaces are adjacent, and the connecting element is compromised.
        # 逻辑：空间相邻，且连接构件存在缺陷。
        ?s1 bot:adjacentZone ?s2 ; rdfs:label ?fromLabel .
        ?s2 rdfs:label ?toLabel .
        FILTER(STR(?s1) < STR(?s2)) # Remove duplicate reciprocal paths / 消除重复的往返路径
        
        {
            # Sub-path: Failed Wall REI / 子路径：墙体耐火极限失效
            ?s1 bot:adjacentElement ?e . ?s2 bot:adjacentElement ?e .
            ?e a ficr:Wall ; rdfs:label ?elementLabel ; ficr:hasREI ?v .
            ficr:req_pg1b_wall ficr:hasREI ?r . FILTER(?v < ?r)
            BIND("Horizontal" AS ?direction) BIND("Wall REI Failure" AS ?issue)
        }
        UNION
        {
            # Sub-path: Obscured Fire Door / 子路径：防火门被遮挡/常开
            # Note: A door on either side of the adjacent boundary triggers the risk.
            # 注意：邻接边界上的任一扇门失效即触发风险。
            ?e a/rdfs:subClassOf* ficr:Doorset ; rdfs:label ?elementLabel ; ficr:isObscured true .
            { ?s1 bot:adjacentElement ?e } UNION { ?s2 bot:adjacentElement ?e }
            BIND("Horizontal" AS ?direction) BIND("Fire Door Obscured" AS ?issue)
        }
    }
    UNION
    {
        # 2. Vertical Paths (Floor/Slab) / 纵向路径（楼板）
        # Logic: Fire spreads between storeys via non-compliant slabs.
        # 逻辑：火灾通过不合规的楼板在楼层间蔓延。
        ?lowerStorey ficr:isStoreyBelow ?upperStorey .
        ?lowerStorey rdfs:label ?fromLabel . ?upperStorey rdfs:label ?toLabel .
        
        # Identify rooms in these storeys linked by a failed floor / 识别由失效楼板连接的楼层空间
        ?lowerStorey bot:hasSpace ?s_low . ?s_low bot:adjacentElement ?f .
        { ?f a ficr:Floor } UNION { ?f a ficr:Slab }
        ?f rdfs:label ?elementLabel ; ficr:hasREI ?fv .
        ficr:req_pg1b_floor ficr:hasREI ?fr . FILTER(?fv < ?fr)
        
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
                # Triggered by failed walls or obscured doors / 由失效墙体或被遮挡防火门触发
                ?originSpace bot:adjacentZone ?affectedSpace .
                ?affectedSpace rdfs:label ?affectedSpaceLabel ; ficr:hasFixedAssetValue ?affectedVal .
                FILTER EXISTS {
                    { ?originSpace bot:adjacentElement ?e1 . ?affectedSpace bot:adjacentElement ?e1 . ?e1 a ficr:Wall ; ficr:hasREI ?v1 . ficr:req_pg1b_wall ficr:hasREI ?r1 . FILTER(?v1 < ?r1) }
                    UNION { ?e2 a/rdfs:subClassOf* ficr:Doorset ; ficr:isObscured true . {?originSpace bot:adjacentElement ?e2} UNION {?affectedSpace bot:adjacentElement ?e2} }
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
    (xsd:integer(COUNT(DISTINCT ?riskSpace)) AS ?totalScenarios)
    (xsd:decimal(SUM(?scenarioEML)) AS ?totalPortfolioRisk)
    (xsd:decimal(AVG(?scenarioEML)) AS ?averageScenarioLoss)
    (xsd:decimal(MAX(?scenarioEML)) AS ?maximumPossibleLoss_EML)
WHERE {
    {
        SELECT ?riskSpace (SUM(?dv) AS ?scenarioEML)
        WHERE {
            # This subquery encapsulates the exact H2 logic from your source file.
            # 该子查询封装了原始文件中 H2 的精确计算逻辑。
            {
                SELECT DISTINCT ?riskSpace ?affectedSpace ?values
                WHERE {
                    ?riskSpace a/rdfs:subClassOf* bot:Space ; ficr:hasFixedAssetValue ?originVal .
                    { BIND(?riskSpace AS ?affectedSpace) BIND(?originVal AS ?values) }
                    UNION
                    {
                        ?riskSpace bot:adjacentZone ?affectedSpace . ?affectedSpace ficr:hasFixedAssetValue ?hVal .
                        FILTER EXISTS {
                            { ?riskSpace bot:adjacentElement ?sw . ?affectedSpace bot:adjacentElement ?sw . ?sw a ficr:Wall ; ficr:hasREI ?wV . ficr:req_pg1b_wall ficr:hasREI ?wR . FILTER(?wV < ?wR) }
                            UNION { ?sd a/rdfs:subClassOf* ficr:Doorset ; ficr:isObscured true . {?riskSpace bot:adjacentElement ?sd} UNION {?affectedSpace bot:adjacentElement ?sd} }
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
}`
            },
            {
                label: "Q4.3 Value at Risk (VaR)",
                description: "Value at Risk (VaR) Analysis / 风险资产占比分析 (投资洞察)",
                query: `${QUERY_PREFIXES}
# --- Q4.3: Value at Risk (VaR) Analysis / 风险资产占比分析 (投资洞察) ---
# Purpose: How much asset value is "unprotected" due to non-compliance?
# 目的：由于构件不合规，有多少比例的资产处于受威胁状态？

SELECT
    (xsd:decimal(SUM(?val)) AS ?buildingTotalAssetValue)
    (xsd:decimal(SUM(?riskVal)) AS ?totalValueAtRisk)
    (xsd:decimal(SUM(?riskVal) / SUM(?val) * 100) AS ?riskPercentage)
WHERE {
    {
        # 使用子查询先锁定唯一的空间及其对应的价值和风险状态
        # Subquery to isolate unique spaces and their values first
        SELECT DISTINCT ?space ?val ?riskVal
        WHERE {
            ?space a/rdfs:subClassOf* bot:Space ; 
                   ficr:hasFixedAssetValue ?val .
            
            # 判定该空间是否处于风险中
            # Determine if the space is "at risk"
            BIND(IF( EXISTS {
                { ?space bot:adjacentElement ?e1 . ?e1 a ficr:Wall ; ficr:hasREI ?r1 . ficr:req_pg1b_wall ficr:hasREI ?rq1 . FILTER(?r1 < ?rq1) }
                UNION { ?space bot:adjacentElement ?e2 . ?e2 a/rdfs:subClassOf* ficr:Doorset ; ficr:isObscured true . }
                UNION { ?space bot:adjacentElement ?e3 . { ?e3 a ficr:Floor } UNION { ?e3 a ficr:Slab } ?e3 ficr:hasREI ?r3 . ficr:req_pg1b_floor ficr:hasREI ?rq3 . FILTER(?r3 < ?rq3) }
            }, ?val, 0) AS ?riskVal)
        }
    }
}`
            }
        ]
    }
];
