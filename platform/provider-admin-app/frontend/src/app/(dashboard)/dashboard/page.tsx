import { cookies } from 'next/headers';
import Link from 'next/link';

async function fetchStats() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/queue/stats`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

async function fetchRecentQueue() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/queue?status=pending&per_page=10`, {
      cache: 'no-store',
    });
    if (!res.ok) return { data: [] };
    return res.json();
  } catch (e) {
    return { data: [] };
  }
}

export default async function DashboardPage() {
  const stats = await fetchStats();
  const queueRes = await fetchRecentQueue();
  const recentItems = queueRes?.data || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Pending</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats?.pending || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Confirmed</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats?.confirmed || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats?.completed || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Cancelled</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{stats?.cancelled || 0}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Queue Items</h3>
          <Link href="/queue" className="text-sm text-blue-600 hover:text-blue-900">View all</Link>
        </div>
        <ul className="divide-y divide-gray-200">
          {recentItems.length === 0 ? (
            <li className="px-6 py-4 text-sm text-gray-500">No pending items.</li>
          ) : (
            recentItems.map((item: any) => (
              <li key={item.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">Patient ID: {item.patient_id}</p>
                  <p className="text-sm text-gray-500">Reason: {item.reason}</p>
                </div>
                <div>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {item.status}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
