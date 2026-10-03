'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';

export default function NewClaimPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<any[]>([]);
  const [policyId, setPolicyId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [amountClaimed, setAmountClaimed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await apiClient.get<any[]>('/profile/policies');
        if (res.data && res.data.length > 0) {
          setPolicies(res.data);
          setPolicyId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadPolicies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(amountClaimed);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive claim amount.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/claims', {
        policy_id: policyId,
        case_id: caseId,
        amount_claimed: amount,
      });

      router.push('/claims');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/claims" className="text-xs text-blue-600 hover:underline">
          ← Back to Claims
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">File an Insurance Claim</h1>
        <p className="text-sm text-slate-500">
          Link your medical case to an active health insurance policy
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Active Insurance Policy
            </label>
            {policies.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                No active policies found. Please <Link href="/policies/add" className="underline font-semibold">add a policy</Link> first.
              </p>
            ) : (
              <select
                value={policyId}
                onChange={(e) => setPolicyId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                required
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.provider_name} — Policy #{p.policy_number} (Limit: ${Number(p.coverage_limit).toLocaleString()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Medical Case ID (UUID)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">Found in your appointment medical case summary</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Total Amount to Claim ($ USD)
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="1500.00"
              value={amountClaimed}
              onChange={(e) => setAmountClaimed(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || policies.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Filing Claim...' : 'Create Draft Claim'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
