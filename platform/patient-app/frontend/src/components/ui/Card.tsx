import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        padding ? 'p-6' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
