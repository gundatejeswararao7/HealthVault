'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let channel: any;

    async function setupNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (!profile) return;

      // Initial count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .eq('read', false);

      setUnreadCount(count || 0);

      // Subscribe to Realtime notifications for this user
      channel = supabase
        .channel(`user-notifications-${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${profile.id}`,
          },
          () => {
            setUnreadCount((prev) => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${profile.id}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.read === true) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    }

    setupNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition"
      title="Notifications"
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
