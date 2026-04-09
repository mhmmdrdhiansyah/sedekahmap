import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import DashboardSidebar, { MenuItem } from '@/components/layout/DashboardSidebar';

// ============================================================
// VERIFIKATOR MENU ITEMS
// ============================================================
const VERIFIKATOR_MENU: MenuItem[] = [
  { label: 'Dashboard', path: '/verifikator', icon: 'home' },
  { label: 'Input Data', path: '/verifikator/input', icon: 'plus' },
  { label: 'Data Saya', path: '/verifikator/data-saya', icon: 'list' },
  { label: 'Profile', path: '/verifikator/profile', icon: 'user' },
];

// ============================================================
// LAYOUT COMPONENT
// ============================================================
export default async function VerifikatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check - get current user
  const user = await getCurrentUser();

  // Redirect to unauthorized if not logged in or not a verifikator
  if (!user) {
    redirect('/login?callbackUrl=/verifikator');
  }

  if (user.roles.includes(ROLES.VERIFIKATOR) === false) {
    redirect('/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar userName={user.name} menuItems={VERIFIKATOR_MENU} />
      <main className="md:ml-64 min-h-screen">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
