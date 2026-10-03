'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export default function FamilyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadRequests = async () => {
    try {
      const res = await apiClient.get<any[]>('/family-requests');
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecision = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !decisionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.patch(`/family-requests/${id}/decision`, {
        status,
        decision_reason: decisionReason,
      });
      setSelectedReq(null);
      setDecisionReason('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Family Member Enrollment Review</h1>
        <p className="text-xs text-slate-500 mt-1">
          Admin workflow for approving dependent family members onto patient records
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading enrollment requests...</p>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">
          No family enrollment requests in the queue.
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-900 text-base">{req.full_name}</h3>
                  <Badge variant={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}>
                    {req.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                  <p>Relationship: <strong className="capitalize">{req.relationship}</strong> • DOB: {new Date(req.date_of_birth).toLocaleDateString()}</p>
                  <p>Primary Patient: <strong>{req.patients?.full_name}</strong> ({req.patients?.email})</p>
                  <p className="text-slate-400">Requested: {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {req.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleDecision(req.id, 'approved')}
                    loading={processing}
                  >
                    Approve Enrollment
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setSelectedReq(req)}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Reject Family Member Enrollment</h2>
            <p className="text-xs text-slate-600">
              Please enter the audit-logged reason for rejecting {selectedReq.full_name}'s application.
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Incomplete dependent documentation provided"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setSelectedReq(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={processing}
                onClick={() => handleDecision(selectedReq.id, 'rejected')}
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
