'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopBar } from '../../components/layout/TopBar';
import { createClient } from '../../lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>();
  const [patientName, setPatientName] = useState<string>();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email);

      // Fetch patient name
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (profile) {
        const { data: patient } = await supabase
          .from('patients')
          .select('full_name')
          .eq('profile_id', profile.id)
          .single();
        if (patient) {
          setPatientName(patient.full_name);
        }
      }

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar userEmail={userEmail} patientName={patientName} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
