'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '../../../../components/ui/Card';
import { createClient } from '../../../../lib/supabase/client';

export default function UploadDocumentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('lab_report');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/v1/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errJson.error || 'Failed to upload document');
      }

      router.push('/documents');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/documents" className="text-xs text-blue-600 hover:underline">
          ← Back to Documents
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Upload Document</h1>
        <p className="text-sm text-slate-500">
          Upload medical files to your encrypted Supabase storage vault
        </p>
      </div>

      <Card className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Document Classification
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="lab_report">Lab Report</option>
              <option value="invoice">Medical Invoice / Receipt</option>
              <option value="id_proof">Government ID / Passport</option>
              <option value="case_document">Case Clinical Note</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select File (PDF, JPG, PNG - Max 10MB)
            </label>
            <input
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition text-sm disabled:opacity-50"
            >
              {uploading ? 'Encrypting & Uploading...' : 'Upload File to Vault'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
