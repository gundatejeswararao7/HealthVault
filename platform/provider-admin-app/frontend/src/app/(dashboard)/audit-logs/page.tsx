'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await apiClient.get<any[]>('/audit-logs');
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-1">
          Immutable audit record of all system decisions, status mutations, and administrative reviews
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading audit log...</p>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No audit records found.
        </Card>
      ) : (
        <Table headers={['Timestamp', 'Action', 'Target Table', 'Record ID', 'Actor ID', 'Changes Details']}>
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-xs font-bold text-slate-900 font-mono">
                {log.action}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                {log.table_name}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-slate-400">
                {log.record_id ? log.record_id.slice(0, 8) + '...' : 'N/A'}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-slate-400">
                {log.actor_id ? log.actor_id.slice(0, 8) + '...' : 'System'}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-slate-700 max-w-xs truncate">
                {JSON.stringify(log.new_value || {})}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
