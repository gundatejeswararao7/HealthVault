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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-800">Hospital Staff Operations</span>
        <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold uppercase">
          {role || 'Provider'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500">{email}</span>
        <div className="h-5 w-px bg-slate-200" />
        <button
          onClick={handleSignOut}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
