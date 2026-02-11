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
      <div className={`overflow-x-auto rounded-xl border border-white/20 shadow-glass glass ${className}`}>
        <table className="min-w-full divide-y divide-white/10">
          {children}
        </table>
      </div>
    );
  }

  if (!columns || !data) {
    return null;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-white/20 shadow-glass glass ${className}`}>
      <table className="min-w-full divide-y divide-white/10">
        <thead className="bg-white/50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column.key, column.sortable)}
                className={`px-6 py-3 text-left text-xs font-sans font-medium text-primary-900 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-white/70 transition-smooth' : ''
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
        <tbody className="divide-y divide-white/10">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/30 transition-smooth">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm font-sans text-primary-800">
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
