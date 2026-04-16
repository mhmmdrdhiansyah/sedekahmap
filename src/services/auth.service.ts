import bcrypt from 'bcrypt';
import { SECURITY } from '@/lib/constants';
import { db } from '@/db';
import { users, userRoles } from '@/db/schema/users';
import { roles, rolePermissions } from '@/db/schema/roles';
import { permissions } from '@/db/schema/permissions';
import { eq, sql } from 'drizzle-orm';

export interface UserWithPassword {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRolesAndPermissions {
  roles: string[];
  permissions: string[];
}

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function getUserRolesAndPermissions(userId: string): Promise<UserRolesAndPermissions> {
  // Query user_roles → roles
  const userRoleRows = await db
    .select({
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const roleNames = userRoleRows.map((r) => r.roleName);

  // Query role_permissions → permissions (untuk semua roles user)
  const userPermissionRows = await db
    .select({
      permissionName: permissions.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  // Deduplicate permissions (jika user punya multiple roles dengan overlap)
  const permissionNames = [...new Set(userPermissionRows.map((p) => p.permissionName))];

  return { roles: roleNames, permissions: permissionNames };
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// ============================================================
// ACCOUNT LOCKOUT FUNCTIONS
// ============================================================

/**
 * Cek apakah akun terkunci
 * @throws Error jika akun terkunci
 */
export async function checkAccountLockout(user: UserWithPassword): Promise<void> {
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    console.info(`[AUTH] Account locked: ${user.email} until ${user.lockedUntil}`);
    throw new Error('ACCOUNT_LOCKED:Akun terkunci sementara. Silakan coba lagi nanti.');
  }
}

/**
 * Handle login gagal - increment counter dan lock jika perlu
 */
export async function handleFailedLogin(userId: string): Promise<void> {
  const [user] = await db
    .select({
      failedLoginAttempts: users.failedLoginAttempts,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  const updates: any = {
    failedLoginAttempts: newAttempts,
    lastFailedLoginAt: new Date(),
  };

  // Lock jika mencapai threshold
  if (newAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + SECURITY.ACCOUNT_LOCK_MINUTES * 60 * 1000);
    updates.lockedUntil = lockUntil;
    console.info(`[AUTH] Account locked: userId=${userId}, attempts=${newAttempts}, until=${lockUntil}`);
  }

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId));
}

/**
 * Reset login attempts setelah login sukses
 */
export async function resetLoginAttempts(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
    })
    .where(eq(users.id, userId));
}
