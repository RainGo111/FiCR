import React from 'react';
import { SectionHeader } from './SectionHeader';
import { DataTable } from './DataTable';
import type { SparqlResults } from './types';
import { getRows, shortUri } from './types';

interface Props { results: SparqlResults; }

export const WorkflowSection: React.FC<Props> = ({ results }) => {
  const d1Rows = getRows(results, 'D1');
  const d2Rows = getRows(results, 'D2');

  if (d1Rows.length === 0 && d2Rows.length === 0) return null;

  return (
    <section className="space-y-6">
      <SectionHeader title="Inspection Workflow" subtitle="检测工作流 (D1, D2)" borderColor="border-cyan-500" />

      {d1Rows.length > 0 ? (
        <DataTable
          title="Inspection Events & Tasks (D1)"
          columns={['eventLabel', 'taskLabel', 'taskType', 'startTime', 'endTime']}
          headers={['Event', 'Task', 'Type', 'Start', 'End']}
          rows={d1Rows.map(r => ({
            ...r,
            taskType: shortUri(r.taskType || ''),
          }))}
          compact
        />
      ) : (
        <div className="text-sm text-slate-400 italic py-4 text-center border border-slate-100 rounded-lg">
          No inspection workflow data recorded
        </div>
      )}

      {d2Rows.length > 0 && (
        <DataTable
          title="Compliance Assessment Results (D2)"
          columns={['assessmentLabel', 'resultType', 'regulatorySourceLabel', 'evidenceLabel']}
          headers={['Assessment', 'Result', 'Regulatory Source', 'Evidence']}
          rows={d2Rows.map(r => ({
            ...r,
            resultType: shortUri(r.resultType || ''),
          }))}
          highlightColumn="resultType"
          highlightValue="NonCompliant"
          compact
        />
      )}
    </section>
  );
};
