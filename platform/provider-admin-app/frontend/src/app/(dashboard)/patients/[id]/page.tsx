'use client';

import { useState, useEffect } from 'react';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/${params.id}`)
      .then(res => res.json())
      .then(data => setPatient(data.data));
  }, [params.id]);

  if (!patient) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div><strong>Patient ID:</strong> {patient.id}</div>
        <div><strong>Name:</strong> {patient.first_name} {patient.last_name}</div>
        <div><strong>Date of Birth:</strong> {patient.date_of_birth}</div>
        <div><strong>Gender:</strong> {patient.gender}</div>
        <div><strong>Contact:</strong> {patient.contact_number}</div>
      </div>
    </div>
  );
}
