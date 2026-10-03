'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { StatsCard } from '../../../components/dashboard/StatsCard';
import { Card } from '../../../components/ui/Card';

export default function VerificationDashboardPage() {
  const [stats, setStats] = useState<any>({
    pending_branch_applications: 0,
    pending_family_requests: 0,
    pending_claims: 0,
    active_hospitals: 0,
    registered_patients: 0,
    total_approved_amount_this_month: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiClient.get<any>('/dashboard/stats');
        if (res.data) setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verification & Adjudication Desk</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review queues for hospital credentials, family member affiliations, and policy claim payouts
        </p>
      </div>

      {/* Grid of Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatsCard
          label="Pending Branch Licenses"
          value={stats.pending_branch_applications}
          icon="🏥"
          color="amber"
          subtext="Hospital onboarding applications"
        />

        <StatsCard
          label="Pending Claims for Review"
          value={stats.pending_claims}
          icon="📝"
          color="rose"
          subtext="Itemized clinical reimbursement files"
        />

        <StatsCard
          label="Family Member Requests"
          value={stats.pending_family_requests}
          icon="👨‍👩‍👧"
          color="indigo"
          subtext="Dependent enrollment verifications"
        />

        <StatsCard
          label="Active Network Hospitals"
          value={stats.active_hospitals}
          icon="🏢"
          color="emerald"
          subtext="Accredited healthcare centers"
        />

        <StatsCard
          label="Enrolled Patients"
          value={stats.registered_patients}
          icon="👤"
          color="blue"
          subtext="Verified primary account holders"
        />

        <StatsCard
          label="Settled This Month"
          value={`$${Number(stats.total_approved_amount_this_month).toLocaleString()}`}
          icon="💵"
          color="emerald"
          subtext="Authorized insurance payouts"
        />
      </div>

      {/* Quick Action Queues */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <span className="text-3xl">🏥</span>
            <h3 className="font-bold text-slate-900 text-base mt-2">Hospital Applications</h3>
            <p className="text-xs text-slate-500 mt-1">
              Verify medical board licenses, facility addresses, and designate primary admin contacts.
            </p>
          </div>
          <Link
            href="/branch-applications"
            className="mt-4 inline-block text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-center"
          >
            Open Onboarding Queue →
          </Link>
        </Card>

        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <span className="text-3xl">📝</span>
            <h3 className="font-bold text-slate-900 text-base mt-2">Claims Adjudication</h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspect clinical notes, treatment bills, coverage deductibles, and authorize payouts.
            </p>
          </div>
          <Link
            href="/claims"
            className="mt-4 inline-block text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-center"
          >
            Open Claims Adjudication →
          </Link>
        </Card>

        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <span className="text-3xl">👨‍👩‍👧</span>
            <h3 className="font-bold text-slate-900 text-base mt-2">Family Enrollments</h3>
            <p className="text-xs text-slate-500 mt-1">
              Authorize dependent relationship proofs for spouses, children, and parents.
            </p>
          </div>
          <Link
            href="/family-requests"
            className="mt-4 inline-block text-xs font-semibold px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-center"
          >
            Review Family Requests →
          </Link>
        </Card>
      </div>
    </div>
  );
}
