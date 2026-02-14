import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, Button, Badge } from '../components/shared';
import {
    Building2,
    AlertTriangle,
    Download,
    TrendingUp,
    ShieldCheck,
    Info,
    ArrowUpDown,
    ShieldAlert,
    DoorOpen,
    Layers,
    Filter,
    FileSpreadsheet,
    Loader2,
    ChevronUp,
    ChevronDown,
    Wrench
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    ResponsiveContainer
} from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { useSparqlQuery } from '../hooks/useSparqlQuery';
import { QUERY_PREFIXES } from '../content/queries.ts';

// ============================================================
// Queries
// ============================================================
const QUERY_DEFICITS = `${QUERY_PREFIXES}
SELECT DISTINCT ?assetType ?elementLabel ?issue ?spaceLabel
       (xsd:decimal(?actualREI) AS ?actualREIValue)
       (xsd:decimal(?requiredREI) AS ?requiredREIValue)
       (xsd:decimal(?affectedAsset) AS ?affectedAssetValue)
WHERE {
    {
        ?element a ficr:Wall ; rdfs:label ?elementLabel ; ficr:hasREI ?actualREI .
        ?space bot:adjacentElement ?element ; rdfs:label ?spaceLabel .
        ficr:req_pg1b_wall ficr:hasREI ?requiredREI .
        FILTER(xsd:integer(?actualREI) < xsd:integer(?requiredREI))
        BIND("Horizontal" AS ?direction) BIND("Wall REI Deficit" AS ?issue) BIND("Wall" AS ?assetType)
    }
    UNION
    {
        ?element a/rdfs:subClassOf* ficr:Doorset ; rdfs:label ?elementLabel ; ficr:isObscured true .
        ?space bot:adjacentElement ?element ; rdfs:label ?spaceLabel .
        BIND("Horizontal" AS ?direction) BIND("Door Obscured/Blocked" AS ?issue) BIND("Door" AS ?assetType)
        BIND(0 AS ?actualREI) BIND(1 AS ?requiredREI)
    }
    UNION
    {
        { ?element a ficr:Floor } UNION { ?element a ficr:Slab }
        ?element rdfs:label ?elementLabel ; ficr:hasREI ?actualREI .
        ?space bot:adjacentElement ?element ; rdfs:label ?spaceLabel .
        ficr:req_pg1b_floor ficr:hasREI ?requiredREI .
        FILTER(xsd:integer(?actualREI) < xsd:integer(?requiredREI))
        BIND("Vertical" AS ?direction) BIND("Floor REI Deficit" AS ?issue) BIND("Floor/Slab" AS ?assetType)
    }
    OPTIONAL { ?space ficr:hasFixedAssetValue ?affectedAsset }
}
ORDER BY ?direction ?assetType ?spaceLabel`;

const QUERY_EML = `${QUERY_PREFIXES}
SELECT (xsd:decimal(MAX(?scenarioEML)) AS ?maximumPossibleLoss_EML)
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
}`;

// NOTE: Q4.3 改为构件级不合规率分析，门遮挡作为维护问题单独统计
const QUERY_COMPLIANCE = `${QUERY_PREFIXES}
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
    { SELECT (COUNT(DISTINCT ?w) AS ?tw) WHERE { ?w a ficr:Wall ; ficr:hasREI ?dummy1 . } }
    { SELECT (COUNT(DISTINCT ?ncw) AS ?nw) WHERE {
        ?ncw a ficr:Wall ; ficr:hasREI ?wv . ficr:req_pg1b_wall ficr:hasREI ?wr . FILTER(xsd:integer(?wv) < xsd:integer(?wr))
    } }
    { SELECT (COUNT(DISTINCT ?fl) AS ?tf) WHERE {
        { ?fl a ficr:Floor } UNION { ?fl a ficr:Slab }
        ?fl ficr:hasREI ?dummy2 .
    } }
    { SELECT (COUNT(DISTINCT ?ncf) AS ?nf) WHERE {
        { ?ncf a ficr:Floor } UNION { ?ncf a ficr:Slab }
        ?ncf ficr:hasREI ?fv . ficr:req_pg1b_floor ficr:hasREI ?fr . FILTER(xsd:integer(?fv) < xsd:integer(?fr))
    } }
    { SELECT (COUNT(DISTINCT ?dr) AS ?td) WHERE { ?dr a/rdfs:subClassOf* ficr:Doorset . } }
    { SELECT (COUNT(DISTINCT ?odr) AS ?od) WHERE {
        ?odr a/rdfs:subClassOf* ficr:Doorset ; ficr:isObscured true .
    } }
}`;

