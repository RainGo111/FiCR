import React from 'react';
import { SectionHeader } from './SectionHeader';
import { DataTable } from './DataTable';
import type { SparqlResults } from './types';
import { getRows, shortUri } from './types';

interface Props { results: SparqlResults; }

export const SpatialInventory: React.FC<Props> = ({ results }) => {
  const a3Rows = getRows(results, 'A3');
  const a4Rows = getRows(results, 'A4');

  if (a3Rows.length === 0 && a4Rows.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Spatial Inventory" subtitle="空间清单 (A3, A4)" borderColor="border-teal-500" />

      {a3Rows.length > 0 && (
        <DataTable
          title="Space Ledger — Detail (A3)"
          columns={['storeyLabel', 'spaceLabel', 'spaceType', 'usageType', 'floorArea']}
          headers={['Storey', 'Space', 'Type', 'Usage', 'Area (m²)']}
          rows={a3Rows.map(r => ({
            ...r,
            spaceType: shortUri(r.spaceType || ''),
            usageType: shortUri(r.usageType || ''),
          }))}
          compact
        />
      )}

      {a4Rows.length > 0 && (
        <DataTable
          title="Usage Distribution — Summary (A4)"
          columns={['usageType', 'count']}
          headers={['Usage Type', 'Count']}
          rows={a4Rows.map(r => ({ ...r, usageType: shortUri(r.usageType || '') }))}
          compact
        />
      )}
    </section>
  );
};
