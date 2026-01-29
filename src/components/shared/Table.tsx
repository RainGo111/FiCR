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
      <div className={`overflow-x-auto rounded-xl border border-neutral-200 shadow-soft ${className}`}>
        <table className="min-w-full divide-y divide-neutral-200">
          {children}
        </table>
      </div>
    );
  }

  if (!columns || !data) {
    return null;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-neutral-200 shadow-soft ${className}`}>
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column.key, column.sortable)}
                className={`px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-neutral-100 transition-colors' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortKey === column.key && (
                    <span className="text-primary-600">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-neutral-50 transition-colors">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
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
