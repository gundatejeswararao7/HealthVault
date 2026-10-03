'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const query = filter !== 'all' ? `?status=${filter}` : '';
        const res = await apiClient.get<any[]>(`/appointments${query}`);
        setAppointments(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">View and manage your scheduled hospital visits</p>
        </div>
        <Link
          href="/appointments/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Book Appointment
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
              filter === tab
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 text-sm">No appointments found.</p>
          <Link
            href="/appointments/new"
            className="text-blue-600 text-xs font-semibold hover:underline mt-2 inline-block"
          >
            Book your first appointment now
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => (
            <Card key={appt.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {appt.id.slice(0, 8)}...
                  </span>
                  <Badge
                    variant={
                      appt.status === 'confirmed'
                        ? 'success'
                        : appt.status === 'pending'
                        ? 'warning'
                        : appt.status === 'completed'
                        ? 'info'
                        : 'danger'
                    }
                  >
                    {appt.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-slate-800 text-base mt-2">{appt.reason}</h3>
                <p className="text-xs text-slate-500 mt-2">
                  📅 {new Date(appt.scheduled_at).toLocaleDateString()} at{' '}
                  {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {appt.notes && (
                  <p className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2 rounded">
                    "{appt.notes}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                <Link
                  href={`/appointments/${appt.id}`}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View Details & Live Status →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
