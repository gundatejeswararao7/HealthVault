'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function FamilyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile/family-members`, {
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
    fetchFamily();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Family Members</h1>
        <Link href="/dashboard/family/add" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add Family Member
        </Link>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.length === 0 ? <div className="text-gray-500">No family members found.</div> : (
            data.map(member => (
              <Card key={member.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">{member.full_name}</h3>
                    <p className="text-gray-600">{member.relationship}</p>
                    {member.email && <p className="text-sm text-gray-500">{member.email}</p>}
                  </div>
                  <Badge status={member.status || 'active'} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
