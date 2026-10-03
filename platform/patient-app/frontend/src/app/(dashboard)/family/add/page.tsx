'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';

export default function AddFamilyMemberPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('spouse');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/profile/family-members', {
        full_name: fullName,
        relationship,
        date_of_birth: dob,
        email,
      });

      router.push('/family');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit family member enrollment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/family" className="text-xs text-blue-600 hover:underline">
          ← Back to Family
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Add Dependent Family Member</h1>
        <p className="text-sm text-slate-500">
          Enroll a spouse, child, or parent under your primary account
        </p>
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="spouse">Spouse</option>
              <option value="child">Child / Dependent</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="family.member@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Submitting Application...' : 'Submit Family Enrollment'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
