'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

export default function VerificationLoginPage() {
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

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center mx-auto text-2xl mb-3">
            🛡️
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Verification & Adjudication</h1>
          <p className="text-xs text-slate-500 mt-1">Insurer Officers & Regulatory Auditors</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Staff / Insurer Email
              </label>
              <input
                type="email"
                required
                placeholder="officer@insurance.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send Secure Passcode'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter 6-Digit Passcode
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Authenticate & Enter Dashboard'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Applying as a new hospital facility?{' '}
            <Link href="/apply" className="text-indigo-600 font-semibold hover:underline">
              Submit Branch Application
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
