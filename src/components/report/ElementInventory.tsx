import React from 'react';
import { SectionHeader } from './SectionHeader';
import { DataTable } from './DataTable';
import type { SparqlResults } from './types';
import { getRows, shortUri } from './types';

interface Props { results: SparqlResults; }

export const ElementInventory: React.FC<Props> = ({ results }) => {
  const a5Rows = getRows(results, 'A5');
  const a6Rows = getRows(results, 'A6');

  if (a5Rows.length === 0 && a6Rows.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Element Inventory" subtitle="构件清单 (A5, A6)" borderColor="border-violet-500" />

      {a5Rows.length > 0 && (
        <DataTable
          title="Fire Safety Element Counts (A5)"
          columns={['elementType', 'count']}
          headers={['Element Type', 'Count']}
          rows={a5Rows.map(r => ({ ...r, elementType: shortUri(r.elementType || '') }))}
          compact
        />
      )}

      {a6Rows.length > 0 && (
        <DataTable
          title="Per-Space Fire Protection Breakdown (A6)"
          columns={['spaceLabel', 'category', 'itemType', 'itemLabel']}
          headers={['Space', 'Category', 'Type', 'Label']}
          rows={a6Rows.map(r => ({
            ...r,
            category: shortUri(r.category || ''),
            itemType: shortUri(r.itemType || ''),
          }))}
          compact
        />
      )}
    </section>
  );
};
