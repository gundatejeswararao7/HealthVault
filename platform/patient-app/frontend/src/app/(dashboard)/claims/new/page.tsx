'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';

export default function NewClaimPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [policyId, setPolicyId] = useState('');
  const [caseId, setCaseId] = useState('');
  const [amountClaimed, setAmountClaimed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Fetch policies
      const polRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile/policies`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (polRes.ok) {
        const polJson = await polRes.json();
        setPolicies(polJson.data || []);
      }

      // Fetch cases from Supabase directly for this patient
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: casesData } = await supabase.from('cases').select('id,diagnosis,opened_at').eq('patient_id', user.id);
        if (casesData) setCases(casesData);
      }
    };
    fetchData();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          policy_id: policyId,
          case_id: caseId,
          amount_claimed: Number(amountClaimed)
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to create claim');
      }
      
      router.push('/dashboard/claims');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Claim</h1>
      
      <Card>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Policy</label>
            <select required className="w-full p-2 border rounded" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
              <option value="">Select a policy...</option>
              {policies.map(p => (
                <option key={p.id} value={p.id}>{p.policy_number} - {p.provider_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Related Case</label>
            <select required className="w-full p-2 border rounded" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">Select a case...</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.diagnosis} ({new Date(c.opened_at).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount Claimed ($)</label>
            <input type="number" step="0.01" required className="w-full p-2 border rounded" value={amountClaimed} onChange={(e) => setAmountClaimed(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">
            {loading ? 'Submitting...' : 'Create Claim'}
          </button>
        </form>
      </Card>
    </div>
  );
}
