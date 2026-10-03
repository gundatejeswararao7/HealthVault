'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { createClient } from '../../../lib/supabase/client';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadNotifications = async () => {
    try {
      const res = await apiClient.get<any[]>('/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    let channel: any;
    async function subscribeRealtime() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (!profile) return;

      channel = supabase
        .channel(`notifs-page-${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${profile.id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();
    }

    subscribeRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Real-time alerts on your appointments, claims, and enrollments</p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 text-sm">
          No notifications in your inbox.
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`p-4 transition ${
                notif.read ? 'bg-white opacity-85' : 'bg-blue-50/40 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{notif.type === 'claim' ? '📝' : notif.type === 'appointment' ? '📅' : '🔔'}</span>
                    <h3 className="font-semibold text-slate-900 text-sm">{notif.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 pl-6">{notif.body}</p>
                  <p className="text-[10px] text-slate-400 mt-2 pl-6">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>

                {!notif.read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="text-xs text-blue-600 hover:underline flex-shrink-0"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
