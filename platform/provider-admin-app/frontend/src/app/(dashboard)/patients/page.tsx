'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';

export default function ProviderPatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Patients who had visits at this hospital
        const res = await apiClient.get<any[]>('/queue');
        if (res.data) {
          // Deduplicate patients from appointments queue
          const map = new Map();
          res.data.forEach((appt: any) => {
            if (appt.patient_id && !map.has(appt.patient_id)) {
              map.set(appt.patient_id, {
                id: appt.patient_id,
                ...appt.patients,
                lastVisit: appt.scheduled_at,
              });
            }
          });
          setPatients(Array.from(map.values()));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patient Medical Records</h1>
        <p className="text-xs text-slate-500 mt-1">
          Access scoped patient histories for individuals with confirmed care relationships at your hospital
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading patient roster...</p>
      ) : patients.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No patient records linked to your hospital branch yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patients.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {p.full_name ? p.full_name.slice(0, 2).toUpperCase() : 'PT'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{p.full_name}</h3>
                    <p className="text-xs text-slate-500">{p.phone || 'No phone'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p>Email: {p.email || 'N/A'}</p>
                  <p>Last Scheduled Visit: {new Date(p.lastVisit).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Link
                  href={`/patients/${p.id}`}
                  className="text-xs font-semibold text-emerald-600 hover:underline"
                >
                  View Clinical History →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
