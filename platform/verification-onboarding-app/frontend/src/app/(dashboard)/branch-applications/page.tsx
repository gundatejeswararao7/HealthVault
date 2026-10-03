'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function BranchApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get<any[]>(`/branch-applications${query}`);
        setApplications(res.data || []);
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
          <h1 className="text-2xl font-bold text-slate-900">Hospital Branch Onboarding</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review submitted operating licenses, compliance credentials, and grant network activation
          </p>
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'under_review', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading applications...</p>
      ) : applications.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No hospital applications in this review state.
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-900 text-base">
                    {app.hospitals?.name || 'Healthcare Facility'}
                  </h3>
                  <Badge
                    variant={
                      app.status === 'approved'
                        ? 'success'
                        : app.status === 'pending'
                        ? 'warning'
                        : app.status === 'under_review'
                        ? 'info'
                        : 'danger'
                    }
                  >
                    {app.status}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 mt-1.5 space-y-0.5">
                  <p>License: <strong className="font-mono">{app.hospitals?.license_number}</strong> • Phone: {app.hospitals?.phone}</p>
                  <p>Facility Address: {app.hospitals?.address}</p>
                  <p className="text-slate-400">Submitted: {new Date(app.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/branch-applications/${app.id}`}
                  className="text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Inspect Credentials & Decide →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
