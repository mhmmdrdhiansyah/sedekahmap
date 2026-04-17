import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Autentikasi - SedekahMap',
  description: 'Login atau daftar ke SedekahMap',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        background: 'linear-gradient(to bottom right, var(--brand-primary-dark), var(--brand-primary), var(--brand-secondary))',
      }}
    >
      {/* Logo/Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          SedekahMap
        </h1>
        <p className="mt-2 text-white/80 text-sm">
          Platform Distribusi Sedekah Tepat Sasaran
        </p>
      </div>

      {/* Card Container */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">{children}</div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-white/70 text-xs">
        &copy; {new Date().getFullYear()} SedekahMap. Hak Cipta Dilindungi.
      </p>
    </div>
  );
}
