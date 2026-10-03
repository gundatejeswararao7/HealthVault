'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/appointments', label: 'Appointments', icon: '📅' },
  { href: '/claims', label: 'Claims', icon: '📝' },
  { href: '/documents', label: 'Documents', icon: '📁' },
  { href: '/family', label: 'Family Members', icon: '👨‍👩‍👧' },
  { href: '/policies', label: 'Policies', icon: '🛡️' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
          CarePortal
        </h1>
        <p className="text-xs text-slate-400 mt-1">Patient & Family Access</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        <p>Security: Supabase Auth + RLS</p>
        <p className="mt-1">Version 1.0.0</p>
      </div>
    </aside>
  );
}
