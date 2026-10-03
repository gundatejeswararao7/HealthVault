'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { StatusBar } from '../../../components/queue/StatusBar';
import { QueueItem } from '../../../components/queue/QueueItem';
import { Card } from '../../../components/ui/Card';

export default function QueuePage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    try {
      const [queueRes, statsRes] = await Promise.allSettled([
        apiClient.get<any[]>('/queue'),
        apiClient.get<any>('/queue/stats'),
      ]);

      if (queueRes.status === 'fulfilled' && queueRes.value.data) {
        setItems(queueRes.value.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, { status: newStatus });
      await loadQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeFilter !== 'all' && item.status !== activeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const patientName = item.patients?.full_name?.toLowerCase() || '';
      const reason = item.reason?.toLowerCase() || '';
      return patientName.includes(term) || reason.includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Request Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time incoming appointments, triages, and check-in verifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search patient or symptom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
          <button
            onClick={loadQueue}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <StatusBar
        stats={stats}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading incoming clinical queue...</p>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No patients matching current queue filter.
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <QueueItem
              key={item.id}
              item={item}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
