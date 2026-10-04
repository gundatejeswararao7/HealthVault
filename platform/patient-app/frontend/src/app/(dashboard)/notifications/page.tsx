'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';

export default function NotificationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (res.ok) setData(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();
    const channel = supabase.channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, supabase]);

  const handleMarkRead = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      setData(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      setData(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={handleMarkAllRead} className="border border-gray-300 bg-white px-4 py-2 rounded hover:bg-gray-50 text-sm">
          Mark All as Read
        </button>
      </div>

      {loading ? <div>Loading...</div> : (
        <Card className="p-0 overflow-hidden">
          {data.length === 0 ? <div className="p-6 text-gray-500">No notifications.</div> : (
            <ul className="divide-y">
              {data.map(notif => (
                <li
                  key={notif.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 flex gap-4 ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                >
                  <div className="mt-1">
                    {!notif.is_read ? <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div> : <div className="w-2.5 h-2.5"></div>}
                  </div>
                  <div>
                    <h4 className={`font-medium ${!notif.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
