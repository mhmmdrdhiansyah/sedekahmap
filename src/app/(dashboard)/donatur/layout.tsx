import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import DashboardSidebar, { MenuItem } from '@/components/layout/DashboardSidebar';

// ============================================================
// DONATUR MENU ITEMS
// ============================================================
const DONATUR_MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/donatur', icon: 'home' },
  { label: 'Cari Target', path: '/donatur/cari-target', icon: 'search' },
  { label: 'Permintaan Saya', path: '/donatur/permintaan-saya', icon: 'clipboard' },
  { label: 'Penyaluran', path: '/donatur/penyaluran', icon: 'gift' },
  { label: 'Profile', path: '/donatur/profile', icon: 'user' },
];

// ============================================================
// LAYOUT COMPONENT
// ============================================================
export default async function DonaturLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check - get current user
  const user = await getCurrentUser();

  // Redirect to unauthorized if not logged in or not a donatur
  if (!user) {
    redirect('/login?callbackUrl=/donatur');
  }

  if (user.roles.includes(ROLES.DONATUR) === false) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar userName={user.name} menuItems={DONATUR_MENU} subtitle="Panel Donatur" />
      <main className="md:ml-64 min-h-screen">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
