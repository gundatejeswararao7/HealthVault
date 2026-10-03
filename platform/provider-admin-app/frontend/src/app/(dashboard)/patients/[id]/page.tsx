'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

export default function PatientDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<any>(`/patients/${id}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="text-slate-500 text-sm">Accessing scoped patient record...</div>;
  if (error || !data) return (
    <div className="p-6 bg-red-50 text-red-700 text-sm rounded-xl">
      {error || 'Patient access restricted by branch scoping policy.'}
    </div>
  );

  const { patient, appointments, cases } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/patients" className="text-xs text-emerald-600 hover:underline">
          ← Back to Patients
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Patient Clinical History</h1>
        <p className="text-xs text-slate-500">Defense-in-depth verified: care relationship active</p>
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Demographics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Name</p>
            <p className="font-bold text-slate-900 mt-1">{patient.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Gender</p>
            <p className="font-semibold text-slate-800 capitalize mt-1">{patient.gender}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Date of Birth</p>
            <p className="font-semibold text-slate-800 mt-1">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Phone</p>
            <p className="font-semibold text-slate-800 mt-1">{patient.phone}</p>
          </div>
        </div>
      </Card>

      {/* Clinical Cases History */}
      <Card className="p-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Cases Treated at this Hospital ({cases.length})
        </h2>
        {cases.length === 0 ? (
          <p className="text-xs text-slate-400">No medical cases recorded at this facility.</p>
        ) : (
          <div className="space-y-3">
            {cases.map((c: any) => (
              <div key={c.id} className="p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{c.diagnosis}</h3>
                  <Badge variant={c.closed_at ? 'default' : 'success'}>
                    {c.closed_at ? 'Closed' : 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">Plan: {c.treatment_plan}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                  <span>Opened: {new Date(c.opened_at).toLocaleDateString()}</span>
                  <Link href={`/cases/${c.id}`} className="text-emerald-600 font-semibold hover:underline">
                    View Case File & Billing →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Appointment History */}
      <Card className="p-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Appointment History ({appointments.length})
        </h2>
        <div className="space-y-2">
          {appointments.map((appt: any) => (
            <div key={appt.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">{appt.reason}</span>
                <p className="text-slate-500 mt-0.5">{new Date(appt.scheduled_at).toLocaleString()}</p>
              </div>
              <Badge variant={appt.status === 'confirmed' ? 'success' : appt.status === 'pending' ? 'warning' : 'default'}>
                {appt.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
