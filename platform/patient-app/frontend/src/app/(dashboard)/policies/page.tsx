'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<any[]>('/profile/policies');
        setPolicies(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insurance Policies</h1>
          <p className="text-sm text-slate-500">Your registered health coverage policies</p>
        </div>
        <Link
          href="/policies/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Add Policy
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading policies...</p>
      ) : policies.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 text-sm">No insurance policies registered.</p>
          <Link href="/policies/add" className="text-blue-600 text-xs font-semibold hover:underline mt-2 inline-block">
            Register your health insurance policy
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((p) => (
            <Card key={p.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{p.provider_name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Policy #{p.policy_number}</p>
                </div>
                <Badge variant={p.is_active ? 'success' : 'default'}>
                  {p.is_active ? 'Active' : 'Expired'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Coverage Type:</span>
                  <p className="font-semibold text-slate-800">{p.coverage_type}</p>
                </div>
                <div>
                  <span className="text-slate-500">Max Limit:</span>
                  <p className="font-bold text-green-600 text-sm">${Number(p.coverage_limit).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">Deductible:</span>
                  <p className="font-semibold text-slate-800">${Number(p.deductible).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">Valid Through:</span>
                  <p className="font-semibold text-slate-800">{new Date(p.end_date).toLocaleDateString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
