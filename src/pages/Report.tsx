import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, Button, Badge } from '../components/shared';
import {
    Building2,
    AlertTriangle,
    Download,
    ShieldAlert,
    DoorOpen,
    Layers,
    Filter,
    Loader2,
    ChevronUp,
    ChevronDown,
    Wrench,
    Shield,
    AlertCircle
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useSparqlQuery } from '../hooks/useSparqlQuery';
import { PRESET_GROUPS } from '../content/queries';

// ============================================================
// Queries
// ============================================================
const getQuery = (labelStarter: string) => {
    for (const group of PRESET_GROUPS) {
        for (const q of group.queries) {
            if (q.label.startsWith(labelStarter)) return q.query;
        }
    }
    return '';
};

// ============================================================
// Theme & Types
// ============================================================


interface DeficitRow {
    id: string;
    direction: string;
    assetType: string;
    elementLabel: string;
    complianceStatus: string;
    issue: string;
    issueCn: string;
    spaceLabel: string;
    actualREI: number;
    requiredREI: number;
}

interface KPIData {
    totalWalls: number;
    nonCompliantWalls: number;
    wallNonComplianceRate: number;
    totalFloors: number;
    nonCompliantFloors: number;
    floorNonComplianceRate: number;
    totalDoors: number;
    obscuredDoors: number;
    doorObstructionRate: number;
    totalComponents: number;
    totalNonCompliant: number;
    overallNonComplianceRate: number;
}

interface RiskUnitPriority {
    ruLabel: string;
    totalAssumptions: number;
    unknownCount: number;
    compromisedCount: number;
    evidenceGapCount: number;
    installStatus: string;
    alarmStatus: string;
}

// ============================================================
// Helpers
// ============================================================
function getMitigation(issueType: string): { en: string; cn: string } {
    if (issueType.includes('Wall') || issueType.includes('Floor') || issueType.includes('Slab')) {
        return {
            en: 'Apply fire-rated intumescent coating or install fire-stop mineral wool to meet required REI.',
            cn: '涂刷防火涂料或安装防火封堵矿棉以满足所需 REI 等级',
        };
    }
    if (issueType.includes('Door')) {
        return {
            en: 'Clear all physical obstructions immediately and inspect self-closing mechanisms.',
            cn: '立即清理障碍物并检查闭门器状态',
        };
    }
    return {
        en: 'Inspect and consult with fire safety engineer.',
        cn: '检查并咨询消防安全工程师',
    };
}

function getIssueIcon(issueType: string) {
    if (issueType.includes('Wall') || issueType.includes('Floor') || issueType.includes('Slab')) {
        return <ShieldAlert size={14} className="shrink-0" />;
    }
    if (issueType.includes('Door')) {
        return <DoorOpen size={14} className="shrink-0" />;
    }
    return <AlertTriangle size={14} className="shrink-0" />;
}

