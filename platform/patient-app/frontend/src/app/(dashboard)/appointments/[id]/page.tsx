'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function AppointmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAppt = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments/${id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setAppointment(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAppt();

    const channel = supabase.channel(`public:appointments:id=eq.${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `id=eq.${id}` }, (payload) => {
        setAppointment((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  if (loading) return <div>Loading...</div>;
  if (!appointment) return <div>Appointment not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointment Details</h1>
        <Badge status={appointment.status} />
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm text-gray-500 font-medium">Hospital ID</h4>
            <p className="mt-1">{appointment.hospital_id}</p>
          </div>
          <div>
            <h4 className="text-sm text-gray-500 font-medium">Date & Time</h4>
            <p className="mt-1">{new Date(appointment.scheduled_at).toLocaleString()}</p>
          </div>
          <div className="col-span-2">
            <h4 className="text-sm text-gray-500 font-medium">Reason</h4>
            <p className="mt-1">{appointment.reason}</p>
          </div>
          {appointment.case_id && (
            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="text-sm text-gray-500 font-medium">Linked Case ID</h4>
              <p className="mt-1 text-blue-600">{appointment.case_id}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
