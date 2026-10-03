'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';

export default function AddPolicyPage() {
  const router = useRouter();
  const [policyNumber, setPolicyNumber] = useState('');
  const [providerName, setProviderName] = useState('');
  const [coverageType, setCoverageType] = useState('Comprehensive Health');
  const [coverageLimit, setCoverageLimit] = useState('');
  const [deductible, setDeductible] = useState('500');
  const [premium, setPremium] = useState('150');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/profile/policies', {
        policy_number: policyNumber,
        provider_name: providerName,
        coverage_type: coverageType,
        coverage_limit: parseFloat(coverageLimit),
        deductible: parseFloat(deductible),
        premium: parseFloat(premium),
        start_date: startDate,
        end_date: endDate,
      });

      router.push('/policies');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add insurance policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/policies" className="text-xs text-blue-600 hover:underline">
          ← Back to Policies
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Register Health Insurance Policy</h1>
        <p className="text-sm text-slate-500">
          Enter policy verification details from your insurance carrier
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Carrier / Provider Name</label>
            <input
              type="text"
              required
              placeholder="e.g. BlueCross BlueShield, Aetna, Cigna"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Policy Number</label>
            <input
              type="text"
              required
              placeholder="POL-8839201"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Coverage Type</label>
            <select
              value={coverageType}
              onChange={(e) => setCoverageType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="Comprehensive Health">Comprehensive Health</option>
              <option value="Hospitalization Only">Hospitalization Only</option>
              <option value="Critical Illness">Critical Illness</option>
              <option value="Dental & Vision">Dental & Vision</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Limit ($)</label>
              <input
                type="number"
                required
                placeholder="100000"
                value={coverageLimit}
                onChange={(e) => setCoverageLimit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deductible ($)</label>
              <input
                type="number"
                required
                value={deductible}
                onChange={(e) => setDeductible(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {loading ? 'Registering Policy...' : 'Save Insurance Policy'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
