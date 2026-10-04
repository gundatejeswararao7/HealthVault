'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: 'male',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@gmail.com')) {
      setError('Only @gmail.com emails are supported');
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);

    if (signInError) setError(signInError.message);
    else setStep(2);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    setLoading(false);

    if (verifyError) setError(verifyError.message);
    else setStep(3);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to save profile');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Patient Portal Registration</h1>
        
        {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-2 border rounded"
                placeholder="patient@gmail.com"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full p-2 border rounded"
                placeholder="123456"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" required className="w-full p-2 border rounded" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input type="date" required className="w-full p-2 border rounded" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select className="w-full p-2 border rounded" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="text" required className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea required className="w-full p-2 border rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded">
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link href="/login" className="text-blue-600 text-sm">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
}
