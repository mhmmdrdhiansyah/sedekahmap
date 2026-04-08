import type { Metadata } from 'next';
import PublicNavbar from '@/components/layout/PublicNavbar';
import PublicFooter from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'SedekahMap - Platform Distribusi Sedekah Tepat Sasaran',
  description: 'Platform Distribusi Sedekah Tepat Sasaran Berbasis Peta',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
