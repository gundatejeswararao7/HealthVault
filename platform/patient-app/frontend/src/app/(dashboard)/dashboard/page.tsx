import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const fetchOpts = {
    headers: { 'Authorization': `Bearer ${session?.access_token}` },
    next: { revalidate: 0 }
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  // Fetch data
  const [appointmentsRes, notificationsRes, claimsRes] = await Promise.all([
    fetch(`${API_URL}/api/v1/appointments?page=1&per_page=5`, fetchOpts),
    fetch(`${API_URL}/api/v1/notifications?page=1&per_page=5`, fetchOpts),
    fetch(`${API_URL}/api/v1/claims?page=1&per_page=5`, fetchOpts),
  ]);

  const appointments = await appointmentsRes.json().catch(() => ({ data: [] }));
  const notifications = await notificationsRes.json().catch(() => ({ data: [] }));
  const claims = await claimsRes.json().catch(() => ({ data: [] }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Upcoming Appointments">
          <div className="text-3xl font-semibold">
            {appointments.data?.filter((a: any) => a.status === 'confirmed').length || 0}
          </div>
        </Card>
        <Card title="Pending Claims">
          <div className="text-3xl font-semibold">
            {claims.data?.filter((c: any) => c.status !== 'paid' && c.status !== 'rejected').length || 0}
          </div>
        </Card>
        <Card title="Unread Notifications">
          <div className="text-3xl font-semibold">
            {notifications.data?.filter((n: any) => !n.is_read).length || 0}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Appointments">
          {appointments.data && appointments.data.length > 0 ? (
            <Table
              headers={['Date', 'Hospital', 'Status']}
              rows={appointments.data.slice(0, 5).map((app: any) => [
                new Date(app.scheduled_at).toLocaleDateString(),
                app.hospital_id,
                <Badge key={app.id} status={app.status} />
              ])}
            />
          ) : (
            <p className="text-gray-500">No recent appointments.</p>
          )}
        </Card>

        <Card title="Recent Notifications">
          {notifications.data && notifications.data.length > 0 ? (
            <ul className="space-y-4">
              {notifications.data.slice(0, 5).map((notif: any) => (
                <li key={notif.id} className="border-b pb-2">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                    {notif.title}
                  </h4>
                  <p className="text-sm text-gray-500">{notif.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No recent notifications.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
