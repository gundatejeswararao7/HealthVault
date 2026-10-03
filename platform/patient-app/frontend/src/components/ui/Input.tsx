import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  required,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        required={required}
        className={[
          'block w-full rounded-md border px-3 py-2 text-sm shadow-sm',
          'placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
          error
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
