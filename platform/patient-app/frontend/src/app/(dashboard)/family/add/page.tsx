'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';

export default function AddFamilyMemberPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    relationship: '',
    date_of_birth: '',
    email: ''
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile/family-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to add family member');
      }

      router.push('/dashboard/family');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add Family Member</h1>
      
      <Card>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input type="text" required className="w-full p-2 border rounded" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Relationship</label>
            <input type="text" required className="w-full p-2 border rounded" value={formData.relationship} onChange={e => setFormData({...formData, relationship: e.target.value})} placeholder="e.g. Spouse, Child, Parent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input type="date" required className="w-full p-2 border rounded" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email (Optional)</label>
            <input type="email" className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">
            {loading ? 'Adding...' : 'Add Family Member'}
          </button>
        </form>
      </Card>
    </div>
  );
}
