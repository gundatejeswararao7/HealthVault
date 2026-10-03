'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

export default function LoginPage() {
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

    // Defense: Validate email domain
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Please use a valid @gmail.com email address per platform requirements.');
      return;
    }

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Patient Portal Login</h1>
          <p className="text-sm text-slate-600 mt-2">
            Secure passwordless login with OTP verification
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gmail Address
              </label>
              <input
                type="email"
                required
                placeholder="patient@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">Must be an @gmail.com address</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send Login OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                required
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm tracking-widest text-center text-lg"
              />
              <p className="text-xs text-slate-500 mt-1">Check your inbox at {email}</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-slate-600 hover:text-slate-900 text-xs text-center block mt-2"
            >
              ← Use a different email
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-semibold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
