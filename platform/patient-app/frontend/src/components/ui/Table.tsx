import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  keyExtractor,
  emptyMessage = 'No records found.',
  className = '',
}: TableProps<T>) {
  return (
    <div className={['overflow-x-auto rounded-md border border-gray-200', className].join(' ')}>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700">
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[col.key] !== undefined
                        ? String((row as Record<string, unknown>)[col.key])
                        : '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
