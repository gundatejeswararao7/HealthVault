'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

export default function ProviderLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.push('/queue');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mx-auto text-2xl mb-3">
            🩺
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Provider & Admin Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Authorized Medical & Administrative Personnel Only</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Staff Email
              </label>
              <input
                type="email"
                required
                placeholder="doctor@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send Access OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter 6-Digit Staff OTP
              </label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center text-lg tracking-widest"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Verify & Enter Clinical Queue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