// ============================================================
// Theme & Types
// ============================================================
const COLORS = {
    compliant: '#10B981',
    warning: '#F59E0B',
    risk: '#F43F5E',
    neutral: '#64748B',
    primary: '#4F46E5',
};

interface DeficitRow {
    id: string;
    location: string;
    failedElement: string;
    elementCn: string;
    failureDetail: string;
    issueType: 'wall_rei' | 'floor_rei' | 'door_blocked' | 'shaft_unsealed';
    direction: 'horizontal' | 'vertical';
    affectedValue: number;
    actualREI: number;
    requiredREI: number;
}

interface KPIData {
    totalAssets: number;
    eml: number;
    // 构件级不合规率（来自 Q4.3）
    overallNonComplianceRate: number;
    totalComponents: number;
    totalNonCompliant: number;
}

// ============================================================
// Helpers
// ============================================================
function getMitigation(issueType: DeficitRow['issueType']): { en: string; cn: string } {
    switch (issueType) {
        case 'wall_rei':
        case 'floor_rei':
            return {
                en: 'Apply fire-rated intumescent coating or install fire-stop mineral wool to meet required REI.',
                cn: '涂刷防火涂料或安装防火封堵矿棉以满足所需 REI 等级',
            };
        case 'door_blocked':
            return {
                en: 'Clear all physical obstructions immediately and inspect self-closing mechanisms.',
                cn: '立即清理障碍物并检查闭门器状态',
            };
        case 'shaft_unsealed':
            return {
                en: 'Apply professional fire-stopping seals to mechanical penetrations.',
                cn: '对管井穿墙孔洞进行专业防火封堵',
            };
    }
}

function getCriticality(value: number): 'High' | 'Medium' | 'Low' {
    if (value >= 4000) return 'High';
    if (value > 0) return 'Medium';
    return 'Low';
}

function getIssueIcon(issueType: DeficitRow['issueType']) {
    switch (issueType) {
        case 'wall_rei':
        case 'floor_rei':
            return <ShieldAlert size={14} className="shrink-0" />;
        case 'door_blocked':
            return <DoorOpen size={14} className="shrink-0" />;
        case 'shaft_unsealed':
            return <Layers size={14} className="shrink-0" />;
    }
}

function mapIssueToType(issue: string): DeficitRow['issueType'] {
    if (issue?.includes('Wall')) return 'wall_rei';
    if (issue?.includes('Door')) return 'door_blocked';
    if (issue?.includes('Floor')) return 'floor_rei';
    return 'wall_rei'; // Fallback
}

// ============================================================
// Print Types & Style
// ============================================================
type FilterMode = 'all' | 'high' | 'wall' | 'door' | 'floor';
type SortDir = 'asc' | 'desc';

const PRINT_PAGE_STYLE = `
  @page { size: A4 portrait; margin: 18mm 15mm 22mm 15mm; }
  @page {
    @top-center { content: "FiCR Fire Risk Audit — BLD-2024-X1"; font-size: 8pt; color: #94a3b8; font-family: ui-monospace, monospace; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #94a3b8; font-family: ui-monospace, monospace; }
    @bottom-left { content: "Generated: ${new Date().toLocaleDateString('en-GB')}"; font-size: 8pt; color: #94a3b8; font-family: ui-monospace, monospace; }
  }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-size: 11pt; line-height: 1.5; color: #1e293b; }
  .print-wrapper { overflow: visible !important; max-height: none !important; }
  .print-audit-row { page-break-inside: avoid; break-inside: avoid; }
  .no-print { display: none !important; }
`;

