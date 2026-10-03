'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { createClient } from '../../../../lib/supabase/client';

export default function NewAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalId, setHospitalId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHospitals() {
      const { data } = await supabase
        .from('hospitals')
        .select('id, name, address')
        .eq('status', 'active');
      if (data && data.length > 0) {
        setHospitals(data);
        setHospitalId(data[0].id);
      }
    }
    loadHospitals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.length < 10) {
      setError('Please provide a reason with at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/appointments', {
        hospital_id: hospitalId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        reason,
      });

      router.push('/appointments');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/appointments" className="text-xs text-blue-600 hover:underline">
          ← Back to Appointments
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Book an Appointment</h1>
        <p className="text-sm text-slate-500">
          Select an accredited healthcare facility and convenient schedule
        </p>
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Healthcare Facility
            </label>
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              required
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.address})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason for Visit / Symptoms
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe your health concern or symptoms (min 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Submitting Request...' : 'Confirm Appointment Booking'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
