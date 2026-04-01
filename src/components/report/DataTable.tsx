import React from 'react';

interface DataTableProps {
  title?: string;
  columns: string[];
  rows: Record<string, string>[];
  headers?: string[];
  highlightColumn?: string;
  highlightValue?: string;
  compact?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  rows,
  headers,
  highlightColumn,
  highlightValue,
  compact = false,
}) => {
  const displayHeaders = headers ?? columns;
  const py = compact ? 'py-1.5' : 'py-2';

  if (rows.length === 0) {
    return (
      <div className="my-3">
        {title && <h4 className="text-sm font-semibold text-slate-700 mb-2">{title}</h4>}
        <div className="text-sm text-slate-400 italic py-4 text-center border border-slate-100 rounded-lg">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="my-3">
      {title && <h4 className="text-sm font-semibold text-slate-700 mb-2">{title}</h4>}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              {displayHeaders.map((h, i) => (
                <th key={i} className={`px-3 ${py} text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={`border-b border-slate-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                {columns.map((col, ci) => {
                  const val = row[col] ?? '';
                  const isHighlighted = highlightColumn === col && highlightValue && val.includes(highlightValue);
                  return (
                    <td
                      key={ci}
                      className={`px-3 ${py} ${isHighlighted ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
