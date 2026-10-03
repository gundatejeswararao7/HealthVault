'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { apiClient } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'email' | 'otp' | 'profile'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile details
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Please use a valid @gmail.com email address per platform requirements.');
      return;
    }

    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
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

    setStep('profile');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.put('/profile', {
        full_name: fullName,
        date_of_birth: dob,
        gender,
        phone,
        address,
      });

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Patient Registration</h1>
          <p className="text-sm text-slate-600 mt-2">
            Create your account with secure OTP verification
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gmail Address
              </label>
              <input
                type="email"
                required
                placeholder="newpatient@gmail.com"
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
              {loading ? 'Sending OTP...' : 'Send Signup OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Enter Verification OTP
              </label>
              <input
                type="text"
                required
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center text-lg tracking-widest"
              />
              <p className="text-xs text-slate-500 mt-1">Sent to {email}</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">Complete Your Patient Profile</h2>
            <div>
              <label className="block text-xs font-medium text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Date of Birth</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition text-sm disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Profile...' : 'Complete Registration'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Already registered?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-semibold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