// ============================================================
// Print Types & Style
// ============================================================
type FilterMode = 'all' | 'wall' | 'door' | 'floor';

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
    const [filter, setFilter] = useState<FilterMode>('all');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [isPrintPreparing, setIsPrintPreparing] = useState(false);

    // Data State
    const [kpiData, setKpiData] = useState<KPIData | null>(null);
    const [deficitData, setDeficitData] = useState<DeficitRow[]>([]);
    const [riskUnits, setRiskUnits] = useState<RiskUnitPriority[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const { execute: runSparql } = useSparqlQuery();

    // Data Fetching
    useEffect(() => {
        let mounted = true;

        async function loadData() {
            try {
                setIsLoading(true);
                const queryB1 = getQuery('B1:');
                const queryB2 = getQuery('B2:');
                const queryC7 = getQuery('C7:');

                if (!queryB1 || !queryB2 || !queryC7) {
                    throw new Error("Required SPARQL queries not found in PRESET_GROUPS.");
                }

                const [resB1, resB2, resC7] = await Promise.all([
                    runSparql(queryB1),
                    runSparql(queryB2),
                    runSparql(queryC7)
                ]) as [any[] | null, any[] | null, any[] | null];

                if (!mounted) return;

                if (!resB1 || !resB2 || !resC7) {
                    throw new Error("Failed to fetch data from GraphDB.");
                }

                // Process B1 KPI Metrics
                let tw = 0, nw = 0, tf = 0, nf = 0, td = 0, od = 0;
                resB1.forEach((row: any) => {
                    const c = parseInt(row.count) || 0;
                    const cat = row.category || '';
                    const stat = row.status || '';
                    if (cat.includes('Wall')) { tw += c; if (stat.includes('Non-Compliant')) nw += c; }
                    if (cat.includes('Slab')) { tf += c; if (stat.includes('Non-Compliant')) nf += c; }
                    if (cat.includes('Doorset')) { td += c; if (stat.includes('Non-Compliant')) od += c; }
                });
                const totalComponents = tw + tf + td;
                const totalNonCompliant = nw + nf + od;
                setKpiData({
                    totalWalls: tw,
                    nonCompliantWalls: nw,
                    wallNonComplianceRate: tw > 0 ? parseFloat(((nw * 100) / tw).toFixed(2)) : 0,
                    totalFloors: tf,
                    nonCompliantFloors: nf,
                    floorNonComplianceRate: tf > 0 ? parseFloat(((nf * 100) / tf).toFixed(2)) : 0,
                    totalDoors: td,
                    obscuredDoors: od,
                    doorObstructionRate: td > 0 ? parseFloat(((od * 100) / td).toFixed(2)) : 0,
                    totalComponents,
                    totalNonCompliant,
                    overallNonComplianceRate: totalComponents > 0 ? parseFloat(((totalNonCompliant * 100) / totalComponents).toFixed(2)) : 0
                });

                // Process B2 Deficits
                const processedDeficits: DeficitRow[] = resB2.map((row: any, idx: number) => ({
                    id: `DEF-${String(idx + 1).padStart(3, '0')}`,
                    direction: row.direction || 'Unknown',
                    assetType: row.assetType || 'Unknown',
                    elementLabel: row.elementLabel || 'Unknown Element',
                    complianceStatus: row.complianceStatus || 'Compliant',
                    issue: row.issue === '--' ? 'Compliant' : row.issue,
                    issueCn: row.issue.includes('Obscured') ? '门被遮挡' : row.issue.includes('Deficit') ? '防火等级不足' : '正常',
                    spaceLabel: row.spaceLabel || 'Unknown',
                    actualREI: parseInt(row.actualREI) || 0,
                    requiredREI: parseInt(row.requiredREI) || 0
                }));
                // We only want non-compliant ones for the audit list.
                setDeficitData(processedDeficits.filter(d => d.complianceStatus !== 'Compliant'));

                // Process C7 Risk Units First
                const processedRiskUnits: RiskUnitPriority[] = resC7.map((row: any) => ({
                    ruLabel: row.ruLabel,
                    totalAssumptions: parseInt(row.totalAssumptions) || 0,
                    unknownCount: parseInt(row.unknownCount) || 0,
                    compromisedCount: parseInt(row.compromisedCount) || 0,
                    evidenceGapCount: parseInt(row.evidenceGapCount) || 0,
                    installStatus: row.installStatus || 'Unknown',
                    alarmStatus: row.alarmStatus || 'Unknown'
                }));
                setRiskUnits(processedRiskUnits);

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

    const filterButtons: { key: FilterMode; label: string }[] = [
        { key: 'all', label: 'All Issues / 全部' },
        { key: 'wall', label: 'Walls / 墙体' },
        { key: 'door', label: 'Doors / 防火门' },
        { key: 'floor', label: 'Floors / 楼板' },
    ];

    const processedData = useMemo(() => {
        let data = [...deficitData];
        switch (filter) {
            case 'wall':
                data = data.filter(r => r.assetType.includes('Wall'));
                break;
            case 'door':
                data = data.filter(r => r.assetType.includes('Door'));
                break;
            case 'floor':
                data = data.filter(r => r.assetType.includes('Slab') || r.assetType.includes('Floor'));
                break;
        }
        return data;
    }, [deficitData, filter]);

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
                {/* ========== Section 1: Executive Summary (B1) ========== */}
                <section>
                    <SectionHeader en="Global Compliance Health" cn="全局合规健康概况 (B1)" borderColor="border-emerald-500" />
                    <p className="text-xs text-slate-500 mt-2 mb-4">
                        Door obstruction is tracked separately as a maintenance issue, not a structural fire spread trigger.
                        门遮挡单独作为维护问题统计，不纳入结构性不合规。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        {/* Overall Rate */}
                        <Card className="border border-slate-200 shadow-sm p-4 bg-gradient-to-br from-slate-50 to-slate-100">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Overall / 综合不合规率</div>
                            <div className={`text-2xl font-bold font-mono ${kpiData.overallNonComplianceRate > 30 ? 'text-rose-600' : kpiData.overallNonComplianceRate > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {kpiData.overallNonComplianceRate}%
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                                {kpiData.totalNonCompliant} / {kpiData.totalComponents} Deficits
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${kpiData.overallNonComplianceRate > 30 ? 'bg-rose-500' : kpiData.overallNonComplianceRate > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(kpiData.overallNonComplianceRate, 100)}%` }}
                                />
                            </div>
                        </Card>

                        {/* Walls */}
                        <Card className="border border-slate-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldAlert size={14} className="text-rose-500" />
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Walls / 墙体缺陷率</span>
                            </div>
                            <div className={`text-xl font-bold font-mono ${kpiData.wallNonComplianceRate > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {kpiData.wallNonComplianceRate}%
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                                {kpiData.nonCompliantWalls} / {kpiData.totalWalls} walls (REI fail)
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-rose-500" style={{ width: `${Math.min(kpiData.wallNonComplianceRate, 100)}%` }} />
                            </div>
                        </Card>

                        {/* Floors */}
                        <Card className="border border-slate-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Layers size={14} className="text-indigo-500" />
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Floors / 楼板缺陷率</span>
                            </div>
                            <div className={`text-xl font-bold font-mono ${kpiData.floorNonComplianceRate > 0 ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                {kpiData.floorNonComplianceRate}%
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                                {kpiData.nonCompliantFloors} / {kpiData.totalFloors} floors (REI fail)
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(kpiData.floorNonComplianceRate, 100)}%` }} />
                            </div>
                        </Card>

                        {/* Doors */}
                        <Card className="border border-slate-200 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <DoorOpen size={14} className="text-amber-500" />
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Doors / 遮挡维修率</span>
                            </div>
                            <div className={`text-xl font-bold font-mono ${kpiData.doorObstructionRate > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {kpiData.doorObstructionRate}%
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                                {kpiData.obscuredDoors} / {kpiData.totalDoors} doors (obscured)
                            </div>
                            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${Math.min(kpiData.doorObstructionRate, 100)}%` }} />
                            </div>
                        </Card>
                    </div>
                </section>

                {/* ========== Section 2: Conservative Confidence Assessment (C7) ========== */}
                <section>
                    <div className="mb-4">
                        <SectionHeader en="Risk Unit Conservative Confidence Assessment" cn="风险隔离单元置信度审计 (C7: Worst-First)" borderColor="border-rose-500" />
                        <p className="text-xs text-slate-500 mt-2">
                            FiCR 设计理念: 优先暴露最不利单元与证据缺口，避免因资产数据缺失而低估风险。
                            排序依据：证据缺口数目与未知状态数目。
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {riskUnits.map((ru, idx) => (
                            <Card key={ru.ruLabel} className={`p-5 border ${idx === 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 bg-white'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${idx === 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {idx === 0 ? <AlertCircle size={18} /> : <Shield size={18} />}
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 break-all pr-2">
                                            {ru.ruLabel.split('#')[1] || ru.ruLabel}
                                        </h3>
                                    </div>
                                    <Badge variant={idx === 0 ? 'warning' : 'neutral'}>Priority {idx + 1}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <StatRow label="Evidence Gaps / 审计缺口" value={`${ru.evidenceGapCount}`} color={ru.evidenceGapCount > 0 ? "text-rose-600" : "text-emerald-600"} />
                                        <StatRow label="Unknown Cond. / 未知状态" value={`${ru.unknownCount}`} color={ru.unknownCount > 0 ? "text-amber-600" : "text-emerald-600"} />
                                        <StatRow label="Compromised / 确认失效" value={`${ru.compromisedCount}`} color={ru.compromisedCount > 0 ? "text-rose-600" : "text-emerald-600"} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <StatRow label="Total Assumptions" value={`${ru.totalAssumptions}`} color="text-slate-900" />
                                        <StatRow label="Sprinkler" value={ru.installStatus} color={ru.installStatus.includes('Unsprinklered') ? "text-rose-600" : "text-amber-600"} />
                                        <StatRow label="Fire Alarm" value={ru.alarmStatus} color={ru.alarmStatus.includes('Unknown') ? "text-rose-600" : "text-amber-600"} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* ========== Section 3: Actionable Audit List (B2) ========== */}
                <section>
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
                        <div>
                            <SectionHeader en="Element Compliance Detail" cn="构件级失效明细清单 (B2)" borderColor="border-amber-500" />
                            <p className="text-xs text-slate-500 mt-2">Displaying architectural non-compliance elements.</p>
                        </div>
                    </div>

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

                    <Card className="border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            <div className="col-span-3">Space / Element</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-4">Issue Description / 缺陷类型</div>
                            <div className="col-span-2 text-right">Required vs Actual (REI)</div>
                            <div className="col-span-1 text-center">Action</div>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent' }}>
                            {processedData.length === 0 && (
                                <div className="px-4 py-12 text-center text-sm text-slate-400">
                                    No items match the current filter.
                                </div>
                            )}
                            {processedData.map((row, idx) => {
                                const isExpanded = expandedRow === row.id;
                                const mitigation = getMitigation(row.assetType);
                                return (
                                    <div key={row.id}>
                                        <div className={`px-4 py-3 grid grid-cols-12 gap-2 items-center border-b border-slate-100 transition-colors hover:bg-indigo-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                            <div className="col-span-3">
                                                <span className="text-sm font-bold text-slate-800">{row.spaceLabel}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-slate-400">{getIssueIcon(row.assetType)}</span>
                                                    <span className="text-xs text-slate-500 font-mono">{row.elementLabel}</span>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 tracking-wide text-slate-600">
                                                    {row.direction} / {row.assetType}
                                                </span>
                                            </div>
                                            <div className="col-span-4 flex flex-col">
                                                <span className={`text-[11px] uppercase font-semibold tracking-wider ${row.assetType.includes('Door') ? 'text-orange-600' : 'text-rose-600'}`}>
                                                    {row.issue}
                                                </span>
                                                <span className="text-xs font-medium text-slate-600">
                                                    {row.issueCn}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-right flex flex-col">
                                                {row.assetType.includes('Door') ? (
                                                    <span className="text-sm font-bold text-orange-600 block">Obscured</span>
                                                ) : (
                                                    <span className="text-sm font-mono font-bold text-rose-600 block">
                                                        {row.actualREI} &lt; {row.requiredREI}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleExpand(row.id)}
                                                    className={`h-7 w-7 p-0 rounded-full ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </Button>
                                            </div>
                                        </div>

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
                            })}
                        </div>
                    </Card>
                </section>

                <footer className="text-center text-slate-400 text-xs py-8 print:hidden border-t border-slate-100 mt-8">
                    <p>Building Fire Risk Intelligence • Powered by FiCR Ontology & SPARQL Engine</p>
                </footer>
            </main>

            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {kpiData && (
                    <div ref={printRef} className="print-wrapper" style={{ background: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        <PrintableReport data={deficitData} kpi={kpiData} riskUnits={riskUnits} />
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================
// PrintableReport — 打印专用完整报告
// ============================================================
function PrintableReport({ data, kpi, riskUnits }: { data: DeficitRow[]; kpi: KPIData, riskUnits: RiskUnitPriority[] }) {
    const today = new Date().toLocaleDateString('en-GB');

    return (
        <div style={{ padding: '0', fontSize: '11pt', lineHeight: '1.6', color: '#1e293b' }}>
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
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
                <PrintKpiBox label="Total Components" value={`${kpi.totalComponents}`} accent="#10B981" />
                <PrintKpiBox label="Non-Compliant" value={`${kpi.totalNonCompliant}`} accent="#F43F5E" />
                <PrintKpiBox label="Non-Compliance Rate" value={`${kpi.overallNonComplianceRate}%`} accent="#F59E0B" />
            </div>

            <div style={{ borderLeft: '4px solid #F43F5E', paddingLeft: '12px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: '#0f172a' }}>
                    Confidence Assessment (Worst-First)
                </h2>
                <p style={{ fontSize: '9pt', color: '#64748b', margin: '2px 0 0 0' }}>
                    风险置信度审计，按证据缺失程度排序
                </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '32px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Risk Unit</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Evidence Gaps</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Unknown Cond.</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Compromised</th>
                    </tr>
                </thead>
                <tbody>
                    {riskUnits.map((ru, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: idx === 0 ? '#FEF2F2' : '#FFF' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{ru.ruLabel.split('#')[1] || ru.ruLabel}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: ru.evidenceGapCount > 0 ? '#DC2626' : '#10B981', fontWeight: 'bold' }}>{ru.evidenceGapCount}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: ru.unknownCount > 0 ? '#D97706' : '#10B981', fontWeight: 'bold' }}>{ru.unknownCount}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: ru.compromisedCount > 0 ? '#DC2626' : '#10B981', fontWeight: 'bold' }}>{ru.compromisedCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ borderLeft: '4px solid #F59E0B', paddingLeft: '12px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, color: '#0f172a' }}>
                    Component Deficit List
                </h2>
                <p style={{ fontSize: '9pt', color: '#64748b', margin: '2px 0 0 0' }}>
                    合规缺陷清单 · {data.length} items
                </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Element / 构件</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Location / 位置</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Issue / 缺陷内容</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Req vs Act</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => {
                        return (
                            <React.Fragment key={row.id}>
                                <tr className="print-audit-row" style={{
                                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                                    borderBottom: '1px solid #E2E8F0',
                                    pageBreakInside: 'avoid',
                                }}>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.elementLabel}</div>
                                        <div style={{ fontSize: '8pt', color: '#94a3b8' }}>{row.assetType}</div>
                                    </td>
                                    <td style={{ padding: '8px' }}>@ {row.spaceLabel}</td>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{ color: row.assetType.includes('Door') ? '#B45309' : '#DC2626', fontWeight: 600 }}>
                                            {row.issue} ({row.issueCn})
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                                        {row.assetType.includes('Door') ? 'Obscured' : `${row.actualREI} < ${row.requiredREI}`}
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #E2E8F0', textAlign: 'center', fontSize: '8pt', color: '#94a3b8' }}>
                Building Fire Risk Intelligence • Powered by FiCR Ontology & SPARQL Engine • Generated {today}
            </div>
        </div>
    );
}

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

function SectionHeader({ en, cn, borderColor }: { en: string; cn: string; borderColor: string }) {
    return (
        <div className={`border-l-4 ${borderColor} pl-4`}>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{en}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{cn}</p>
        </div>
    );
}

function StatRow({ label, value, color = 'text-slate-700' }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">{label}</span>
            <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
        </div>
    );
}
