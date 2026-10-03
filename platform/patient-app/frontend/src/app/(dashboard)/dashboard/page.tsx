'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export default function DashboardHome() {
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    activeClaims: 0,
    unreadNotifications: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [apptsRes, notifsRes, claimsRes] = await Promise.allSettled([
          apiClient.get<any[]>('/appointments'),
          apiClient.get<any[]>('/notifications'),
          apiClient.get<any[]>('/claims'),
        ]);

        const appts = apptsRes.status === 'fulfilled' ? apptsRes.value.data || [] : [];
        const notifs = notifsRes.status === 'fulfilled' ? notifsRes.value.data || [] : [];
        const claims = claimsRes.status === 'fulfilled' ? claimsRes.value.data || [] : [];

        setRecentAppointments(appts.slice(0, 5));
        setRecentNotifications(notifs.slice(0, 5));
        setStats({
          upcomingAppointments: appts.filter((a: any) => a.status === 'confirmed' || a.status === 'pending').length,
          activeClaims: claims.filter((c: any) => c.status !== 'rejected' && c.status !== 'paid').length,
          unreadNotifications: notifs.filter((n: any) => !n.read).length,
        });
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="text-slate-500 text-sm">Loading your health portal overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Manage appointments, medical claims, and policies</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Upcoming Appointments</p>
              <h2 className="text-3xl font-extrabold text-blue-600 mt-2">{stats.upcomingAppointments}</h2>
            </div>
            <span className="text-3xl">📅</span>
          </div>
          <Link href="/appointments" className="text-xs text-blue-600 hover:underline mt-4 inline-block font-medium">
            View all appointments →
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Active Claims</p>
              <h2 className="text-3xl font-extrabold text-indigo-600 mt-2">{stats.activeClaims}</h2>
            </div>
            <span className="text-3xl">📝</span>
          </div>
          <Link href="/claims" className="text-xs text-indigo-600 hover:underline mt-4 inline-block font-medium">
            View claims history →
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Unread Notifications</p>
              <h2 className="text-3xl font-extrabold text-amber-600 mt-2">{stats.unreadNotifications}</h2>
            </div>
            <span className="text-3xl">🔔</span>
          </div>
          <Link href="/notifications" className="text-xs text-amber-600 hover:underline mt-4 inline-block font-medium">
            View notifications →
          </Link>
        </Card>
      </div>

      {/* Grid for Appointments & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Appointments</h2>
            <Link
              href="/appointments/new"
              className="text-xs bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
            >
              + Book New
            </Link>
          </div>

          {recentAppointments.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No appointments scheduled.</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{appt.reason}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(appt.scheduled_at).toLocaleDateString()} at{' '}
                      {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant={appt.status === 'confirmed' ? 'success' : appt.status === 'pending' ? 'warning' : 'default'}>
                    {appt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Notifications</h2>
            <Link href="/notifications" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>

          {recentNotifications.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No new notifications.</p>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg border text-sm ${
                    notif.read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs">{notif.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{notif.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
