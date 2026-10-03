'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

interface TopBarProps {
  email?: string;
  role?: string;
}

export function TopBar({ email, role }: TopBarProps) {
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
        <span className="text-sm font-semibold text-slate-800">Compliance & Claims Desk</span>
        <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-bold uppercase tracking-wider">
          {role || 'Insurer'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500">{email}</span>
        <div className="h-5 w-px bg-slate-200" />
        <button
          onClick={handleLogout}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
