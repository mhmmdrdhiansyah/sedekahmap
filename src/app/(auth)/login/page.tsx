'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Role-based dashboard mapping
const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/admin',
  verifikator: '/verifikator',
  donatur: '/donatur',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email atau password salah.');
        setIsLoading(false);
        return;
      }

      // Login berhasil - redirect berdasarkan prioritas:
      // 1. callbackUrl (jika user mencoba akses halaman protected)
      // 2. dashboard berdasarkan role
      // 3. home sebagai fallback
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        // Fetch session data untuk menentukan redirect berdasarkan role
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (session?.user?.roles && session.user.roles.length > 0) {
          // Gunakan role pertama sebagai primary role
          const primaryRole = session.user.roles[0];
          const dashboardPath = ROLE_DASHBOARD[primaryRole];

          if (dashboardPath) {
            router.push(dashboardPath);
            router.refresh();
            return;
          }
        }

        // Fallback ke home jika tidak ada role mapping
        router.push('/');
      }

      router.refresh();
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Masuk ke Akun</h2>
        <p className="mt-2 text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary-dark"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-gray-900"
            placeholder="nama@email.com"
            disabled={isLoading}
          />
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary-dark"
            >
              Lupa password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-gray-900"
            placeholder="Masukkan password"
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Memproses...
            </>
          ) : (
            'Masuk'
          )}
        </button>
      </form>

      {/* Demo Credentials (Hapus di production) */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 font-medium mb-2">Demo Login:</p>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Admin: admin@sedekahmap.id / admin123</p>
          <p>Verifikator: verifikator@sedekahmap.id / verifikator123</p>
          <p>Donatur: donatur@sedekahmap.id / donatur123</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
