'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FamilyRequestDetailPage({ params }: { params: { id: string } }) {
  const [req, setReq] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/family-requests/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setReq(data.data);
        setStatus(data.data.status);
      });
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/family-requests/${params.id}/decision`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, decision_reason: reason }),
    });
    router.push('/family-requests');
  };

  if (!req) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Review Family Request</h1>
      
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div><strong>Primary Patient:</strong> {req.primary_patient_id}</div>
        <div><strong>Member Name:</strong> {req.member_name}</div>
        <div><strong>Relationship:</strong> {req.relationship}</div>
        <div><strong>Current Status:</strong> {req.status}</div>
        
        {req.status === 'pending' && (
          <form onSubmit={handleUpdate} className="space-y-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">Decision</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Submit Decision
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
