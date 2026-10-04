'use client';

import { useState, useEffect } from 'react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/audit-logs`)
      .then(res => res.json())
      .then(data => setLogs(data.data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record ID</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{log.actor_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{log.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{log.table_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{log.record_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
