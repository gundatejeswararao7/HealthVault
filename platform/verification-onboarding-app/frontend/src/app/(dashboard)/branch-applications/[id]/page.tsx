'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../lib/api';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { DecisionModal } from '../../../../components/review/DecisionModal';
import { StatusTimeline } from '../../../../components/review/StatusTimeline';

export default function BranchApplicationDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplication = async () => {
    try {
      const res = await apiClient.get<any>(`/branch-applications/${id}`);
      setApp(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [id]);

  const handleDecision = async (decision: any) => {
    await apiClient.patch(`/branch-applications/${id}/decision`, decision);
    await loadApplication();
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading application dossier...</div>;
  if (error || !app) return <div className="text-rose-500 text-sm">{error || 'Application not found'}</div>;

  const timelineSteps = [
    {
      title: 'Application Submitted',
      description: 'Hospital facility and license document submitted',
      timestamp: app.created_at,
      completed: true,
    },
    {
      title: 'Compliance Review',
      description: 'License verification and accreditation check',
      completed: app.status === 'approved' || app.status === 'rejected',
      current: app.status === 'under_review' || app.status === 'pending',
    },
    {
      title: app.status === 'approved' ? 'Accredited & Active' : app.status === 'rejected' ? 'Application Rejected' : 'Final Accreditation',
      description: app.decision_reason || (app.status === 'approved' ? 'Hospital active on network' : 'Awaiting final decision'),
      timestamp: app.reviewed_at,
      completed: app.status === 'approved',
      failed: app.status === 'rejected',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/branch-applications" className="text-xs text-indigo-600 hover:underline">
          ← Back to Applications
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{app.hospitals?.name}</h1>
            <p className="text-xs text-slate-500 font-mono">Application #{app.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                app.status === 'approved'
                  ? 'success'
                  : app.status === 'pending'
                  ? 'warning'
                  : app.status === 'under_review'
                  ? 'info'
                  : 'danger'
              }
            >
              {app.status}
            </Badge>
            {app.status !== 'approved' && app.status !== 'rejected' && (
              <Button size="sm" onClick={() => setShowModal(true)}>
                Record Compliance Decision
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Dossier Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Facility Credentials</h2>

            <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Operating License Number</p>
                <p className="font-mono font-bold text-slate-900 mt-1">{app.hospitals?.license_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Facility Contact Email</p>
                <p className="font-semibold text-slate-800 mt-1">{app.hospitals?.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Direct Phone</p>
                <p className="font-semibold text-slate-800 mt-1">{app.hospitals?.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Network Hospital Status</p>
                <p className="font-semibold text-slate-800 mt-1 capitalize">{app.hospitals?.status}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">Registered Physical Address</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{app.hospitals?.address}</p>
            </div>

            {/* License File Card */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">State Medical Operating License</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{app.license_document_path}</p>
                </div>
              </div>
              {app.license_download_url && (
                <a
                  href={app.license_download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
                >
                  View Document ↗
                </a>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Review Status Timeline */}
        <div>
          <Card className="p-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Adjudication Pipeline</h2>
            <StatusTimeline steps={timelineSteps} />
          </Card>
        </div>
      </div>

      <DecisionModal
        isOpen={showModal}
        title={`Adjudicate Hospital Application: ${app.hospitals?.name}`}
        onClose={() => setShowModal(false)}
        onSubmit={handleDecision}
      />
    </div>
  );
}
