'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { DecisionModal } from '../../../../components/review/DecisionModal';

export default function FamilyRequestDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [req, setReq] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await apiClient.get<any>(`/family-requests/${id}`);
      setReq(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDecision = async (decision: any) => {
    await apiClient.patch(`/family-requests/${id}/decision`, decision);
    await loadData();
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading enrollment record...</div>;
  if (error || !req) return <div className="text-rose-500 text-sm">{error || 'Record not found'}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/family-requests" className="text-xs text-indigo-600 hover:underline">
          ← Back to Family Requests
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-slate-900">Dependent Enrollment Adjudication</h1>
          <div className="flex items-center gap-3">
            <Badge variant={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}>
              {req.status}
            </Badge>
            {req.status === 'pending' && (
              <Button size="sm" onClick={() => setShowModal(true)}>
                Make Decision
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dependent Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Dependent Name</p>
            <p className="font-bold text-slate-900 mt-1">{req.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Relationship to Insured</p>
            <p className="font-semibold text-slate-800 capitalize mt-1">{req.relationship}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Date of Birth</p>
            <p className="font-semibold text-slate-800 mt-1">{new Date(req.date_of_birth).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Submission Date</p>
            <p className="font-semibold text-slate-800 mt-1">{new Date(req.created_at).toLocaleString()}</p>
          </div>
        </div>

        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">Primary Insured Account</h2>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <p>Insured Name: <strong className="text-slate-900">{req.patients?.full_name}</strong></p>
          <p>Email: {req.patients?.email}</p>
          <p>Phone: {req.patients?.phone}</p>
        </div>

        {req.decision_reason && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
            <span className="font-bold text-amber-800">Review Notes: </span>
            <span className="text-amber-900">{req.decision_reason}</span>
          </div>
        )}
      </Card>

      <DecisionModal
        isOpen={showModal}
        title={`Adjudicate Dependent Enrollment: ${req.full_name}`}
        onClose={() => setShowModal(false)}
        onSubmit={handleDecision}
      />
    </div>
  );
}
