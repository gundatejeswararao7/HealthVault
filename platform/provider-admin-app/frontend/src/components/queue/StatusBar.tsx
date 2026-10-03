import React from 'react';

interface StatusBarProps {
  stats: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  activeFilter: string;
  onSelectFilter: (status: string) => void;
}

export function StatusBar({ stats, activeFilter, onSelectFilter }: StatusBarProps) {
  const items = [
    { key: 'all', label: 'All Requests', count: stats.pending + stats.confirmed + stats.completed + stats.cancelled, color: 'text-slate-800' },
    { key: 'pending', label: 'Action Required', count: stats.pending, color: 'text-amber-600' },
    { key: 'confirmed', label: 'Confirmed Visits', count: stats.confirmed, color: 'text-emerald-600' },
    { key: 'completed', label: 'Completed', count: stats.completed, color: 'text-blue-600' },
    { key: 'cancelled', label: 'Cancelled', count: stats.cancelled, color: 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onSelectFilter(it.key)}
          className={`p-3 rounded-xl border text-left transition ${
            activeFilter === it.key
              ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{it.label}</p>
          <p className={`text-2xl font-bold mt-1 ${it.color}`}>{it.count}</p>
        </button>
      ))}
    </div>
  );
}
