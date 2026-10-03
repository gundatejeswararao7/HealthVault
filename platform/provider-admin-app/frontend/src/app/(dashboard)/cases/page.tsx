'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get<any[]>(`/cases${query}`);
        setCases(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinical Cases</h1>
          <p className="text-xs text-slate-500 mt-1">Manage active patient treatment files and billing items</p>
        </div>

        <div className="flex gap-2">
          {(['all', 'open', 'closed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === filter
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter} Cases
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading cases...</p>
      ) : cases.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No clinical cases found for current filter.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-400">Case #{c.id.slice(0, 8)}</span>
                  <Badge variant={c.closed_at ? 'default' : 'success'}>
                    {c.closed_at ? 'Closed' : 'Active'}
                  </Badge>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2">{c.diagnosis}</h3>
                <p className="text-xs text-slate-600 mt-1">Patient: <strong>{c.patients?.full_name}</strong></p>
                <p className="text-xs text-slate-500 mt-0.5">Opened: {new Date(c.opened_at).toLocaleDateString()}</p>

                <p className="text-xs text-slate-700 mt-3 bg-slate-50 p-2.5 rounded border border-slate-200 line-clamp-2">
                  Plan: {c.treatment_plan}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Link
                  href={`/cases/${c.id}`}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Manage Treatment & Billing →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
