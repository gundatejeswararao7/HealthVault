'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

export default function ClaimDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [claim, setClaim] = useState<any>(null);
  const [treatmentItems, setTreatmentItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<any>(`/claims/${id}`);
        setClaim(res.data);

        // Load treatment items for this case
        const itemsRes = await apiClient.get<any[]>(`/claims/${id}/treatment-items`);
        setTreatmentItems(itemsRes.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSubmitDraft = async () => {
    setSubmitting(true);
    try {
      await apiClient.patch(`/claims/${id}/submit`, {});
      const res = await apiClient.get<any>(`/claims/${id}`);
      setClaim(res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading claim...</div>;
  if (!claim) return <div className="text-slate-500 text-sm">Claim not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/claims" className="text-xs text-blue-600 hover:underline">
          ← Back to Claims
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-slate-900">Claim Details</h1>
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
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Amount Claimed</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ${Number(claim.amount_claimed).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          {claim.amount_approved && (
            <div>
              <p className="text-xs text-slate-500">Amount Approved by Insurer</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ${Number(claim.amount_approved).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {claim.decision_reason && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="font-semibold text-amber-800">Insurer Review Notes: </span>
            <span className="text-amber-900">{claim.decision_reason}</span>
          </div>
        )}

        {/* Treatment Items Breakdown */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-2">Itemized Medical Bill</h2>
          {treatmentItems.length === 0 ? (
            <p className="text-xs text-slate-400">No itemized treatment records attached to this case.</p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Unit Cost</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {treatmentItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-medium text-slate-800">{item.description}</td>
                      <td className="p-2.5 text-slate-600">{item.quantity}</td>
                      <td className="p-2.5 text-slate-600">${Number(item.unit_cost).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-semibold text-slate-900">${Number(item.total_cost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {claim.status === 'draft' && (
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleSubmitDraft}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting to Insurer...' : 'Submit Claim for Insurer Review'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
