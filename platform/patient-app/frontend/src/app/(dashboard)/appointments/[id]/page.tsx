'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { createClient } from '../../../../lib/supabase/client';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

export default function AppointmentDetailPage() {
  const { id } = useParams() as { id: string };
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadAppointment() {
      try {
        const res = await apiClient.get<any>(`/appointments/${id}`);
        setAppointment(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAppointment();

    // Realtime subscription on this appointment
    const channel = supabase
      .channel(`appointment-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${id}`,
        },
        (payload: any) => {
          setAppointment((prev: any) => ({
            ...prev,
            status: payload.new.status,
            notes: payload.new.notes,
            updated_at: payload.new.updated_at,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return <div className="text-slate-500 text-sm">Loading appointment details...</div>;
  }

  if (!appointment) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Appointment not found or access denied.</p>
        <Link href="/appointments" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
          ← Back to Appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/appointments" className="text-xs text-blue-600 hover:underline">
          ← Back to Appointments
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-slate-900">Appointment Details</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Live Status:</span>
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
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Scheduled Date & Time</p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {new Date(appointment.scheduled_at).toLocaleDateString()} at{' '}
              {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Appointment ID</p>
            <p className="text-sm font-mono text-slate-700 mt-1">{appointment.id}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500">Reason for Visit</p>
          <p className="text-sm text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {appointment.reason}
          </p>
        </div>

        {appointment.notes && (
          <div>
            <p className="text-xs text-slate-500">Doctor / Clinic Notes</p>
            <p className="text-sm text-slate-800 mt-1 bg-amber-50/50 p-3 rounded-lg border border-amber-200">
              {appointment.notes}
            </p>
          </div>
        )}

        <div className="pt-2 text-xs text-slate-400">
          Created: {new Date(appointment.created_at).toLocaleString()} • Last Updated:{' '}
          {new Date(appointment.updated_at).toLocaleString()}
        </div>
      </Card>
    </div>
  );
}
