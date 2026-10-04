'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

export default function DocumentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents`, {
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
    fetchDocs();
  }, [supabase]);

  const handleDownload = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/${id}/download-url`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const json = await res.json();
      if (res.ok && json.data?.url) {
        window.open(json.data.url, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Link href="/dashboard/documents/upload" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Upload Document
        </Link>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="grid gap-4">
          {data.length === 0 ? <div className="text-gray-500">No documents found.</div> : (
            data.map(doc => (
              <Card key={doc.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">{doc.file_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={doc.document_type} />
                      <span className="text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc.id)}
                    className="border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
                  >
                    Download
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
