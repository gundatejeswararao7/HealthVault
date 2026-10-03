import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
}
