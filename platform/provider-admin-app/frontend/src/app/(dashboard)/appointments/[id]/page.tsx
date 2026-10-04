'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppointmentDetailPage({ params }: { params: { id: string } }) {
  const [apt, setApt] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setApt(data.data);
        setStatus(data.data.status);
        setNotes(data.data.notes || '');
      });
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments/${params.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    router.refresh();
  };

  const handleOpenCase = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appointments/${params.id}/case`, {
      method: 'POST',
    });
    router.push('/cases');
  };

  if (!apt) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div><strong>Patient ID:</strong> {apt.patient_id}</div>
        <div><strong>Scheduled At:</strong> {new Date(apt.scheduled_at).toLocaleString()}</div>
        <div><strong>Reason:</strong> {apt.reason}</div>
        
        <form onSubmit={handleUpdate} className="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Update Appointment
          </button>
        </form>

        {status === 'confirmed' && (
          <div className="pt-4 border-t border-gray-200">
            <button onClick={handleOpenCase} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
              Open Case
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
