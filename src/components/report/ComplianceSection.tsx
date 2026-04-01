import React, { useState } from 'react';
import { Card } from '../shared';
import {
  ShieldAlert,
  Layers,
  DoorOpen,
  ChevronUp,
  ChevronDown,
  Wrench,
  Filter,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { DataTable } from './DataTable';
import { HealthScoreCard } from './HealthScoreCard';
import type { SparqlResults } from './types';
import { getRows, shortUri, num } from './types';

interface Props { results: SparqlResults; }

type FilterMode = 'all' | 'wall' | 'floor' | 'door';

function getMitigation(assetType: string): { en: string; cn: string } {
  if (assetType.includes('Wall') || assetType.includes('Floor') || assetType.includes('Slab')) {
    return {
      en: 'Apply fire-rated intumescent coating or install fire-stop mineral wool to meet required REI.',
      cn: '涂刷防火涂料或安装防火封堵矿棉以满足所需 REI 等级',
    };
  }
  if (assetType.includes('Door')) {
    return {
      en: 'Clear all physical obstructions immediately and inspect self-closing mechanisms.',
      cn: '立即清理障碍物并检查闭门器状态',
    };
  }
  return { en: 'Inspect and consult with fire safety engineer.', cn: '检查并咨询消防安全工程师' };
}

export const ComplianceSection: React.FC<Props> = ({ results }) => {
  const b1Rows = getRows(results, 'B1');
  const b2Rows = getRows(results, 'B2');
  const b3Rows = getRows(results, 'B3');

  const [filter, setFilter] = useState<FilterMode>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Process B1 KPI
  let tw = 0, nw = 0, tf = 0, nf = 0, td = 0, od = 0;
  b1Rows.forEach(row => {
    const c = parseInt(row.count) || 0;
    const cat = row.category || '';
    const stat = row.status || '';
    if (cat.includes('Wall')) { tw += c; if (stat.includes('Non-Compliant')) nw += c; }
    if (cat.includes('Slab')) { tf += c; if (stat.includes('Non-Compliant')) nf += c; }
    if (cat.includes('Doorset')) { td += c; if (stat.includes('Non-Compliant')) od += c; }
  });

  const totalComponents = tw + tf + td;
  const totalNonCompliant = nw + nf + od;
  const overallRate = totalComponents > 0 ? parseFloat(((totalNonCompliant * 100) / totalComponents).toFixed(1)) : 0;

  // Process B2 deficits — non-compliant only
  const deficits = b2Rows
    .filter(r => r.complianceStatus && r.complianceStatus !== 'Compliant')
    .map((r, idx) => ({
      id: `DEF-${String(idx + 1).padStart(3, '0')}`,
      assetType: shortUri(r.assetType || ''),
      elementLabel: r.elementLabel || 'Unknown',
      complianceStatus: r.complianceStatus || '',
      issue: r.issue === '--' ? 'Compliant' : (r.issue || ''),
      spaceLabel: r.spaceLabel || '',
      actualREI: num(r.actualREI),
      requiredREI: num(r.requiredREI),
    }));

  const filteredDeficits = deficits.filter(d => {
    if (filter === 'wall') return d.assetType.includes('Wall');
    if (filter === 'floor') return d.assetType.includes('Slab') || d.assetType.includes('Floor');
    if (filter === 'door') return d.assetType.includes('Door');
    return true;
  });

  const filterButtons: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'All / 全部' },
    { key: 'wall', label: 'Walls / 墙体' },
    { key: 'floor', label: 'Floors / 楼板' },
    { key: 'door', label: 'Doors / 防火门' },
  ];

  return (
    <section className="space-y-8">
      {/* B1: Health Score */}
      <div>
        <SectionHeader title="Compliance Health Score" subtitle="合规健康概况 (B1)" borderColor="border-emerald-500" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {/* Overall */}
          <Card className="border border-slate-200 shadow-sm p-4 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Overall / 综合不合规率</div>
            <div className={`text-2xl font-bold font-mono ${overallRate > 30 ? 'text-rose-600' : overallRate > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {overallRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{totalNonCompliant} / {totalComponents} Deficits</div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${overallRate > 30 ? 'bg-rose-500' : overallRate > 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(overallRate, 100)}%` }}
              />
            </div>
          </Card>

          <HealthScoreCard category="Walls / 墙体" compliant={tw - nw} nonCompliant={nw}
            icon={<ShieldAlert size={14} className="text-rose-500" />} accentColor="rose" />
          <HealthScoreCard category="Floors / 楼板" compliant={tf - nf} nonCompliant={nf}
            icon={<Layers size={14} className="text-indigo-500" />} accentColor="indigo" />
          <HealthScoreCard category="Doors / 防火门" compliant={td - od} nonCompliant={od}
            icon={<DoorOpen size={14} className="text-amber-500" />} accentColor="amber" />
        </div>
      </div>

      {/* B2: Deficit List */}
      {deficits.length > 0 && (
        <div>
          <SectionHeader title="Element Compliance Detail" subtitle="构件级失效明细 (B2)" borderColor="border-amber-500" />

          <div className="flex flex-wrap items-center gap-2 mt-4 mb-3">
            <Filter size={14} className="text-slate-400" />
            {filterButtons.map(fb => (
              <button
                key={fb.key}
                onClick={() => setFilter(fb.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filter === fb.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {fb.label}
              </button>
            ))}
            <span className="text-[11px] text-slate-400 ml-2">
              {filteredDeficits.length} of {deficits.length} items
            </span>
          </div>

          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              <div className="col-span-3">Space / Element</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-4">Issue / 缺陷类型</div>
              <div className="col-span-2 text-right">Required vs Actual</div>
              <div className="col-span-1 text-center">Action</div>
            </div>
            <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {filteredDeficits.length === 0 && (
                <div className="px-4 py-12 text-center text-sm text-slate-400">No items match the current filter.</div>
              )}
              {filteredDeficits.map((row, idx) => {
                const isExpanded = expandedRow === row.id;
                const mitigation = getMitigation(row.assetType);
                return (
                  <div key={row.id}>
                    <div className={`px-4 py-3 grid grid-cols-12 gap-2 items-center border-b border-slate-100 transition-colors hover:bg-indigo-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                      <div className="col-span-3">
                        <span className="text-sm font-bold text-slate-800">{row.spaceLabel}</span>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{row.elementLabel}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">{row.assetType}</span>
                      </div>
                      <div className="col-span-4">
                        <span className={`text-[11px] uppercase font-semibold tracking-wider ${row.assetType.includes('Door') ? 'text-orange-600' : 'text-rose-600'}`}>
                          {row.issue}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        {row.assetType.includes('Door') ? (
                          <span className="text-sm font-bold text-orange-600">Obscured</span>
                        ) : (
                          <span className="text-sm font-mono font-bold text-rose-600">
                            {row.actualREI} &lt; {row.requiredREI}
                          </span>
                        )}
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          onClick={() => setExpandedRow(prev => prev === row.id ? null : row.id)}
                          className={`h-7 w-7 p-0 rounded-full inline-flex items-center justify-center ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-indigo-50/50 border-b border-indigo-100 px-12 py-4">
                        <div className="flex gap-4">
                          <Wrench size={16} className="text-indigo-500 shrink-0 mt-1" />
                          <div>
                            <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                              Mitigation Strategy / 整改建议
                            </h5>
                            <p className="text-sm text-slate-700 leading-relaxed mb-1">{mitigation.en}</p>
                            <p className="text-xs text-slate-500">{mitigation.cn}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* B3: OWL-Inferred Classification */}
      {b3Rows.length > 0 && (
        <div>
          <SectionHeader title="OWL-Inferred Classification Audit" subtitle="OWL 推理分类审计 (B3)" borderColor="border-purple-500" />
          <DataTable
            columns={['definedClassName', 'inferredCount', 'triggerCondition']}
            headers={['Class', 'Inferred Instances', 'Trigger Condition']}
            rows={b3Rows.map(r => ({
              ...r,
              definedClassName: shortUri(r.definedClassName || ''),
              triggerCondition: shortUri(r.triggerCondition || ''),
            }))}
            compact
          />
        </div>
      )}
    </section>
  );
};
