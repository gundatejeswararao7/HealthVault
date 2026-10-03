'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocs() {
      try {
        const query = typeFilter !== 'all' ? `?document_type=${typeFilter}` : '';
        const res = await apiClient.get<any[]>(`/documents${query}`);
        setDocuments(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, [typeFilter]);

  const handleDownload = async (docId: string) => {
    try {
      const res = await apiClient.get<{ downloadUrl: string }>(`/documents/${docId}/download-url`);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to download document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents Vault</h1>
          <p className="text-sm text-slate-500">Secure Supabase Storage for lab reports, bills, and ID proofs</p>
        </div>
        <Link
          href="/documents/upload"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + Upload Document
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {['all', 'lab_report', 'invoice', 'id_proof', 'case_document'].map((tab) => (
          <button
            key={tab}
            onClick={() => setTypeFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
              typeFilter === tab ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading documents...</p>
      ) : documents.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500 text-sm">No documents uploaded yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📄</span>
                  <Badge variant="info">{doc.document_type}</Badge>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mt-3 truncate" title={doc.file_name}>
                  {doc.file_name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Size: {(doc.size_bytes / 1024).toFixed(1)} KB •{' '}
                  {new Date(doc.uploaded_at).toLocaleDateString()}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleDownload(doc.id)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Download / View →
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
