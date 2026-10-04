'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/appointments', label: 'Appointments', icon: '📅' },
    { href: '/dashboard/claims', label: 'Claims', icon: '📄' },
    { href: '/dashboard/documents', label: 'Documents', icon: '📁' },
    { href: '/dashboard/family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { href: '/dashboard/policies', label: 'Policies', icon: '🛡️' },
    { href: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white border-r flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-blue-700">HealthVault</h1>
        <p className="text-xs text-gray-500 mt-1">Patient Portal</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
