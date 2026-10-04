'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const [caseData, setCaseData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${params.id}`)
      .then(res => res.json())
      .then(data => setCaseData(data.data));
  }, [params.id]);

  const handleClose = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${params.id}/close`, {
      method: 'PATCH',
    });
    router.refresh();
  };

  if (!caseData) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Case Details</h1>
        {caseData.status === 'open' && (
          <button onClick={handleClose} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
            Close Case
          </button>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div><strong>Patient ID:</strong> {caseData.patient_id}</div>
        <div><strong>Status:</strong> {caseData.status}</div>
        <div><strong>Diagnosis:</strong> {caseData.diagnosis}</div>
        <div><strong>Treatment Plan:</strong> {caseData.treatment_plan}</div>
      </div>
    </div>
  );
}
