import React from 'react';
import { Card, Badge } from '../components/shared';
import {
    Rocket,
    Brain,
    Database,
    Upload,
    Sparkles,
    ChevronRight,
    Building2
} from 'lucide-react';

// ============================================================
// Roadmap Data
// ============================================================
const ROADMAP_ITEMS = [
    {
        icon: <Upload size={22} />,
        titleEn: 'Custom Data Ingestion',
        titleCn: '上传自定义建筑模型进行自动对齐',
        descEn: 'Upload IFC/JSON models for automated FiCR ontology alignment and validation.',
        descCn: '支持上传 IFC/JSON 建筑模型，自动完成 FiCR 本体映射与合规校验。',
        progress: 65,
        status: 'Beta',
        features: [
            'IFC 4.0 / IFC 2x3 format support',
            'Automatic BOT ontology mapping',
            'Drag & drop batch import',
        ],
    },
    {
        icon: <Brain size={22} />,
        titleEn: 'LLM Context Agent',
        titleCn: '通过大模型查询法规及维修成本',
        descEn: 'Ask AI about specific compliance codes, remediation costs, and regulatory requirements.',
        descCn: '接入大语言模型，支持自然语言查询建筑法规、维修方案及成本估算。',
        progress: 40,
        status: 'Alpha',
        features: [
            'Natural language compliance queries',
            'Cost estimation from historical data',
            'Multi-code cross-reference (BS 9999, ADB)',
        ],
    },
    {
        icon: <Database size={22} />,
        titleEn: 'Autonomous Instantiation',
        titleCn: '从原始数据自动生成知识图谱实例',
        descEn: 'Automatic RDF triple generation from raw building survey data and floor plans.',
        descCn: '从原始建筑勘测数据与平面图自动生成 RDF 三元组，构建知识图谱。',
        progress: 20,
        status: 'Research',
        features: [
            'PDF floor plan OCR extraction',
            'Automated space–element linkage',
            'FiCR triple validation pipeline',
        ],
    },
];



// ============================================================
// Component
// ============================================================
export const Roadmap: React.FC = () => {
    return (
        <div className="min-h-screen bg-white print:bg-white">
            {/* ========== Page Header ========== */}
            <header className="border-b border-slate-200 sticky top-0 z-30 bg-white/95 backdrop-blur-sm">
                <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-600 p-2.5 rounded-xl text-white shadow-md">
                            <Rocket size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                FiCR AI: Innovation Roadmap
                            </h1>
                        </div>
                    </div>
                    <Badge variant="primary" className="flex items-center gap-1">
                        <Sparkles size={12} />
                        In Development / 开发中
                    </Badge>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 space-y-12 font-sans">

                {/* ========== Section 1: Capability Preview / 能力预览 ========== */}
                <section>
                    <div className="border-l-4 border-purple-500 pl-4 mb-6">
                        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                            Capability Preview
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">能力预览与开发进度</p>
                    </div>

                    <div className="space-y-6">
                        {ROADMAP_ITEMS.map((item, idx) => {
                            const statusColor =
                                item.status === 'Beta'
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                    : item.status === 'Alpha'
                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-500 border-slate-200';

                            return (
                                <Card
                                    key={idx}
                                    className="p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white"
                                >
                                    <div className="flex items-start gap-5">
                                        {/* Icon */}
                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-indigo-600 shrink-0">
                                            {item.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Title Row */}
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                                    {item.titleEn}
                                                    <ChevronRight size={14} className="text-slate-400" />
                                                </h3>
                                                <div className="flex items-center gap-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                                                        {item.status}
                                                    </span>
                                                    <span className="text-sm font-mono font-bold text-indigo-600">
                                                        {item.progress}%
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-slate-500 mb-2">{item.titleCn}</p>

                                            {/* Description */}
                                            <p className="text-sm text-slate-600 leading-relaxed mb-1">
                                                {item.descEn}
                                            </p>
                                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                                {item.descCn}
                                            </p>

                                            {/* Progress Bar */}
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>

                                            {/* Feature Chips */}
                                            <div className="flex flex-wrap gap-2">
                                                {item.features.map((feat, fIdx) => (
                                                    <span
                                                        key={fIdx}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200"
                                                    >
                                                        {feat}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </section>



                {/* ========== Section 3: Vision / 愿景 ========== */}
                <section>
                    <Card className="p-8 bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-slate-200 shadow-sm text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl text-indigo-600 mb-4">
                            <Building2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                            Towards Autonomous Building Intelligence
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">迈向自主化建筑智能</p>

                    </Card>
                </section>

                {/* Footer */}
                <footer className="text-center text-slate-400 text-xs py-8 print:hidden border-t border-slate-100 mt-8">
                    <p>FiCR Innovation Lab • Built with Semantic Web Technologies</p>
                </footer>
            </main>
        </div>
    );
};
