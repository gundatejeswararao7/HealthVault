'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface DecisionModalProps {
  isOpen: boolean;
  title: string;
  type?: 'generic' | 'claim';
  maxAmount?: number;
  onClose: () => void;
  onSubmit: (decision: {
    status: 'approved' | 'rejected' | 'under_review';
    decision_reason?: string;
    amount_approved?: number;
  }) => Promise<void>;
}

export function DecisionModal({
  isOpen,
  title,
  type = 'generic',
  maxAmount,
  onClose,
  onSubmit,
}: DecisionModalProps) {
  const [status, setStatus] = useState<'approved' | 'rejected' | 'under_review'>('approved');
  const [reason, setReason] = useState('');
  const [amountApproved, setAmountApproved] = useState(maxAmount ? String(maxAmount) : '');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'rejected' && !reason.trim()) {
      alert('A decision reason is strictly required when rejecting a submission.');
      return;
    }

    if (type === 'claim' && status === 'approved') {
      const amt = parseFloat(amountApproved);
      if (isNaN(amt) || amt <= 0 || (maxAmount && amt > maxAmount)) {
        alert(`Approved amount must be positive and less than or equal to claimed amount ($${maxAmount})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        status,
        decision_reason: reason.trim() || undefined,
        amount_approved: type === 'claim' && status === 'approved' ? parseFloat(amountApproved) : undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <Card className="max-w-lg w-full p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Recorded in immutable audit trail with your reviewer identity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Review Decision</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-emerald-700">
                <input
                  type="radio"
                  name="status"
                  value="approved"
                  checked={status === 'approved'}
                  onChange={() => setStatus('approved')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Approve
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-amber-700">
                <input
                  type="radio"
                  name="status"
                  value="under_review"
                  checked={status === 'under_review'}
                  onChange={() => setStatus('under_review')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                Request Info / Under Review
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-rose-700">
                <input
                  type="radio"
                  name="status"
                  value="rejected"
                  checked={status === 'rejected'}
                  onChange={() => setStatus('rejected')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                Reject
              </label>
            </div>
          </div>

          {type === 'claim' && status === 'approved' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approved Settlement Amount ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amountApproved}
                onChange={(e) => setAmountApproved(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
              {maxAmount && (
                <p className="text-[11px] text-slate-400 mt-1">Maximum claimed: ${maxAmount.toLocaleString()}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewer Notes / Decision Justification {status === 'rejected' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              required={status === 'rejected'}
              placeholder={status === 'rejected' ? 'Required: Explain why this application was rejected...' : 'Optional reviewer audit notes...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={status === 'rejected' ? 'danger' : 'primary'}
              loading={submitting}
              type="submit"
            >
              Confirm {status.toUpperCase()}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
