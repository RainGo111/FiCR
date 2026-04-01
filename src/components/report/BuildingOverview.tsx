import React from 'react';
import { Card } from '../shared';
import { SectionHeader } from './SectionHeader';
import { DataTable } from './DataTable';
import type { SparqlResults } from './types';
import { getRows, shortUri, num } from './types';

interface Props { results: SparqlResults; }

export const BuildingOverview: React.FC<Props> = ({ results }) => {
  const a1Rows = getRows(results, 'A1');
  const a2Rows = getRows(results, 'A2');

  if (a1Rows.length === 0 && a2Rows.length === 0) return null;

  // A1: Building overview — single row expected
  const bld = a1Rows[0];

  return (
    <section>
      <SectionHeader title="Building Overview" subtitle="建筑概况 (A1, A2)" borderColor="border-blue-500" />

      {bld && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Site', value: shortUri(bld.siteLabel || '') },
            { label: 'Building Type', value: shortUri(bld.buildingType || '') },
            { label: 'Purpose Group', value: bld.purposeGroup || '—' },
            { label: 'Total Spaces', value: bld.totalSpaces || '—' },
          ].map(({ label, value }) => (
            <Card key={label} className="border border-slate-200 p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">{value}</div>
            </Card>
          ))}
        </div>
      )}

      {a2Rows.length > 0 && (
        <DataTable
          title="Storey Inventory (A2)"
          columns={['storeyLabel', 'storeyType', 'elevation', 'height', 'spaceCount']}
          headers={['Storey', 'Type', 'Elevation (m)', 'Height (m)', 'Spaces']}
          rows={a2Rows.map(r => ({
            ...r,
            storeyType: shortUri(r.storeyType || ''),
            elevation: String(num(r.elevation)),
            height: String(num(r.height)),
          }))}
          compact
        />
      )}
    </section>
  );
};
