'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases`)
      .then(res => res.json())
      .then(data => setCases(data.data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diagnosis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases.map((c) => (
              <tr key={c.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{c.patient_id}</td>
                <td className="px-6 py-4 text-sm">{c.diagnosis}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{c.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/cases/${c.id}`} className="text-blue-600 hover:text-blue-900">
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
