import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patient Portal | HealthVault',
  description: 'Manage your health records, appointments, and insurance claims',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
