'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createBrowserClient } from '@supabase/ssr';
import { fetchApi } from '@/lib/api';

export default function NewBranchApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    hospital_name: '',
    license_number: '',
    address: '',
    phone: '',
    email: '',
    license_document_path: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      await fetchApi('/api/v1/branch-applications', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      router.push('/dashboard/branch-applications');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Branch Application</h1>
        <p className="text-muted-foreground text-gray-500">
          Submit a new hospital branch application for review.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Hospital Name"
              name="hospital_name"
              required
              value={formData.hospital_name}
              onChange={handleChange}
              placeholder="e.g. City General Hospital"
            />
            
            <Input
              label="License Number"
              name="license_number"
              required
              value={formData.license_number}
              onChange={handleChange}
              placeholder="e.g. LIC-2023-1234"
            />

            <Input
              label="Address"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Health Ave, Medical District"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@hospital.com"
              />
            </div>

            <Input
              label="License Document Path"
              name="license_document_path"
              required
              value={formData.license_document_path}
              onChange={handleChange}
              placeholder="path/to/document.pdf"
              helpText="Provide the storage path to the previously uploaded license document."
            />

            <div className="flex justify-end pt-4 space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
