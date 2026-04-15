import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import DashboardSidebar, { MenuItem } from '@/components/layout/DashboardSidebar';

// ============================================================
// ADMIN MENU ITEMS
// ============================================================
const ADMIN_MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/admin', icon: 'home' },
  { label: 'Approval', path: '/admin/approvals', icon: 'clipboard' },
  { label: 'Penyaluran', path: '/admin/distributions', icon: 'gift' },
  {
    label: 'Users',
    path: '/admin/users',
    icon: 'user',
    children: [
      { label: 'Users', path: '/admin/users', icon: 'user' },
      { label: 'Roles', path: '/admin/users/roles', icon: 'shield' },
      { label: 'Permissions', path: '/admin/users/permissions', icon: 'key' },
    ],
  },
];

// ============================================================
// LAYOUT COMPONENT
// ============================================================
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check - get current user
  const user = await getCurrentUser();

  // Redirect to unauthorized if not logged in or not an admin
  if (!user) {
    redirect('/login?callbackUrl=/admin');
  }

  if (user.roles.includes(ROLES.ADMIN) === false) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar userName={user.name} menuItems={ADMIN_MENU} subtitle="Panel Admin" />
      <main className="md:ml-64 min-h-screen">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
