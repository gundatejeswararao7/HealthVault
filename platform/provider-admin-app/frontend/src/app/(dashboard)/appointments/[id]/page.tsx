'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';

export default function ProviderAppointmentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [openingCase, setOpeningCase] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<any>(`/appointments/${id}`);
        setAppointment(res.data);
        setNotes(res.data.notes || '');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleUpdateStatus = async (status: string) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, { status, notes });
      const res = await apiClient.get<any>(`/appointments/${id}`);
      setAppointment(res.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis || !treatmentPlan) {
      alert('Diagnosis and Treatment Plan are required to open a clinical case');
      return;
    }

    setOpeningCase(true);
    try {
      const res = await apiClient.post<any>(`/appointments/${id}/case`, {
        diagnosis,
        treatment_plan: treatmentPlan,
      });

      if (res.data?.id) {
        router.push(`/cases/${res.data.id}`);
      } else {
        const refreshed = await apiClient.get<any>(`/appointments/${id}`);
        setAppointment(refreshed.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open case');
    } finally {
      setOpeningCase(false);
    }
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading clinical record...</div>;
  if (error || !appointment) return <div className="text-red-500 text-sm">{error || 'Record not found'}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/queue" className="text-xs text-emerald-600 hover:underline">
          ← Back to Queue
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-slate-900">Clinical Consultation Details</h1>
          <Badge
            variant={
              appointment.status === 'confirmed'
                ? 'success'
                : appointment.status === 'pending'
                ? 'warning'
                : appointment.status === 'completed'
                ? 'info'
                : 'danger'
            }
          >
            {appointment.status}
          </Badge>
        </div>
      </div>

      {/* Patient Summary */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Patient Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Full Name</p>
            <p className="font-semibold text-slate-900 mt-1">{appointment.patients?.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Contact Phone</p>
            <p className="font-semibold text-slate-900 mt-1">{appointment.patients?.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Date of Birth</p>
            <p className="font-semibold text-slate-900 mt-1">
              {appointment.patients?.date_of_birth ? new Date(appointment.patients.date_of_birth).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-500">Patient Chief Complaint</p>
          <p className="text-sm text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {appointment.reason}
          </p>
        </div>

        {/* Doctor Status Action Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">Action:</span>
          {appointment.status === 'pending' && (
            <>
              <Button size="sm" variant="success" onClick={() => handleUpdateStatus('confirmed')}>
                Confirm Appointment
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleUpdateStatus('cancelled')}>
                Reject Visit
              </Button>
            </>
          )}
          {appointment.status === 'confirmed' && (
            <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus('completed')}>
              Mark Consultation Finished
            </Button>
          )}
        </div>
      </Card>

      {/* Linked Case Section */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          Clinical Case Management
        </h2>

        {appointment.cases && appointment.cases.length > 0 ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800">Active Case Opened</p>
              <p className="text-sm font-bold text-emerald-950 mt-1">
                {appointment.cases[0].diagnosis}
              </p>
            </div>
            <Link
              href={`/cases/${appointment.cases[0].id}`}
              className="text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Open Case File & Treatment Billing →
            </Link>
          </div>
        ) : appointment.status === 'confirmed' ? (
          <form onSubmit={handleOpenCase} className="space-y-4">
            <p className="text-xs text-slate-600">
              Open a formal medical case to diagnose, prescribe, and itemize treatment procedures for insurance claims.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Diagnosis</label>
              <input
                type="text"
                required
                placeholder="e.g. Acute Bronchitis, ICD-10 J20.9"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Treatment Plan</label>
              <textarea
                required
                rows={3}
                placeholder="Prescription, lab tests ordered, and follow-up protocol..."
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <Button type="submit" size="sm" loading={openingCase}>
              + Open Formal Clinical Case
            </Button>
          </form>
        ) : (
          <p className="text-xs text-slate-400">
            Appointment must be confirmed before opening a clinical case.
          </p>
        )}
      </Card>
    </div>
  );
}
