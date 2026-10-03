'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { createClient } from '../../../lib/supabase/client';

export default function PublicBranchApplyPage() {
  const supabase = createClient();

  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload a scanned copy of your operating medical license.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 1. Upload license directly to public/licenses bucket
      const timestamp = Date.now();
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `applications/${timestamp}_${safeFilename}`;

      const { error: storageError } = await supabase.storage
        .from('licenses')
        .upload(storagePath, file, { contentType: file.type });

      if (storageError) {
        throw new Error(`License upload failed: ${storageError.message}`);
      }

      // 2. Submit application record to backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003'}/api/v1/branch-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          license_number: licenseNumber,
          address,
          phone,
          email,
          license_document_path: `licenses/${storagePath}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit application');
      }

      setSubmittedId(json.data?.id || 'APPL-CONFIRMED');
    } catch (err: any) {
      setError(err.message || 'Application submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <span className="text-3xl">🏥</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-2">
            Healthcare Branch Onboarding
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Apply for accreditation and join the unified insurance network
          </p>
        </div>

        {submittedId ? (
          <Card className="p-8 text-center space-y-4 border-emerald-200 bg-emerald-50/40">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-900">Application Submitted for Compliance Review</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your hospital branch credentials and license document have entered the insurer adjudication review queue.
            </p>
            <p className="font-mono text-xs bg-white py-2 px-4 rounded-lg border border-emerald-200 inline-block text-emerald-800">
              Reference ID: {submittedId}
            </p>
            <div className="pt-4">
              <Link href="/login" className="text-xs font-semibold text-indigo-600 hover:underline">
                Return to Portal Sign In →
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital / Clinic Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="Memorial Community Health System"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State License Number</label>
                  <input
                    type="text"
                    required
                    placeholder="LIC-2024-9981"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 019-2831"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Contact Email</label>
                <input
                  type="email"
                  required
                  placeholder="admin@memorialhealth.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Facility Address</label>
                <input
                  type="text"
                  required
                  placeholder="100 Hospital Blvd, Suite 200, City, State, ZIP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Scanned License Document (PDF / JPG)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition text-sm disabled:opacity-50"
                >
                  {submitting ? 'Encrypting & Submitting Credentials...' : 'Submit Application for Verification'}
                </button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
