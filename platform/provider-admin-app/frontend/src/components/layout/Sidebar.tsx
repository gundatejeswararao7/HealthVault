'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  role?: string;
}

export function Sidebar({ role = 'provider' }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/queue', label: 'Incoming Queue', icon: '📥' },
    { href: '/cases', label: 'Clinical Cases', icon: '🩺' },
    { href: '/patients', label: 'Patient Records', icon: '👤' },
  ];

  if (role === 'admin') {
    navItems.push(
      { href: '/family-requests', label: 'Family Requests', icon: '👨‍👩‍👦' },
      { href: '/audit-logs', label: 'Audit Trail', icon: '📜' }
    );
  }

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
          ClinicalPortal
        </h1>
        <p className="text-xs text-slate-400 mt-1 capitalize">{role} Workplace</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
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
        <p>Hospital Scope Enforced</p>
        <p className="mt-1">Defense-in-Depth RLS</p>
      </div>
    </aside>
  );
}