// ============================================================
// Main Component
// ============================================================
export const Report: React.FC = () => {
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [isPrintPreparing, setIsPrintPreparing] = useState(false);

    // Data State
    const [kpiData, setKpiData] = useState<KPIData | null>(null);
    const [deficitData, setDeficitData] = useState<DeficitRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const { execute: runSparql } = useSparqlQuery();

    // Data Fetching
    useEffect(() => {
        let mounted = true;

        async function loadData() {
            try {
                setIsLoading(true);
                const [deficits, emlRes, complianceRes] = await Promise.all([
                    runSparql(QUERY_DEFICITS),
                    runSparql(QUERY_EML),
                    runSparql(QUERY_COMPLIANCE)
                ]) as [any[] | null, any[] | null, any[] | null];

                if (!mounted) return;

                if (!deficits || !emlRes || !complianceRes) {
                    throw new Error("Failed to fetch data from GraphDB.");
                }

                // Process Deficits
                const processedDeficits: DeficitRow[] = deficits.map((row: any, idx: number) => ({
                    id: `DEF-${String(idx + 1).padStart(3, '0')}`,
                    location: row.spaceLabel || 'Unknown',
                    failedElement: row.elementLabel || 'Unknown Element',
                    elementCn: row.elementLabel || '未知构件',
                    failureDetail: row.issue === 'Door Obscured/Blocked'
                        ? 'Door Blocked Open'
                        : `REI ${row.actualREIValue} < ${row.requiredREIValue} mins`,
                    issueType: mapIssueToType(row.issue),
                    direction: (row.direction?.toLowerCase() as any) || 'horizontal',
                    affectedValue: row.affectedAssetValue || 0,
                    actualREI: row.actualREIValue || 0,
                    requiredREI: row.requiredREIValue || 0
                }));
                setDeficitData(processedDeficits);

                // Process KPIs — Q4.3 现在返回构件级不合规率
                const emVal = emlRes[0]?.maximumPossibleLoss_EML || 0;
                const compData = complianceRes[0] || {};

                setKpiData({
                    totalAssets: 0, // NOTE: 总资产值现由 Q1.2 提供，不再从 Q4.3 获取
                    eml: emVal,
                    overallNonComplianceRate: parseFloat((compData.overallNonComplianceRate || 0).toFixed(2)),
                    totalComponents: compData.totalComponents || 0,
                    totalNonCompliant: compData.totalNonCompliant || 0
                });

            } catch (err: any) {
                if (mounted) setFetchError(err.message || "Failed to load report data");
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
    }, [runSparql]);

    const printRef = useRef<HTMLDivElement>(null);

    // Derived Data
    const filterButtons: { key: FilterMode; label: string }[] = [
        { key: 'all', label: 'All Issues / 全部' },
        { key: 'wall', label: 'Walls / 墙体' },
        { key: 'door', label: 'Doors / 防火门' },
        { key: 'floor', label: 'Floors / 楼板' },
    ];

    const processedData = useMemo(() => {
        let data = [...deficitData];
        switch (filter) {
            case 'high':
                data = data.filter(r => getCriticality(r.affectedValue) === 'High');
                break;
            case 'wall':
                data = data.filter(r => r.issueType === 'wall_rei');
                break;
            case 'door':
                data = data.filter(r => r.issueType === 'door_blocked');
                break;
            case 'floor':
                data = data.filter(r => r.issueType === 'floor_rei');
                break;
        }
        data.sort((a, b) =>
            sortDir === 'desc'
                ? b.affectedValue - a.affectedValue
                : a.affectedValue - b.affectedValue
        );
        return data;
    }, [deficitData, sortDir, filter]);

    const printData = useMemo(() => {
        const copy = [...deficitData];
        copy.sort((a, b) => b.affectedValue - a.affectedValue);
        return copy;
    }, [deficitData]);

    const chartData = useMemo(() => {
        const walls = deficitData.filter(r => r.issueType === 'wall_rei').reduce((acc, r) => acc + r.affectedValue, 0);
        const doors = deficitData.filter(r => r.issueType === 'door_blocked').reduce((acc, r) => acc + r.affectedValue, 0);
        const floors = deficitData.filter(r => r.issueType === 'floor_rei').reduce((acc, r) => acc + r.affectedValue, 0);

        return [
            { name: 'Walls', value: walls, color: COLORS.risk },
            { name: 'Doors', value: doors, color: COLORS.warning },
            { name: 'Floors', value: floors, color: COLORS.primary } // Fallback color
        ].filter(d => d.value > 0);
    }, [deficitData]);

    const sidebarMetrics = useMemo(() => {
        const vulnerableSpaces = new Set(deficitData.map(d => d.location)).size;

        // Find top category
        const counts = {
            'Walls': deficitData.filter(r => r.issueType === 'wall_rei').length,
            'Doors': deficitData.filter(r => r.issueType === 'door_blocked').length,
            'Floors': deficitData.filter(r => r.issueType === 'floor_rei').length
        };
        const topCategory = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

        return {
            totalDeficits: deficitData.length,
            vulnerableSpaces,
            topCategory,
            totalExposure: deficitData.reduce((sum, d) => sum + d.affectedValue, 0)
        };
    }, [deficitData, kpiData]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'FiCR_Fire_Risk_Audit_Report',
        pageStyle: PRINT_PAGE_STYLE,
        onBeforePrint: async () => {
            setIsPrintPreparing(true);
            await new Promise(resolve => setTimeout(resolve, 500));
        },
        onAfterPrint: () => setIsPrintPreparing(false),
    });

    const toggleSort = () => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    const toggleExpand = (id: string) => setExpandedRow(prev => (prev === id ? null : id));



    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 size={48} className="animate-spin text-indigo-600 mx-auto" />
                    <p className="text-slate-500 font-medium">Fetching Live Data from GraphDB...</p>
                    <p className="text-xs text-slate-400">Endpoint: /api/graphdb</p>
                </div>
            </div>
        );
    }

    if (fetchError || !kpiData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Card className="max-w-md p-8 text-center border-rose-200">
                    <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Connection Failed</h3>
                    <p className="text-slate-600 mb-6">{fetchError || "Unable to load data."}</p>
                    <div className="text-xs text-left bg-slate-100 p-4 rounded text-slate-500 font-mono">
                        Troubleshooting:<br />
                        1. Ensure GraphDB is running at localhost:7200<br />
                        2. Check if 'FiCR' repository is active<br />
                        3. Verify vite.config.ts proxy settings
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white print:bg-white">
            {/* ================= SCREEN DISPLAY ================= */}
            <header className="border-b border-slate-200 sticky top-0 z-30 bg-white/95 backdrop-blur-sm print:static">
                <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-md print:shadow-none">
                            <Building2 size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Fire Risk Audit & Mitigation Report
                            </h1>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                                建筑消防风险审计与整改报告 (Live Data)
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                                <span>ID: BLD-2024-X1</span>
                                <span>•</span>
                                <span>{new Date().toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 print:hidden">
                        <div className="text-right mr-2">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                                Global Risk Grade
                            </div>
                            <div className={`text-lg font-bold font-mono ${kpiData.overallNonComplianceRate > 30 ? 'text-rose-600' : kpiData.overallNonComplianceRate > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {kpiData.overallNonComplianceRate < 10 ? 'A — Low' : kpiData.overallNonComplianceRate < 30 ? 'B — Moderate' : 'C — High'}
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handlePrint()}
                            disabled={isPrintPreparing}
                        >
                            {isPrintPreparing ? (
                                <>
                                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                                    Preparing...
                                </>
                            ) : (
                                <>
                                    <Download size={14} className="mr-1.5" />
                                    Export PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 space-y-12 font-sans">
                {/* ========== Section 1: Executive Summary ========== */}
                <section>
                    <SectionHeader en="Executive Summary: Financial Impact" cn="执行摘要：财务影响" borderColor="border-indigo-500" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <KpiCard
                            label="Total Components / 总构件数"
                            value={`${kpiData.totalComponents}`}
                            desc="Total fire safety components (Walls + Floors + Doors) from Q4.3"
                            icon={<ShieldCheck size={16} className="text-emerald-500" />}
                            valueColor="text-slate-900"
                        />
                        <KpiCard
                            label="EML / 估计最大损失"
                            value={`£${(kpiData.eml / 1000).toFixed(0)}k`}
                            desc="Worst-case single-scenario loss from Q4.2"
                            icon={<AlertTriangle size={16} className="text-rose-500" />}
                            valueColor="text-rose-600"
                            glossary="Estimated Maximum Loss：单次最严重火灾场景下的预估最大损失金额"
                        />
                        <KpiCard
                            label="Non-Compliance Rate / 不合规率"
                            value={`${kpiData.overallNonComplianceRate}%`}
                            desc={`${kpiData.totalNonCompliant} of ${kpiData.totalComponents} components non-compliant (Q4.3)`}
                            icon={<TrendingUp size={16} className="text-amber-500" />}
                            valueColor="text-amber-600"
                            glossary="Component Non-Compliance Rate：消防构件中不合规比例（门遮挡单独统计为维护问题）"
                            badge={<Badge variant={kpiData.overallNonComplianceRate > 30 ? 'warning' : kpiData.overallNonComplianceRate > 10 ? 'warning' : 'success'}>{kpiData.overallNonComplianceRate < 10 ? 'Low' : kpiData.overallNonComplianceRate < 30 ? 'Moderate' : 'High'}</Badge>}
                        />
                    </div>
                </section>

                {/* ========== Section 2: Actionable Audit List (Screen) ========== */}
                <section>
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
                        <SectionHeader en="Actionable Audit List" cn="可操作审计清单 · Deficit Catalog" borderColor="border-amber-500" />
                        <div className="flex items-center gap-2 print:hidden">
                            <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                                <FileSpreadsheet size={14} className="mr-1.5" />
                                Export
                            </Button>
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
                        <Filter size={14} className="text-slate-400" />
                        {filterButtons.map(fb => (
                            <button
                                key={fb.key}
                                onClick={() => setFilter(fb.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === fb.key
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                {fb.label}
                            </button>
                        ))}
                        <span className="text-[11px] text-slate-400 ml-2">
                            {processedData.length} of {deficitData.length} items
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Main Scrollable List */}
                        <div className="lg:col-span-3">
                            <Card className="border border-slate-200 shadow-sm overflow-hidden">
                                <AuditListHeader onSort={toggleSort} />
                                <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
                                    {processedData.length === 0 && <EmptyState />}
                                    {processedData.map((row, idx) => (
                                        <AuditRow
                                            key={row.id}
                                            row={row}
                                            idx={idx}
                                            isExpanded={expandedRow === row.id}
                                            onToggle={() => toggleExpand(row.id)}
                                        />
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-4">
                            <Card className="border border-slate-200 shadow-sm p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                                    Risk Distribution by Element / 构件风险分布
                                </h4>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`} />
                                            <Tooltip
                                                formatter={(val: number | undefined) => [val ? `£${val.toLocaleString()}` : '£0', 'Asset Value']}
                                                cursor={{ fill: '#f1f5f9' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-center text-slate-400 mt-2">
                                    Weighted by Asset Value at Stake (波及资产价值)
                                </p>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm p-4 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Vulnerable Room Statistics / 空间风险统计</h4>
                                <div className="space-y-2">
                                    <StatRow label="Total Deficits / 缺陷总数" value={`${sidebarMetrics.totalDeficits}`} />
                                    <StatRow label="Vulnerable Spaces / 受影响空间" value={`${sidebarMetrics.vulnerableSpaces}`} />
                                    <StatRow label="Asset Exposure / 风险暴露总值" value={`£${(sidebarMetrics.totalExposure / 1_000_000).toFixed(2)}M`} color="text-rose-600" />
                                    <StatRow label="Top Risk Category / 主要风险类别" value={sidebarMetrics.topCategory} color="text-slate-900" />
                                </div>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm p-4 bg-indigo-50/50">
                                <div className="flex items-center gap-2 text-indigo-700 mb-2">
                                    <Info size={14} />
                                    <span className="text-xs font-bold uppercase">Space-Centric Analysis</span>
                                </div>
                                <p className="text-xs text-indigo-600 leading-relaxed">
                                    This report highlights rooms with the highest financial exposure. Prioritize mitigation in <strong>{sidebarMetrics.topCategory}</strong> to reduce overall non-compliance rate.
                                </p>
                            </Card>
                        </div>
                    </div>
                </section>

                <footer className="text-center text-slate-400 text-xs py-8 print:hidden border-t border-slate-100 mt-8">
                    <p>Building Fire Risk Intelligence • Powered by FiCR Ontology & SPARQL Engine</p>
                </footer>
            </main>

            {/* ================= HIDDEN PRINT WRAPPER ================= */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {kpiData && (
                    <div ref={printRef} className="print-wrapper" style={{ background: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        <PrintableReport data={printData} kpi={kpiData} />
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================
// PrintableReport — 打印专用完整报告
// ============================================================
function PrintableReport({ data, kpi }: { data: DeficitRow[]; kpi: KPIData }) {
    const today = new Date().toLocaleDateString('en-GB');

    return (
        <div style={{ padding: '0', fontSize: '11pt', lineHeight: '1.6', color: '#1e293b' }}>
            {/* ===== Print Header ===== */}
            <div style={{ borderBottom: '2px solid #4F46E5', paddingBottom: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '18pt', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            Fire Risk Audit & Mitigation Report
                        </h1>
                        <p style={{ fontSize: '10pt', color: '#64748b', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                            建筑消防风险审计与整改报告
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: 'monospace' }}>
                            <div>ID: BLD-2024-X1</div>
                            <div>Date: {today}</div>
                        </div>
                        <div style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '2px 10px',
                            borderRadius: '4px',
                            fontSize: '10pt',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            background: '#FEF3C7',
                            color: '#D97706',
                            border: '1px solid #FDE68A',
                        }}>
                            Grade: B — Moderate
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== KPIs ===== */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
                <PrintKpiBox label="Total Components / 总构件数" value={`${kpi.totalComponents}`} accent="#10B981" />
                <PrintKpiBox label="EML / 估计最大损失" value={`£${(kpi.eml / 1000).toFixed(0)}k`} accent="#F43F5E" />
                <PrintKpiBox label="Non-Compliance Rate / 不合规率" value={`${kpi.overallNonComplianceRate}%`} accent="#F59E0B" />
            </div>

            {/* ===== Audit Catalog Section Header ===== */}
            <div style={{ borderLeft: '4px solid #F59E0B', paddingLeft: '12px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: '#0f172a' }}>
                    Actionable Audit List
                </h2>
                <p style={{ fontSize: '9pt', color: '#64748b', margin: '2px 0 0 0' }}>
                    可操作审计清单 · {data.length} items total
                </p>
            </div>

            {/* ===== Full Audit Table ===== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                        <th style={thStyle}>Priority</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Element / 构件</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Location / 位置</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Deficit Detail / 缺陷详情</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Value / 波及价值</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => {
                        const crit = getCriticality(row.affectedValue);
                        const mitigation = getMitigation(row.issueType);

                        return (
                            <React.Fragment key={row.id}>
                                {/* 主数据行 — 禁止分页截断 */}
                                <tr className="print-audit-row" style={{
                                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                                    borderBottom: '1px solid #E2E8F0',
                                    pageBreakInside: 'avoid',
                                }}>
                                    <td style={{ ...tdStyle, textAlign: 'center', width: '60px' }}>
                                        <PrintBadge level={crit} />
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.failedElement}</div>
                                        <div style={{ fontSize: '8pt', color: '#94a3b8' }}>{row.elementCn}</div>
                                    </td>
                                    <td style={tdStyle}>@ {row.location}</td>
                                    <td style={tdStyle}>
                                        <span style={{ color: row.issueType === 'door_blocked' ? '#B45309' : '#DC2626', fontWeight: 600 }}>
                                            {row.failureDetail}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                                        {row.affectedValue > 0 ? `£${row.affectedValue.toLocaleString()}` : '— Life Safety'}
                                    </td>
                                </tr>
                                {/* 整改建议行 — 自动展开 */}
                                <tr className="print-audit-row" style={{ pageBreakInside: 'avoid' }}>
                                    <td colSpan={5} style={{ padding: '6px 12px 10px 72px', backgroundColor: '#EEF2FF', borderBottom: '1px solid #C7D2FE' }}>
                                        <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', color: '#4338CA', letterSpacing: '0.05em', marginBottom: '3px' }}>
                                            ✦ Mitigation Strategy / 整改建议
                                        </div>
                                        <div style={{ fontSize: '9.5pt', color: '#334155' }}>
                                            ✔ {mitigation.en}
                                        </div>
                                        <div style={{ fontSize: '9pt', color: '#64748b' }}>
                                            {mitigation.cn}
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            {/* ===== Summary Stats ===== */}
            <div style={{ marginTop: '24px', padding: '12px 16px', backgroundColor: '#F1F5F9', borderRadius: '8px', display: 'flex', gap: '32px', fontSize: '9.5pt' }}>
                <div><strong>Total Items:</strong> {data.length}</div>
                <div><strong>High Priority:</strong> {data.filter(r => getCriticality(r.affectedValue) === 'High').length}</div>
                <div><strong>Total Exposure:</strong> £{data.reduce((s, r) => s + r.affectedValue, 0).toLocaleString()}</div>
                <div><strong>Horizontal:</strong> {data.filter(r => r.direction === 'horizontal').length}</div>
                <div><strong>Vertical:</strong> {data.filter(r => r.direction === 'vertical').length}</div>
            </div>

            {/* ===== Print Footer ===== */}
            <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #E2E8F0', textAlign: 'center', fontSize: '8pt', color: '#94a3b8' }}>
                Building Fire Risk Intelligence • Powered by FiCR Ontology & SPARQL Engine • Generated {today}
            </div>
        </div>
    );
}

// 打印表格辅助样式
const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '8pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#64748b',
    textAlign: 'center',
};
const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    verticalAlign: 'top',
};

/** 打印专用 Badge */
function PrintBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        High: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
        Medium: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
        Low: { bg: '#F1F5F9', text: '#64748b', border: '#E2E8F0' },
    };
    const c = colors[level];
    return (
        <span style={{
            display: 'inline-block',
            padding: '1px 6px',
            borderRadius: '3px',
            fontSize: '8pt',
            fontWeight: 700,
            background: c.bg,
            color: c.text,
            border: `1px solid ${c.border}`,
        }}>
            {level}
        </span>
    );
}

/** 打印专用 KPI 框 */
function PrintKpiBox({ label, value, accent }: { label: string; value: string; accent: string }) {
    return (
        <div style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            backgroundColor: '#F8FAFC',
        }}>
            <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '4px' }}>
                {label}
            </div>
            <div style={{ fontSize: '22pt', fontWeight: 800, fontFamily: 'monospace', color: accent, letterSpacing: '-0.03em' }}>
                {value}
            </div>
        </div>
    );
}

// ============================================================
// Shared Sub-components (Screen + Print)
// ============================================================

/** 统一的双语 Section Header */
function SectionHeader({ en, cn, borderColor }: { en: string; cn: string; borderColor: string }) {
    return (
        <div className={`border-l-4 ${borderColor} pl-4`}>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{en}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{cn}</p>
        </div>
    );
}

/** Glossary Tooltip */
function GlossaryTip({ term }: { term: string }) {
    return (
        <span className="group relative cursor-help inline-flex">
            <Info size={11} className="text-slate-400" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-slate-800 text-white text-[11px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                {term}
            </span>
        </span>
    );
}

/** Criticality Badge (Screen) */
function CriticalityBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
    const styles: Record<string, string> = {
        High: 'bg-rose-100 text-rose-700 border-rose-200',
        Medium: 'bg-amber-100 text-amber-700 border-amber-200',
        Low: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${styles[level]}`}>
            {level}
        </span>
    );
}

/** Stat Row */
function StatRow({ label, value, color = 'text-slate-700' }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">{label}</span>
            <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
        </div>
    );
}

/** KPI Card */
function KpiCard({ label, value, desc, icon, valueColor, glossary, badge }: {
    label: string;
    value: string;
    desc: string;
    icon: React.ReactNode;
    valueColor: string;
    glossary?: string;
    badge?: React.ReactNode;
}) {
    return (
        <Card className="p-6 bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    {label}
                    {glossary && <GlossaryTip term={glossary} />}
                </span>
                {icon}
            </div>
            <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-mono font-bold tracking-tighter ${valueColor}`}>
                    {value}
                </span>
                {badge}
            </div>
            <p className="text-xs text-slate-500 mt-2">{desc}</p>
        </Card>
    );
}

/** Audit List Column Headers */
function AuditListHeader({ onSort }: { onSort: () => void }) {
    return (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-3">Space / Element</div>
            <div className="col-span-1"></div>
            <div className="col-span-4">Deficit Detail / 缺陷详情</div>
            <div className="col-span-2 text-right cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={onSort}>
                <span className="inline-flex items-center gap-1">
                    Risk Value
                    <ArrowUpDown size={11} />
                </span>
            </div>
            <div className="col-span-1 text-center">View</div>
        </div>
    );
}

/** Empty State */
function EmptyState() {
    return (
        <div className="px-4 py-12 text-center text-sm text-slate-400">
            No items match the current filter. / 当前筛选条件下无匹配项。
        </div>
    );
}

/** 单行审计记录 */
function AuditRow({ row, idx, isExpanded, onToggle }: {
    row: DeficitRow;
    idx: number;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const crit = getCriticality(row.affectedValue);
    const mitigation = getMitigation(row.issueType);
    const isEven = idx % 2 === 0;

    return (
        <div>
            <div className={`px-4 py-3 grid grid-cols-12 gap-2 items-center border-b border-slate-100 transition-colors hover:bg-indigo-50/30 cursor-default ${isEven ? 'bg-white' : 'bg-slate-50/40'}`}>
                <div className="col-span-1 flex justify-center">
                    <CriticalityBadge level={crit} />
                </div>
                {/* Refactored Space/Element Column */}
                <div className="col-span-4 flex flex-col justify-center">
                    <span className="text-sm font-bold text-slate-800">{row.location}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`${row.issueType === 'wall_rei' ? 'text-rose-500' : row.issueType === 'door_blocked' ? 'text-orange-500' : 'text-slate-400'}`}>
                            {getIssueIcon(row.issueType)}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{row.failedElement}</span>
                    </div>
                </div>

                <div className="col-span-4">
                    {/* 2024-02-11: Updated to show precise failure detail from live data if possible, else generic string */}
                    <div className="flex flex-col">
                        <span className={`text-[11px] uppercase font-semibold tracking-wider ${row.issueType === 'door_blocked' ? 'text-orange-600' : 'text-rose-600'}`}>
                            {row.issueType === 'wall_rei' ? 'Wall REI Fail' : row.issueType === 'floor_rei' ? 'Floor REI Fail' : 'Door Issue'}
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                            {row.failureDetail}
                        </span>
                    </div>
                </div>
                <div className="col-span-2 text-right">
                    <span className="text-sm font-mono font-bold text-slate-900 block">
                        {row.affectedValue > 0 ? `£${row.affectedValue.toLocaleString()}` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Asset Value</span>
                </div>
                <div className="col-span-1 text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggle()}
                        className={`h-7 w-7 p-0 rounded-full ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                </div>
            </div>

            {/* Mitigation Drawer */}
            {isExpanded && (
                <div className="bg-indigo-50/50 border-b border-indigo-100 px-12 py-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex gap-4">
                        <div className="shrink-0 mt-1">
                            <Wrench size={16} className="text-indigo-500" />
                        </div>
                        <div>
                            <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                                Mitigation Strategy / 整改建议
                            </h5>
                            <p className="text-sm text-slate-700 leading-relaxed mb-1">
                                {mitigation.en}
                            </p>
                            <p className="text-xs text-slate-500">
                                {mitigation.cn}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
