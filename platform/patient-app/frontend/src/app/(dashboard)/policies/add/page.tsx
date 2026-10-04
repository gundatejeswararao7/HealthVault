'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';

export default function AddPolicyPage() {
  const [formData, setFormData] = useState({
    policy_number: '',
    provider_name: '',
    coverage_type: 'health',
    coverage_limit: '',
    deductible: '',
    premium: '',
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          coverage_limit: Number(formData.coverage_limit),
          deductible: Number(formData.deductible),
          premium: Number(formData.premium)
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to add policy');
      }

      router.push('/dashboard/policies');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add Policy</h1>
      
      <Card>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider Name</label>
              <input type="text" required className="w-full p-2 border rounded" value={formData.provider_name} onChange={e => setFormData({...formData, provider_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Policy Number</label>
              <input type="text" required className="w-full p-2 border rounded" value={formData.policy_number} onChange={e => setFormData({...formData, policy_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coverage Type</label>
              <select className="w-full p-2 border rounded" value={formData.coverage_type} onChange={e => setFormData({...formData, coverage_type: e.target.value})}>
                <option value="health">Health</option>
                <option value="dental">Dental</option>
                <option value="vision">Vision</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coverage Limit ($)</label>
              <input type="number" required className="w-full p-2 border rounded" value={formData.coverage_limit} onChange={e => setFormData({...formData, coverage_limit: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deductible ($)</label>
              <input type="number" required className="w-full p-2 border rounded" value={formData.deductible} onChange={e => setFormData({...formData, deductible: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Premium ($)</label>
              <input type="number" required className="w-full p-2 border rounded" value={formData.premium} onChange={e => setFormData({...formData, premium: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" required className="w-full p-2 border rounded" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" required className="w-full p-2 border rounded" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded mt-4 disabled:opacity-50">
            {loading ? 'Adding...' : 'Add Policy'}
          </button>
        </form>
      </Card>
    </div>
  );
}
