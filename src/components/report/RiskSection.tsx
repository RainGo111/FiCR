import React from 'react';
import { Card, Badge } from '../shared';
import { AlertCircle, Shield } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { DataTable } from './DataTable';
import type { SparqlResults } from './types';
import { getRows, shortUri, num } from './types';

interface Props { results: SparqlResults; }

function StatRow({ label, value, color = 'text-slate-700' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

export const RiskSection: React.FC<Props> = ({ results }) => {
  const c1Rows = getRows(results, 'C1');
  const c2Rows = getRows(results, 'C2');
  const c3Rows = getRows(results, 'C3');
  const c4Rows = getRows(results, 'C4');

  if (c1Rows.length === 0 && c4Rows.length === 0) return null;

  // Process C4 risk units
  const riskUnits = c4Rows.map(r => ({
    ruLabel: shortUri(r.ruLabel || ''),
    totalAssumptions: num(r.totalAssumptions),
    unknownCount: num(r.unknownCount),
    compromisedCount: num(r.compromisedCount),
    evidenceGapCount: num(r.evidenceGapCount),
    installStatus: shortUri(r.installStatus || ''),
    alarmStatus: shortUri(r.alarmStatus || ''),
  }));

  return (
    <section className="space-y-8">
      {/* C4: Worst-First Ranking */}
      {riskUnits.length > 0 && (
        <div>
          <SectionHeader
            title="Risk Unit Confidence Assessment"
            subtitle="风险单元置信度审计 — Worst-First (C4)"
            borderColor="border-rose-500"
          />
          <p className="text-xs text-slate-500 mt-2 mb-4">
            FiCR 设计理念: 优先暴露最不利单元与证据缺口，避免因资产数据缺失而低估风险。
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {riskUnits.map((ru, idx) => (
              <Card key={ru.ruLabel} className={`p-5 border ${idx === 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 bg-white'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${idx === 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                      {idx === 0 ? <AlertCircle size={18} /> : <Shield size={18} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 break-all pr-2">{ru.ruLabel}</h3>
                  </div>
                  <Badge variant={idx === 0 ? 'warning' : 'neutral'}>Priority {idx + 1}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <StatRow label="Evidence Gaps / 审计缺口" value={`${ru.evidenceGapCount}`} color={ru.evidenceGapCount > 0 ? 'text-rose-600' : 'text-emerald-600'} />
                    <StatRow label="Unknown / 未知状态" value={`${ru.unknownCount}`} color={ru.unknownCount > 0 ? 'text-amber-600' : 'text-emerald-600'} />
                    <StatRow label="Compromised / 确认失效" value={`${ru.compromisedCount}`} color={ru.compromisedCount > 0 ? 'text-rose-600' : 'text-emerald-600'} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <StatRow label="Total Assumptions" value={`${ru.totalAssumptions}`} color="text-slate-900" />
                    <StatRow label="Sprinkler" value={ru.installStatus} color={ru.installStatus.includes('Unsprinklered') ? 'text-rose-600' : 'text-amber-600'} />
                    <StatRow label="Fire Alarm" value={ru.alarmStatus} color={ru.alarmStatus.includes('Unknown') ? 'text-rose-600' : 'text-amber-600'} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* C1: Risk Unit Inventory */}
      {c1Rows.length > 0 && (
        <div>
          <SectionHeader title="Risk Unit Inventory" subtitle="风险单元清单 (C1)" borderColor="border-orange-500" />
          <DataTable
            columns={['ruLabel', 'installStatus', 'alarmStatus', 'spaceLabels']}
            headers={['Risk Unit', 'Sprinkler', 'Alarm', 'Spaces']}
            rows={c1Rows.map(r => ({
              ...r,
              ruLabel: shortUri(r.ruLabel || ''),
              installStatus: shortUri(r.installStatus || ''),
              alarmStatus: shortUri(r.alarmStatus || ''),
            }))}
            compact
          />
        </div>
      )}

      {/* C2: Condition Distribution */}
      {c2Rows.length > 0 && (
        <div>
          <SectionHeader title="Condition State Distribution" subtitle="状态分布 (C2)" borderColor="border-yellow-500" />
          <DataTable
            columns={['ruLabel', 'conditionState', 'count']}
            headers={['Risk Unit', 'Condition State', 'Count']}
            rows={c2Rows.map(r => ({
              ...r,
              ruLabel: shortUri(r.ruLabel || ''),
              conditionState: shortUri(r.conditionState || ''),
            }))}
            highlightColumn="conditionState"
            highlightValue="Compromised"
            compact
          />
        </div>
      )}

      {/* C3: Evidence Gaps */}
      {c3Rows.length > 0 && (
        <div>
          <SectionHeader title="Evidence Completeness" subtitle="证据完整性 (C3)" borderColor="border-red-500" />
          <DataTable
            columns={['ruLabel', 'assumptionLabel', 'conditionState', 'evidenceLabel', 'gapFlag']}
            headers={['Risk Unit', 'Assumption', 'Condition', 'Evidence', 'Gap']}
            rows={c3Rows.map(r => ({
              ...r,
              ruLabel: shortUri(r.ruLabel || ''),
              conditionState: shortUri(r.conditionState || ''),
              gapFlag: r.gapFlag || '',
            }))}
            highlightColumn="gapFlag"
            highlightValue="EVIDENCE GAP"
            compact
          />
        </div>
      )}
    </section>
  );
};
