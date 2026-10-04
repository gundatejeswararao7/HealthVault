'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';

export default function NewAppointmentPage() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [hospitalId, setHospitalId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data, error } = await supabase.from('hospitals').select('id,name').eq('status', 'active');
      if (data) setHospitals(data);
      if (error) console.error('Error fetching hospitals', error);
    };
    fetchHospitals();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (reason.length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          hospital_id: hospitalId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          reason
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to book appointment');
      }

      router.push('/dashboard/appointments');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Book Appointment</h1>
      
      <Card>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Hospital</label>
            <select
              required
              className="w-full p-2 border rounded"
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
            >
              <option value="">Select a hospital...</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date & Time</label>
            <input
              type="datetime-local"
              required
              className="w-full p-2 border rounded"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason for Visit</label>
            <textarea
              required
              className="w-full p-2 border rounded min-h-[100px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe your symptoms or reason for visit (min 10 characters)"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>
        </form>
      </Card>
    </div>
  );
}
