'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function ClaimsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/claims`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        if (res.ok) setData(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Claims</h1>
        <Link href="/dashboard/claims/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          New Claim
        </Link>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="grid gap-4">
          {data.length === 0 ? <div className="text-gray-500">No claims found.</div> : (
            data.map(claim => (
              <Card key={claim.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">Policy: {claim.policy_id}</h3>
                    <p className="text-gray-600">Amount Claimed: ${claim.amount_claimed}</p>
                    <p className="text-sm text-gray-500">Submitted: {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <Badge status={claim.status} />
                </div>
                <div className="mt-4">
                  <Link href={`/dashboard/claims/${claim.id}`} className="text-blue-600 text-sm font-medium hover:underline">
                    View Details
                  </Link>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
