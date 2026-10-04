'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';

export default function UploadDocumentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('lab_report');
  const [caseId, setCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        setFile(null);
        e.target.value = '';
      } else {
        setError('');
        setFile(f);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      if (caseId) formData.append('case_id', caseId);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to upload document');
      }

      router.push('/dashboard/documents');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Upload Document</h1>
      
      <Card>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">File (Max 10MB, PDF/JPG/PNG)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              onChange={handleFileChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <select required className="w-full p-2 border rounded" value={documentType} onChange={e => setDocumentType(e.target.value)}>
              <option value="lab_report">Lab Report</option>
              <option value="invoice">Invoice</option>
              <option value="id_proof">ID Proof</option>
              <option value="case_document">Case Document</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Case ID (Optional)</label>
            <input type="text" className="w-full p-2 border rounded" value={caseId} onChange={e => setCaseId(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </Card>
    </div>
  );
}
