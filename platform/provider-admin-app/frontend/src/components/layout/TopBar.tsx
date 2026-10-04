'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

export default function TopBar({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="text-gray-500 font-medium">Dashboard</div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">{user.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
