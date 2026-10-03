'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function VerificationClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
        const res = await apiClient.get<any[]>(`/claims${query}`);
        setClaims(res.data || []);
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
          <h1 className="text-2xl font-bold text-slate-900">Insurance Claims Adjudication</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review submitted medical cases, verify policy limits, and settle claim payouts
          </p>
        </div>

        <div className="flex gap-2">
          {['all', 'submitted', 'under_review', 'approved', 'rejected', 'paid'].map((tab) => (
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
        <p className="text-sm text-slate-500">Loading claims review queue...</p>
      ) : claims.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No claims matching current status filter.
        </Card>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <Card key={claim.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-400">Claim #{claim.id.slice(0, 8)}</span>
                  <Badge
                    variant={
                      claim.status === 'approved' || claim.status === 'paid'
                        ? 'success'
                        : claim.status === 'submitted'
                        ? 'warning'
                        : claim.status === 'under_review'
                        ? 'info'
                        : 'danger'
                    }
                  >
                    {claim.status}
                  </Badge>
                </div>

                <div className="mt-2">
                  <span className="text-xs text-slate-500">Claimed Amount: </span>
                  <strong className="text-slate-900 text-base">
                    ${Number(claim.amount_claimed).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                  {claim.amount_approved && (
                    <span className="text-xs font-bold text-emerald-600 ml-3">
                      Approved: ${Number(claim.amount_approved).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-600 mt-2 space-y-0.5">
                  <p>Patient: <strong>{claim.patients?.full_name}</strong> • Policy: #{claim.insurance_policies?.policy_number}</p>
                  <p>Carrier: {claim.insurance_policies?.provider_name} • Diagnosis: {claim.cases?.diagnosis || 'N/A'}</p>
                  <p className="text-slate-400">Filed: {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : 'Draft'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/claims/${claim.id}`}
                  className="text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Adjudicate Claim →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
