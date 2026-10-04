'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function AppointmentsPage() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: '10'
      });
      if (status !== 'all') queryParams.append('status', status);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (res.ok) {
        setData(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, status, supabase]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Link href="/dashboard/appointments/new" className="bg-blue-600 text-white px-4 py-2 rounded shadow-sm hover:bg-blue-700">
          Book Appointment
        </Link>
      </div>

      <div className="flex gap-4 border-b">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(t => (
          <button
            key={t}
            className={`py-2 px-4 capitalize ${status === t ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500'}`}
            onClick={() => { setStatus(t); setPage(1); }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div>Loading appointments...</div>
      ) : (
        <div className="grid gap-4">
          {data.length === 0 ? (
            <div className="text-gray-500">No appointments found.</div>
          ) : (
            data.map(app => (
              <Card key={app.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">Hospital: {app.hospital_id}</h3>
                    <p className="text-gray-600 text-sm mt-1">{new Date(app.scheduled_at).toLocaleString()}</p>
                    <p className="text-gray-800 mt-2">{app.reason}</p>
                  </div>
                  <Badge status={app.status} />
                </div>
                <div className="mt-4">
                  <Link href={`/dashboard/appointments/${app.id}`} className="text-blue-600 text-sm font-medium hover:underline">
                    View Details
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button 
          disabled={page === 1} 
          onClick={() => setPage(p => p - 1)}
          className="px-4 py-2 border rounded disabled:opacity-50 bg-white"
        >
          Previous
        </button>
        <button 
          onClick={() => setPage(p => p + 1)}
          className="px-4 py-2 border rounded bg-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
