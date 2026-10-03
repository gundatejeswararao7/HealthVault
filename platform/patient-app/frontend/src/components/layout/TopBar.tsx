'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { NotificationBell } from '../realtime/NotificationBell';

interface TopBarProps {
  userEmail?: string;
  patientName?: string;
}

export function TopBar({ userEmail, patientName }: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">
          Welcome back, <strong className="text-slate-900">{patientName || userEmail || 'Patient'}</strong>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="h-6 w-px bg-slate-200" />
        <button
          onClick={handleLogout}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
