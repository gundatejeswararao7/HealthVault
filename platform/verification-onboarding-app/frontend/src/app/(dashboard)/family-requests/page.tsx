'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function VerificationFamilyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get<any[]>(`/family-requests${query}`);
        setRequests(res.data || []);
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
          <h1 className="text-2xl font-bold text-slate-900">Family Enrollment Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorize dependent member additions across all insured patient accounts
          </p>
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading enrollment requests...</p>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No family requests found for this filter.
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-900 text-base">{req.full_name}</h3>
                  <Badge variant={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}>
                    {req.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                  <p>Relationship: <strong className="capitalize">{req.relationship}</strong> • DOB: {new Date(req.date_of_birth).toLocaleDateString()}</p>
                  <p>Primary Account: <strong>{req.patients?.full_name}</strong> ({req.patients?.email})</p>
                  <p className="text-slate-400">Application Date: {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/family-requests/${req.id}`}
                  className="text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Review & Adjudicate →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
