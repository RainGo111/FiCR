import React from 'react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns?: Column[];
  data?: any[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
  children?: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection,
  className = '',
  children
}) => {
  const handleSort = (key: string, sortable?: boolean) => {
    if (sortable && onSort) {
      onSort(key);
    }
  };

  if (children) {
    return (
      <div className={`overflow-x-auto rounded-xl border border-film-sand shadow-film-soft ${className}`}>
        <table className="min-w-full divide-y divide-film-sand">
          {children}
        </table>
      </div>
    );
  }

  if (!columns || !data) {
    return null;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-film-sand shadow-film-soft bg-film-paper ${className}`}>
      <table className="min-w-full divide-y divide-film-sand">
        <thead className="bg-film-cream bg-film-grain-light">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column.key, column.sortable)}
                className={`px-6 py-3 text-left text-xs font-sans font-medium text-film-charcoal uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-film-sand/50 transition-film' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortKey === column.key && (
                    <span className="text-accent-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-film-paper divide-y divide-film-sand">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-film-cream/30 transition-film">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm font-sans text-film-ink">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
