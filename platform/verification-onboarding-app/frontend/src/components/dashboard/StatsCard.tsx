import React from 'react';
import { Card } from '../ui/Card';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue';
  subtext?: string;
}

export function StatsCard({ label, value, icon, color = 'indigo', subtext }: StatsCardProps) {
  const colorMap = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
