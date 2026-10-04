'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';

export default function ClaimDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [claim, setClaim] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchClaimData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const headers = { 'Authorization': `Bearer ${session.access_token}` };
        
        const claimRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/claims/${id}`, { headers });
        if (claimRes.ok) {
          const json = await claimRes.json();
          setClaim(json.data);
        }

        const itemsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/claims/${id}/treatment-items`, { headers });
        if (itemsRes.ok) {
          const json = await itemsRes.json();
          setItems(json.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchClaimData();
  }, [id, supabase]);

  const handleSubmitClaim = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/claims/${id}/submit`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        router.refresh();
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!claim) return <div>Claim not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Claim Details</h1>
        <Badge status={claim.status} />
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div><h4 className="text-sm font-medium text-gray-500">Policy ID</h4><p>{claim.policy_id}</p></div>
          <div><h4 className="text-sm font-medium text-gray-500">Case ID</h4><p>{claim.case_id}</p></div>
          <div><h4 className="text-sm font-medium text-gray-500">Amount Claimed</h4><p>${claim.amount_claimed}</p></div>
          <div><h4 className="text-sm font-medium text-gray-500">Amount Approved</h4><p>${claim.amount_approved || '0.00'}</p></div>
        </div>
        {claim.status === 'draft' && (
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={handleSubmitClaim}
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        )}
      </Card>

      <Card title="Treatment Items">
        {items.length > 0 ? (
          <Table
            headers={['Item Code', 'Description', 'Cost']}
            rows={items.map(it => [it.item_code, it.description, `$${it.cost}`])}
          />
        ) : (
          <p className="text-gray-500">No treatment items added yet.</p>
        )}
      </Card>
    </div>
  );
}
