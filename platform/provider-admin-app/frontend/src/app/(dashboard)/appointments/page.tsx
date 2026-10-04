'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments`)
      .then(res => res.json())
      .then(data => {
        setAppointments(data.data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : appointments.map((apt) => (
              <tr key={apt.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{apt.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(apt.scheduled_at).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">{apt.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{apt.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/appointments/${apt.id}`} className="text-blue-600 hover:text-blue-900">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
