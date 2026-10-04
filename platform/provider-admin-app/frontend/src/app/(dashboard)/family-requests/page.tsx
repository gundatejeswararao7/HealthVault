'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FamilyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/family-requests`)
      .then(res => res.json())
      .then(data => setRequests(data.data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Family Requests</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primary Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{r.primary_patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{r.member_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{r.relationship}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{r.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/family-requests/${r.id}`} className="text-blue-600 hover:text-blue-900">
                    Review
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
