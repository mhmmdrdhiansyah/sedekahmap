import { auth } from '@/lib/auth';

// ============================================================
// TYPES
// ============================================================
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

// ============================================================
// getCurrentUser()
// Ambil user dari session. Return null jika belum login.
// Gunakan di Server Components dan API Routes.
// ============================================================
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    roles: session.user.roles ?? [],
    permissions: session.user.permissions ?? [],
  };
}

// ============================================================
// requireAuth()
// Pastikan user sudah login. Throw jika belum.
// Gunakan di API Routes dan Server Actions.
// ============================================================
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('UNAUTHORIZED: Anda harus login terlebih dahulu.');
  }

  return user;
}

// ============================================================
// requireRole(role)
// Pastikan user memiliki role tertentu. Throw jika tidak.
// Parameter bisa string tunggal atau array (salah satu harus cocok).
//
// Contoh:
//   await requireRole('admin')
//   await requireRole(['admin', 'verifikator'])
// ============================================================
export async function requireRole(
  role: string | string[]
): Promise<AuthUser> {
  const user = await requireAuth();

  const requiredRoles = Array.isArray(role) ? role : [role];
  const hasRole = requiredRoles.some((r) => user.roles.includes(r));

  if (!hasRole) {
    throw new Error(
      `FORBIDDEN: Membutuhkan role [${requiredRoles.join(', ')}]. ` +
      `Anda memiliki role [${user.roles.join(', ')}].`
    );
  }

  return user;
}

// ============================================================
// requirePermission(permission)
// Pastikan user memiliki permission tertentu. Throw jika tidak.
// Parameter bisa string tunggal atau array (salah satu harus cocok).
//
// Contoh:
//   await requirePermission('beneficiary:create')
//   await requirePermission(['beneficiary:create', 'beneficiary:update'])
// ============================================================
export async function requirePermission(
  permission: string | string[]
): Promise<AuthUser> {
  const user = await requireAuth();

  const requiredPerms = Array.isArray(permission) ? permission : [permission];
  const hasPerm = requiredPerms.some((p) => user.permissions.includes(p));

  if (!hasPerm) {
    throw new Error(
      `FORBIDDEN: Membutuhkan permission [${requiredPerms.join(', ')}]. ` +
      `Anda tidak memiliki akses ini.`
    );
  }

  return user;
}

// ============================================================
// hasRole(user, role)
// Boolean check apakah user memiliki role tertentu.
// Tidak throw error, hanya return true/false.
//
// Contoh:
//   if (hasRole(user, 'admin')) { ... }
//   if (hasRole(user, ['admin', 'verifikator'])) { ... }
// ============================================================
export function hasRole(
  user: AuthUser,
  role: string | string[]
): boolean {
  const requiredRoles = Array.isArray(role) ? role : [role];
  return requiredRoles.some((r) => user.roles.includes(r));
}

// ============================================================
// hasPermission(user, permission)
// Boolean check apakah user memiliki permission tertentu.
// Tidak throw error, hanya return true/false.
//
// Contoh:
//   if (hasPermission(user, 'beneficiary:create')) { ... }
//   if (hasPermission(user, ['beneficiary:create', 'beneficiary:update'])) { ... }
// ============================================================
export function hasPermission(
  user: AuthUser,
  permission: string | string[]
): boolean {
  const requiredPerms = Array.isArray(permission) ? permission : [permission];
  return requiredPerms.some((p) => user.permissions.includes(p));
}
