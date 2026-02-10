import React, { useState, useMemo, useRef } from 'react';
import { Card, Button, Badge } from '../components/shared';
import {
    Building2,
    AlertTriangle,
    Download,
    TrendingUp,
    ShieldCheck,
    Info,
    CheckCircle2,
    ArrowUpDown,
    ShieldAlert,
    DoorOpen,
    Layers,
    ChevronDown,
    ChevronUp,
    Filter,
    FileSpreadsheet,
    Wrench,
    Loader2
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { useReactToPrint } from 'react-to-print';

// ============================================================
// Theme & Constants
// ============================================================
const COLORS = {
    compliant: '#10B981',
    warning: '#F59E0B',
    risk: '#F43F5E',
    neutral: '#64748B',
    primary: '#4F46E5',
};

// ============================================================
// Mock Data — mirrors SPARQL Q1.1, Q2.2, Q4.2, Q4.3
// ============================================================
const KPI = {
    totalAssets: 12500000,
    eml: 318000,
    varRatio: 2.54,
};

/** 合规缺陷目录 — 来自 Q2.2 */
interface DeficitRow {
    id: string;
    location: string;
    failedElement: string;
    elementCn: string;
    failureDetail: string;
    issueType: 'wall_rei' | 'floor_rei' | 'door_blocked' | 'shaft_unsealed';
    direction: 'horizontal' | 'vertical';
    affectedValue: number;
}

const DEFICIT_DATA: DeficitRow[] = [
    { id: 'DEF-001', location: 'Server Room', failedElement: 'Wall W-01', elementCn: '墙体 W-01', failureDetail: 'REI 30 < 60 mins', issueType: 'wall_rei', direction: 'horizontal', affectedValue: 120000 },
    { id: 'DEF-002', location: 'L2-Stairwell B', failedElement: 'Door D-12', elementCn: '防火门 D-12', failureDetail: 'Door Blocked Open', issueType: 'door_blocked', direction: 'horizontal', affectedValue: 0 },
    { id: 'DEF-003', location: 'L3-Server Room', failedElement: 'Floor F-01', elementCn: '楼板 F-01', failureDetail: 'REI 60 < 120 mins', issueType: 'floor_rei', direction: 'vertical', affectedValue: 75000 },
    { id: 'DEF-004', location: 'Corridor A', failedElement: 'Wall W-04', elementCn: '墙体 W-04', failureDetail: 'REI 60 < 90 mins', issueType: 'wall_rei', direction: 'horizontal', affectedValue: 45000 },
    { id: 'DEF-005', location: 'Riser Shaft 2', failedElement: 'Shaft Seal S-02', elementCn: '管井封堵 S-02', failureDetail: 'Unsealed Penetration', issueType: 'shaft_unsealed', direction: 'vertical', affectedValue: 65000 },
    { id: 'DEF-006', location: 'Kitchen', failedElement: 'Wall W-07', elementCn: '墙体 W-07', failureDetail: 'REI 30 < 60 mins', issueType: 'wall_rei', direction: 'horizontal', affectedValue: 85000 },
    { id: 'DEF-007', location: 'L1-Exit Route', failedElement: 'Door D-03', elementCn: '防火门 D-03', failureDetail: 'Door Blocked Open', issueType: 'door_blocked', direction: 'horizontal', affectedValue: 0 },
    { id: 'DEF-008', location: 'Storage A', failedElement: 'Floor F-04', elementCn: '楼板 F-04', failureDetail: 'REI 30 < 60 mins', issueType: 'floor_rei', direction: 'vertical', affectedValue: 35000 },
    { id: 'DEF-009', location: 'Office 201', failedElement: 'Wall W-09', elementCn: '墙体 W-09', failureDetail: 'REI 60 < 90 mins', issueType: 'wall_rei', direction: 'horizontal', affectedValue: 28000 },
    { id: 'DEF-010', location: 'Riser Shaft 1', failedElement: 'Shaft Seal S-01', elementCn: '管井封堵 S-01', failureDetail: 'Unsealed Penetration', issueType: 'shaft_unsealed', direction: 'vertical', affectedValue: 52000 },
    { id: 'DEF-011', location: 'Lobby', failedElement: 'Door D-01', elementCn: '防火门 D-01', failureDetail: 'Door Blocked Open', issueType: 'door_blocked', direction: 'horizontal', affectedValue: 0 },
    { id: 'DEF-012', location: 'L4-Plant Room', failedElement: 'Floor F-06', elementCn: '楼板 F-06', failureDetail: 'REI 60 < 120 mins', issueType: 'floor_rei', direction: 'vertical', affectedValue: 95000 },
];

const RISK_DISTRIBUTION = [
    { name: 'Compliant / 合规', value: 85 },
    { name: 'Minor Deficit / 轻微缺陷', value: 10 },
    { name: 'High Risk / 高风险', value: 5 },
];

// ============================================================
// AI Mitigation Logic — 整改建议映射
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
    if (value >= 60000) return 'High';
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

// ============================================================
// Filter Types
// ============================================================
type FilterMode = 'all' | 'high' | 'horizontal' | 'vertical';
type SortDir = 'asc' | 'desc';

// ============================================================
// Print-specific page style — A4 优化
// NOTE: 此样式仅在打印 iframe 中生效，不影响屏幕显示
// ============================================================
const PRINT_PAGE_STYLE = `
  @page {
    size: A4 portrait;
    margin: 18mm 15mm 22mm 15mm;
  }

  /* 打印模式下的 header/footer 通过 running elements 实现 */
  @page {
    @top-center {
      content: "FiCR Fire Risk Audit — BLD-2024-X1";
      font-size: 8pt;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
    }
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
    }
    @bottom-left {
      content: "Generated: ${new Date().toLocaleDateString('en-GB')}";
      font-size: 8pt;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
    }
  }

  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    font-size: 11pt;
    line-height: 1.5;
    color: #1e293b;
  }

  /* 确保 print wrapper 充满所有页面 */
  .print-wrapper {
    overflow: visible !important;
    max-height: none !important;
  }

  /* 禁止 audit 行被分页截断 */
  .print-audit-row {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* 隐藏交互元素 */
  .no-print {
    display: none !important;
  }
`;

// ============================================================
// Main Component
// ============================================================
export const Report: React.FC = () => {
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [isPrintPreparing, setIsPrintPreparing] = useState(false);

    /** react-to-print 的目标 ref */
    const printRef = useRef<HTMLDivElement>(null);

    // 过滤 + 排序（屏幕显示用）
    const processedData = useMemo(() => {
        let data = [...DEFICIT_DATA];
        switch (filter) {
            case 'high':
                data = data.filter(r => getCriticality(r.affectedValue) === 'High');
                break;
            case 'horizontal':
                data = data.filter(r => r.direction === 'horizontal');
                break;
            case 'vertical':
                data = data.filter(r => r.direction === 'vertical');
                break;
        }
        data.sort((a, b) =>
            sortDir === 'desc'
                ? b.affectedValue - a.affectedValue
                : a.affectedValue - b.affectedValue
        );
        return data;
    }, [sortDir, filter]);

    /**
     * 打印数据 — 始终展示全量、按风险降序排列
     * NOTE: 不受 filter 影响，确保 PDF 中完整展示所有条目
     */
    const printData = useMemo(() => {
        const copy = [...DEFICIT_DATA];
        copy.sort((a, b) => b.affectedValue - a.affectedValue);
        return copy;
    }, []);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'FiCR_Fire_Risk_Audit_Report',
        pageStyle: PRINT_PAGE_STYLE,
        onBeforePrint: async () => {
            setIsPrintPreparing(true);
            // 给 recharts SVG 时间渲染
            await new Promise(resolve => setTimeout(resolve, 500));
        },
        onAfterPrint: () => {
            setIsPrintPreparing(false);
        },
    });

    const toggleSort = () => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    const toggleExpand = (id: string) => setExpandedRow(prev => (prev === id ? null : id));

    const filterButtons: { key: FilterMode; label: string }[] = [
        { key: 'all', label: 'All Issues / 全部' },
        { key: 'high', label: 'High Priority / 高优先' },
        { key: 'horizontal', label: 'Horizontal / 横向' },
        { key: 'vertical', label: 'Vertical / 纵向' },
    ];

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
                                建筑消防风险审计与整改报告
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
                            <div className={`text-lg font-bold font-mono ${KPI.varRatio > 5 ? 'text-rose-600' : KPI.varRatio > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {KPI.varRatio < 2 ? 'A — Low' : KPI.varRatio < 5 ? 'B — Moderate' : 'C — High'}
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
                            label="Total Asset Value / 资产总值"
                            value={`£${(KPI.totalAssets / 1_000_000).toFixed(2)}M`}
                            desc="Sum of all fire compartment asset values from SPARQL Q1.1"
                            icon={<ShieldCheck size={16} className="text-emerald-500" />}
                            valueColor="text-slate-900"
                        />
                        <KpiCard
                            label="EML / 估计最大损失"
                            value={`£${(KPI.eml / 1000).toFixed(0)}k`}
                            desc="Worst-case single-scenario loss from Q4.2"
                            icon={<AlertTriangle size={16} className="text-rose-500" />}
                            valueColor="text-rose-600"
                            glossary="Estimated Maximum Loss：单次最严重火灾场景下的预估最大损失金额"
                        />
                        <KpiCard
                            label="VaR Ratio / 风险资产占比"
                            value={`${KPI.varRatio}%`}
                            desc="EML ÷ Total Asset Value (from Q4.3)"
                            icon={<TrendingUp size={16} className="text-amber-500" />}
                            valueColor="text-amber-600"
                            glossary="Value at Risk Ratio：有多少比例的资产正面临威胁"
                            badge={<Badge variant="warning">Moderate</Badge>}
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
                            {processedData.length} of {DEFICIT_DATA.length} items
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
                                    Risk Distribution / 风险分布
                                </h4>
                                <div className="h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={RISK_DISTRIBUTION} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                                                <Cell fill={COLORS.compliant} />
                                                <Cell fill={COLORS.warning} />
                                                <Cell fill={COLORS.risk} />
                                            </Pie>
                                            <Legend
                                                verticalAlign="bottom"
                                                height={40}
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value: string) => (
                                                    <span className="text-[11px] text-slate-600">{value}</span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm p-4 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">Summary / 统计</h4>
                                <div className="space-y-2">
                                    <StatRow label="Total Items / 缺陷总数" value={`${DEFICIT_DATA.length}`} />
                                    <StatRow label="High Priority / 高优先" value={`${DEFICIT_DATA.filter(r => getCriticality(r.affectedValue) === 'High').length}`} color="text-rose-600" />
                                    <StatRow label="Total Exposure / 总暴露" value={`£${DEFICIT_DATA.reduce((s, r) => s + r.affectedValue, 0).toLocaleString()}`} color="text-slate-900" />
                                    <StatRow label="Horizontal / 横向" value={`${DEFICIT_DATA.filter(r => r.direction === 'horizontal').length}`} />
                                    <StatRow label="Vertical / 纵向" value={`${DEFICIT_DATA.filter(r => r.direction === 'vertical').length}`} />
                                </div>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm p-4 bg-indigo-50/50">
                                <div className="flex items-center gap-2 text-indigo-700 mb-2">
                                    <Info size={14} />
                                    <span className="text-xs font-bold uppercase">Interaction Tip</span>
                                </div>
                                <p className="text-xs text-indigo-600 leading-relaxed">
                                    Click <strong>"Value"</strong> header to sort. Click <strong>▼</strong> to reveal mitigation.
                                    <br />点击"波及价值"列头排序；点击 ▼ 展开整改建议。
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
            {/* 
        NOTE: 此 div 仅供 react-to-print 生成 PDF 使用，屏幕上不可见。
        所有数据全量展示，所有 mitigation 自动展开，无滚动限制。
      */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div ref={printRef} className="print-wrapper" style={{ background: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    <PrintableReport data={printData} />
                </div>
            </div>
        </div>
    );
};

// ============================================================
// PrintableReport — 打印专用完整报告
// NOTE: 此组件仅渲染在 offscreen div 内，由 react-to-print 发送到打印机/PDF
// ============================================================
function PrintableReport({ data }: { data: DeficitRow[] }) {
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
                <PrintKpiBox label="Total Asset Value / 资产总值" value={`£${(KPI.totalAssets / 1_000_000).toFixed(2)}M`} accent="#10B981" />
                <PrintKpiBox label="EML / 估计最大损失" value={`£${(KPI.eml / 1000).toFixed(0)}k`} accent="#F43F5E" />
                <PrintKpiBox label="VaR Ratio / 风险资产占比" value={`${KPI.varRatio}%`} accent="#F59E0B" />
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
            <div className="col-span-3">Element / 构件</div>
            <div className="col-span-2">Location / 位置</div>
            <div className="col-span-3">Deficit Detail / 缺陷详情</div>
            <div className="col-span-2 text-right cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={onSort}>
                <span className="inline-flex items-center gap-1">
                    Value / 波及价值
                    <ArrowUpDown size={11} />
                </span>
            </div>
            <div className="col-span-1 text-center">Action</div>
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
                <div className="col-span-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-indigo-500">{getIssueIcon(row.issueType)}</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{row.failedElement}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">{row.elementCn}</span>
                </div>
                <div className="col-span-2">
                    <span className="text-sm text-slate-600">@ {row.location}</span>
                </div>
                <div className="col-span-3">
                    <span className={`text-sm font-medium flex items-center gap-1 ${row.issueType === 'door_blocked' ? 'text-amber-700' : 'text-rose-600'}`}>
                        {row.failureDetail}
                    </span>
                </div>
                <div className="col-span-2 text-right">
                    {row.affectedValue > 0 ? (
                        <span className="text-sm font-mono font-bold text-slate-900">£{row.affectedValue.toLocaleString()}</span>
                    ) : (
                        <span className="text-xs text-slate-400 italic">Life Safety</span>
                    )}
                </div>
                <div className="col-span-1 flex justify-center">
                    <button
                        onClick={onToggle}
                        className={`p-1.5 rounded-lg border transition-all ${isExpanded
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500'
                            }`}
                        title="View mitigation / 查看整改建议"
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-indigo-50/50 border-b border-indigo-100 px-4 py-3">
                    <div className="ml-[8.33%] max-w-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Wrench size={13} className="text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                Mitigation Strategy / 整改建议
                            </span>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm space-y-1.5">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-slate-700 leading-relaxed">{mitigation.en}</p>
                            </div>
                            <p className="text-xs text-slate-500 pl-5 leading-relaxed">{mitigation.cn}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
