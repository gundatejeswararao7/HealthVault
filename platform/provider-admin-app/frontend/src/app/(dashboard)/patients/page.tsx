'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients`)
      .then(res => res.json())
      .then(data => setPatients(data.data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{p.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{p.first_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{p.last_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/patients/${p.id}`} className="text-blue-600 hover:text-blue-900">
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
