'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { TreatmentItemsTable } from '../../../../components/cases/TreatmentItemsTable';

export default function CaseDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCase = async () => {
    try {
      const res = await apiClient.get<any>(`/cases/${id}`);
      setCaseData(res.data);
      setDiagnosis(res.data.diagnosis);
      setTreatmentPlan(res.data.treatment_plan);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put(`/cases/${id}`, {
        diagnosis,
        treatment_plan: treatmentPlan,
      });
      await loadCase();
      alert('Case plan updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update case');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (item: { description: string; quantity: number; unit_cost: number }) => {
    await apiClient.post(`/cases/${id}/treatment-items`, item);
    await loadCase();
  };

  const handleDeleteItem = async (itemId: string) => {
    await apiClient.delete(`/cases/${id}/treatment-items/${itemId}`);
    await loadCase();
  };

  const handleCloseCase = async () => {
    if (!confirm('Are you sure you want to close this case? Billing will be finalized.')) return;
    try {
      await apiClient.patch(`/cases/${id}/close`, {});
      await loadCase();
    } catch (err: any) {
      alert(err.message || 'Failed to close case');
    }
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading clinical case file...</div>;
  if (error || !caseData) return <div className="text-red-500 text-sm">{error || 'Case not found'}</div>;

  const isOpen = !caseData.closed_at;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/cases" className="text-xs text-emerald-600 hover:underline">
          ← Back to Cases
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Case Record</h1>
            <p className="text-xs text-slate-500 font-mono">UUID: {caseData.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isOpen ? 'success' : 'default'}>
              {isOpen ? 'Active Treatment' : 'Closed & Finalized'}
            </Badge>
            {isOpen && (
              <Button size="sm" variant="danger" onClick={handleCloseCase}>
                Close Case
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Patient Card */}
      <Card className="p-4 bg-slate-50 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500">Patient: </span>
          <strong className="text-slate-900 text-sm">{caseData.patients?.full_name}</strong>
          <span className="text-slate-400 ml-2">({caseData.patients?.email})</span>
        </div>
        <Link
          href={`/patients/${caseData.patient_id}`}
          className="text-emerald-700 font-semibold hover:underline"
        >
          View Full Medical History →
        </Link>
      </Card>

      {/* Diagnosis & Plan */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          Clinical Diagnosis & Treatment Strategy
        </h2>
        {isOpen ? (
          <form onSubmit={handleUpdateCase} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis</label>
              <input
                type="text"
                required
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Treatment Protocol & Prescriptions</label>
              <textarea
                required
                rows={3}
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <Button type="submit" size="sm" loading={saving}>
              Save Case Updates
            </Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Diagnosis</p>
              <p className="font-semibold text-slate-900 mt-0.5">{caseData.diagnosis}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Treatment Plan</p>
              <p className="text-slate-800 mt-0.5 whitespace-pre-wrap">{caseData.treatment_plan}</p>
            </div>
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              Closed on: {new Date(caseData.closed_at).toLocaleString()}
            </div>
          </div>
        )}
      </Card>

      {/* Itemized Treatment Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Itemized Procedures & Medication Billing
          </h2>
          <span className="text-xs text-slate-500">
            For insurance reimbursement filing
          </span>
        </div>
        <TreatmentItemsTable
          caseId={id}
          items={caseData.treatment_items || []}
          isOpen={isOpen}
          onAddItem={handleAddItem}
          onDeleteItem={handleDeleteItem}
        />
      </Card>
    </div>
  );
}
