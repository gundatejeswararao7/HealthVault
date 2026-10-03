'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function FamilyPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get<any[]>('/profile/family-members');
        setMembers(res.data || []);
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
          <h1 className="text-2xl font-bold text-slate-900">Family Members</h1>
          <p className="text-sm text-slate-500">Manage dependent family profiles linked to your healthcare account</p>
        </div>
        <Link
          href="/family/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Add Family Member
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading family members...</p>
      ) : members.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 text-sm">No family members registered.</p>
          <Link href="/family/add" className="text-blue-600 text-xs font-semibold hover:underline mt-2 inline-block">
            Link a dependent family member
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card key={member.id} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">👨‍👩‍👦</span>
                <Badge
                  variant={
                    member.status === 'approved'
                      ? 'success'
                      : member.status === 'rejected'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {member.status}
                </Badge>
              </div>

              <h3 className="font-bold text-slate-900 text-base mt-3">{member.full_name}</h3>
              <div className="text-xs text-slate-600 mt-2 space-y-1">
                <p>Relationship: <strong className="capitalize">{member.relationship}</strong></p>
                <p>Date of Birth: {new Date(member.date_of_birth).toLocaleDateString()}</p>
                <p>Submitted: {new Date(member.created_at).toLocaleDateString()}</p>
              </div>

              {member.decision_reason && (
                <div className="mt-3 p-2 bg-amber-50 rounded text-xs text-amber-800">
                  Notes: {member.decision_reason}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
