import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// ============================================================
// KONFIGURASI ROUTE PROTECTION
// ============================================================

// Route yang membutuhkan role tertentu
const ROLE_ROUTES: Record<string, string[]> = {
  '/admin': ['admin'],
  '/verifikator': ['verifikator'],
  '/donatur': ['donatur'],
};

// Route yang selalu publik (tidak perlu auth)
const PUBLIC_ROUTES = [
  '/',
  '/peta',
  '/login',
  '/register',
];

// ============================================================
// PROXY FUNCTION
// Di Next.js 16, 'middleware' diganti menjadi 'proxy'
// ============================================================
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // 1. Route publik — selalu boleh akses
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname === route + '/'
  );
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2. Jika belum login — redirect ke /login
  if (!session?.user) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Cek role-based access
  const userRoles = session.user.roles || [];

  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      const hasRequiredRole = allowedRoles.some((role) =>
        userRoles.includes(role)
      );

      if (!hasRequiredRole) {
        // User login tapi tidak punya role yang sesuai
        // Redirect ke halaman forbidden atau dashboard default
        return NextResponse.redirect(new URL('/unauthorized', req.nextUrl.origin));
      }

      // Role cocok, lanjutkan
      return NextResponse.next();
    }
  }

  // 4. Route lain yang perlu auth (catch-all authenticated routes)
  //    Contoh: /profile, /settings, dll
  return NextResponse.next();
});

// ============================================================
// MATCHER — route mana yang diproses oleh proxy
// ============================================================
export const config = {
  matcher: [
    /*
     * Match semua route KECUALI:
     * - api/auth (Auth.js endpoints — harus bisa diakses bebas)
     * - _next/static (file statis Next.js)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - File dengan ekstensi (gambar, font, dll)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*$).*)',
  ],
};
