'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClaims() {
      try {
        const res = await apiClient.get<any[]>('/claims');
        setClaims(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insurance Claims</h1>
          <p className="text-sm text-slate-500">Track and submit claims for your medical cases</p>
        </div>
        <Link
          href="/claims/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + File New Claim
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading claims...</p>
      ) : claims.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 text-sm">No insurance claims filed yet.</p>
          <Link href="/claims/new" className="text-blue-600 text-xs font-semibold hover:underline mt-2 inline-block">
            Start a new claim filing
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {claims.map((claim) => (
            <Card key={claim.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    Claim #{claim.id.slice(0, 8)}
                  </span>
                  <Badge
                    variant={
                      claim.status === 'approved' || claim.status === 'paid'
                        ? 'success'
                        : claim.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {claim.status}
                  </Badge>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-slate-500">Amount Claimed</p>
                  <p className="text-xl font-bold text-slate-900">
                    ${Number(claim.amount_claimed).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  {claim.amount_approved && (
                    <p className="text-xs font-semibold text-green-700 mt-1">
                      Approved: ${Number(claim.amount_approved).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <p>Policy: {claim.insurance_policies?.policy_number || 'N/A'}</p>
                  <p>Provider: {claim.insurance_policies?.provider_name || 'N/A'}</p>
                  <p>Submitted: {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : 'Draft'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Link
                  href={`/claims/${claim.id}`}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View Details & History →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
