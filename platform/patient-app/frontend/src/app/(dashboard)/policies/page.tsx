'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function PoliciesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile/policies`, {
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
    fetchPolicies();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Insurance Policies</h1>
        <Link href="/dashboard/policies/add" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add Policy
        </Link>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.length === 0 ? <div className="text-gray-500">No policies found.</div> : (
            data.map(policy => (
              <Card key={policy.id}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium">{policy.provider_name}</h3>
                    <p className="text-gray-600 font-mono">{policy.policy_number}</p>
                  </div>
                  <Badge status={policy.is_active ? 'active' : 'inactive'} />
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between"><span>Type:</span> <span className="font-medium capitalize">{policy.coverage_type}</span></div>
                  <div className="flex justify-between"><span>Coverage Limit:</span> <span className="font-medium">${policy.coverage_limit}</span></div>
                  <div className="flex justify-between"><span>Deductible:</span> <span className="font-medium">${policy.deductible}</span></div>
                  <div className="flex justify-between"><span>Premium:</span> <span className="font-medium">${policy.premium}</span></div>
                  <div className="flex justify-between pt-2 border-t text-xs text-gray-500">
                    <span>Valid: {new Date(policy.start_date).toLocaleDateString()} - {new Date(policy.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
