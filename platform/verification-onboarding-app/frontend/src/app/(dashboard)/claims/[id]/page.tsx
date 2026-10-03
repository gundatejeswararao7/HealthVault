'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { DecisionModal } from '../../../../components/review/DecisionModal';

export default function VerificationClaimDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [claim, setClaim] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClaim = async () => {
    try {
      const res = await apiClient.get<any>(`/claims/${id}`);
      setClaim(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaim();
  }, [id]);

  const handleDecision = async (decision: any) => {
    await apiClient.patch(`/claims/${id}/decision`, decision);
    await loadClaim();
  };

  const handleMarkPaid = async () => {
    if (!confirm('Confirm disbursement of approved claim funds to healthcare provider/insured?')) return;
    setMarkingPaid(true);
    try {
      await apiClient.patch(`/claims/${id}/mark-paid`, {});
      await loadClaim();
    } catch (err: any) {
      alert(err.message || 'Failed to settle claim');
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading claim file...</div>;
  if (error || !claim) return <div className="text-rose-500 text-sm">{error || 'Claim not found'}</div>;

  const treatmentItems = claim.cases?.treatment_items || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/claims" className="text-xs text-indigo-600 hover:underline">
          ← Back to Claims
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Claim File #{claim.id.slice(0, 8)}</h1>
            <p className="text-xs text-slate-500">Adjudication and audit verification</p>
          </div>
          <div className="flex items-center gap-3">
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

            {claim.status !== 'approved' && claim.status !== 'paid' && claim.status !== 'rejected' && (
              <Button size="sm" onClick={() => setShowModal(true)}>
                Record Adjudication Decision
              </Button>
            )}

            {claim.status === 'approved' && (
              <Button size="sm" variant="success" loading={markingPaid} onClick={handleMarkPaid}>
                Disburse & Mark as Paid
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid for Policy & Patient Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Claim Financials</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Amount Claimed</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                ${Number(claim.amount_claimed).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            {claim.amount_approved && (
              <div>
                <p className="text-xs text-slate-500">Authorized Settlement Amount</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  ${Number(claim.amount_approved).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
            {claim.decision_reason && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-3">
                <span className="font-bold text-slate-700">Review Notes: </span>
                <span className="text-slate-600">{claim.decision_reason}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Policy & Insured Record</h2>
          <div className="space-y-2 text-xs">
            <p>Insured Patient: <strong className="text-slate-900 text-sm">{claim.patients?.full_name}</strong></p>
            <p>Carrier / Provider: {claim.insurance_policies?.provider_name}</p>
            <p>Policy Number: <span className="font-mono">{claim.insurance_policies?.policy_number}</span></p>
            <p>Coverage Limit: ${Number(claim.insurance_policies?.coverage_limit || 0).toLocaleString()}</p>
            <p>Deductible: ${Number(claim.insurance_policies?.deductible || 0).toLocaleString()}</p>
            <p>Filing Date: {claim.submitted_at ? new Date(claim.submitted_at).toLocaleString() : 'N/A'}</p>
          </div>
        </Card>
      </div>

      {/* Itemized Clinical Procedures */}
      <Card className="p-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Clinical Case Summary & Itemized Medical Bill
        </h2>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-4">
          <p><strong>Clinical Diagnosis:</strong> {claim.cases?.diagnosis || 'N/A'}</p>
          <p className="mt-1"><strong>Doctor Treatment Plan:</strong> {claim.cases?.treatment_plan || 'N/A'}</p>
        </div>

        {treatmentItems.length === 0 ? (
          <p className="text-xs text-slate-400">No itemized procedures found for this case.</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">Procedure Description</th>
                  <th className="p-3 w-16 text-center">Qty</th>
                  <th className="p-3 w-28 text-right">Unit Price</th>
                  <th className="p-3 w-28 text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {treatmentItems.map((item: any) => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium text-slate-800">{item.description}</td>
                    <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-600">${Number(item.unit_cost).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">${Number(item.total_cost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DecisionModal
        isOpen={showModal}
        title={`Adjudicate Claim #${claim.id.slice(0, 8)}`}
        type="claim"
        maxAmount={Number(claim.amount_claimed)}
        onClose={() => setShowModal(false)}
        onSubmit={handleDecision}
      />
    </div>
  );
}
