'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';

export default function HospitalDetailPage() {
  const { id } = useParams() as { id: string };
  const [hospital, setHospital] = useState<any>(null);
  const [profileId, setProfileId] = useState('');
  const [designation, setDesignation] = useState('Attending Physician');
  const [addingUser, setAddingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHospital = async () => {
    try {
      const res = await apiClient.get<any>(`/hospitals/${id}`);
      setHospital(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospital();
  }, [id]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      await apiClient.post(`/hospitals/${id}/users`, {
        profile_id: profileId,
        designation,
      });
      setProfileId('');
      await loadHospital();
      alert('Hospital staff member associated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to add hospital user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (userProfileId: string) => {
    if (!confirm('Deactivate staff access at this hospital facility?')) return;
    try {
      await apiClient.delete(`/hospitals/${id}/users/${userProfileId}`);
      await loadHospital();
    } catch (err: any) {
      alert(err.message || 'Failed to remove user');
    }
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading hospital facility registry...</div>;
  if (error || !hospital) return <div className="text-rose-500 text-sm">{error || 'Hospital not found'}</div>;

  const users = hospital.hospital_users || [];
  const applications = hospital.hospital_branch_applications || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/hospitals" className="text-xs text-indigo-600 hover:underline">
          ← Back to Hospitals
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{hospital.name}</h1>
            <p className="text-xs text-slate-500 font-mono">License: {hospital.license_number}</p>
          </div>
          <Badge variant={hospital.status === 'active' ? 'success' : 'warning'}>
            {hospital.status}
          </Badge>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Facility Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Address:</span>
            <p className="font-semibold text-slate-800 mt-0.5">{hospital.address}</p>
          </div>
          <div>
            <span className="text-slate-500">Email:</span>
            <p className="font-semibold text-slate-800 mt-0.5">{hospital.email}</p>
          </div>
          <div>
            <span className="text-slate-500">Phone:</span>
            <p className="font-semibold text-slate-800 mt-0.5">{hospital.phone}</p>
          </div>
        </div>
      </Card>

      {/* Hospital Staff Roster */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Credentialed Medical & Admin Staff ({users.length})
          </h2>
        </div>

        {users.length === 0 ? (
          <p className="text-xs text-slate-400">No active staff members bound to this facility.</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {users.map((u: any) => (
              <div key={u.id} className="p-3.5 bg-white flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{u.designation}</p>
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">Profile: {u.profile_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.is_active ? 'success' : 'default'}>
                    {u.is_active ? 'Active' : 'Deactivated'}
                  </Badge>
                  {u.is_active && (
                    <button
                      onClick={() => handleRemoveUser(u.profile_id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Provider Staff Form */}
        <form onSubmit={handleAddUser} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-700">Add Staff Member to this Facility</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provider Profile UUID</label>
              <input
                type="text"
                required
                placeholder="Profile UUID of provider..."
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clinical Designation</label>
              <input
                type="text"
                required
                placeholder="e.g. Chief of Surgery, Nurse Supervisor"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              />
            </div>
          </div>
          <Button type="submit" size="sm" loading={addingUser}>
            + Authorize Staff Member
          </Button>
        </form>
      </Card>
    </div>
  );
}
