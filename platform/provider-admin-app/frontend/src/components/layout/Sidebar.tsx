'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/queue', label: 'Queue' },
    { href: '/appointments', label: 'Appointments' },
    { href: '/cases', label: 'Cases' },
    { href: '/patients', label: 'Patients' },
    { href: '/family-requests', label: 'Family Requests' },
    { href: '/audit-logs', label: 'Audit Logs' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Provider Portal</h1>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-2 rounded-md text-sm font-medium ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
