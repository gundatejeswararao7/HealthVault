'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface QueueItemProps {
  item: {
    id: string;
    patient_id: string;
    patients?: { full_name: string; phone: string; email: string };
    scheduled_at: string;
    reason: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    case_id?: string;
  };
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
}

export function QueueItem({ item, onUpdateStatus }: QueueItemProps) {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-300 transition">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-900 text-base">
            {item.patients?.full_name || 'Patient'}
          </h3>
          <Badge
            variant={
              item.status === 'confirmed'
                ? 'success'
                : item.status === 'pending'
                ? 'warning'
                : item.status === 'completed'
                ? 'info'
                : 'danger'
            }
          >
            {item.status}
          </Badge>
        </div>

        <p className="text-sm text-slate-700 font-medium">{item.reason}</p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
          <span>📅 {new Date(item.scheduled_at).toLocaleDateString()} at {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>📞 {item.patients?.phone || 'No phone'}</span>
          <span className="font-mono text-[11px] text-slate-400">ID: {item.id.slice(0, 8)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
        {item.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="success"
              onClick={() => onUpdateStatus(item.id, 'confirmed')}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onUpdateStatus(item.id, 'cancelled')}
            >
              Reject
            </Button>
          </>
        )}

        {item.status === 'confirmed' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onUpdateStatus(item.id, 'completed')}
          >
            Mark Completed
          </Button>
        )}

        <Link
          href={`/appointments/${item.id}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
        >
          View Clinical Record →
        </Link>
      </div>
    </div>
  );
}
