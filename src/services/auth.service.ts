import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, userRoles } from '@/db/schema/users';
import { roles, rolePermissions } from '@/db/schema/roles';
import { permissions } from '@/db/schema/permissions';
import { eq } from 'drizzle-orm';

export interface UserWithPassword {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
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
