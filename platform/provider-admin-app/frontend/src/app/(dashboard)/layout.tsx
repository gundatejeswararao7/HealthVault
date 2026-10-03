'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopBar } from '../../components/layout/TopBar';
import { QueueUpdater } from '../../components/realtime/QueueUpdater';
import { createClient } from '../../lib/supabase/client';

export default function ProviderDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>();
  const [role, setRole] = useState<string>('provider');
  const [hospitalId, setHospitalId] = useState<string>('');

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('auth_uid', user.id)
        .single();

      if (profile) {
        setRole(profile.role);

        // Fetch hospital association
        const { data: hospitalUser } = await supabase
          .from('hospital_users')
          .select('hospital_id')
          .eq('profile_id', profile.id)
          .eq('is_active', true)
          .single();

        if (hospitalUser) {
          setHospitalId(hospitalUser.hospital_id);
        }
      }

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar email={userEmail} role={role} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      {hospitalId && <QueueUpdater hospitalId={hospitalId} />}
    </div>
  );
}
