import React from 'react';

type BadgeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'processing'
  | 'paid'
  | 'denied'
  | 'submitted'
  | 'read'
  | 'unread'
  | string;

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

const colorMap: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  submitted: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  approved: 'bg-green-100 text-green-800 ring-green-200',
  active: 'bg-green-100 text-green-800 ring-green-200',
  confirmed: 'bg-green-100 text-green-800 ring-green-200',
  completed: 'bg-blue-100 text-blue-800 ring-blue-200',
  paid: 'bg-blue-100 text-blue-800 ring-blue-200',
  read: 'bg-gray-100 text-gray-600 ring-gray-200',
  rejected: 'bg-red-100 text-red-800 ring-red-200',
  cancelled: 'bg-red-100 text-red-800 ring-red-200',
  denied: 'bg-red-100 text-red-800 ring-red-200',
  processing: 'bg-purple-100 text-purple-800 ring-purple-200',
  unread: 'bg-brand-100 text-brand-800 ring-brand-200',
};

function getColor(status: string): string {
  return colorMap[status.toLowerCase()] ?? 'bg-gray-100 text-gray-700 ring-gray-200';
}

export function Badge({ status, label, className = '' }: BadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
        getColor(status),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {displayLabel}
    </span>
  );
}
