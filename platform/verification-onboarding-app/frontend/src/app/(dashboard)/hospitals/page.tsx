'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function HospitalsManagementPage() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHospitals = async () => {
    try {
      const res = await apiClient.get<any[]>('/hospitals');
      setHospitals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to change hospital status to ${nextStatus}?`)) return;

    try {
      await apiClient.patch(`/hospitals/${id}/status`, { status: nextStatus });
      await loadHospitals();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accredited Network Hospitals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain provider network registries, active statuses, and credentialed facility users
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading hospitals...</p>
      ) : hospitals.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No hospitals registered on the network.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hospitals.map((h) => (
            <Card key={h.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{h.name}</h3>
                  <Badge
                    variant={
                      h.status === 'active'
                        ? 'success'
                        : h.status === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {h.status}
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 mt-2 space-y-1">
                  <p>License: <strong className="font-mono">{h.license_number}</strong></p>
                  <p>Facility Address: {h.address}</p>
                  <p>Contact: {h.email} • {h.phone}</p>
                  <p className="text-slate-400">Created: {new Date(h.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(h.id, h.status)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded transition ${
                    h.status === 'active'
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {h.status === 'active' ? 'Suspend Hospital' : 'Reactivate Hospital'}
                </button>

                <Link
                  href={`/hospitals/${h.id}`}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  View Facility Users & Applications →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
