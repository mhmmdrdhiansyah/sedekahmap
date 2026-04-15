import { eq, count, desc, SQL, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { roles, rolePermissions } from '@/db/schema/roles';
import { permissions } from '@/db/schema/permissions';

// ============================================================
// TYPES
// ============================================================

export interface RoleListResult {
  data: RoleWithPermissions[];
  total: number;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  permissions: Array<{
    id: string;
    name: string;
    description: string | null;
    module: string;
  }>;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}

export interface UpdateRolePermissionsResult {
  id: string;
  name: string;
  permissions: Array<{ id: string; name: string }>;
}

export interface DeleteRoleResult {
  id: string;
  deleted: boolean;
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * listRoles - Get all roles with permissions
 * @returns Array of roles with permissions + total count
 */
export async function listRoles(): Promise<RoleListResult> {
  // Get all roles with their permissions
  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      createdAt: roles.createdAt,
      permissionId: permissions.id,
      permissionName: permissions.name,
      permissionDescription: permissions.description,
      permissionModule: permissions.module,
    })
    .from(roles)
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .orderBy(desc(roles.createdAt));

  // Group by role and aggregate permissions
  const roleMap = new Map<string, RoleWithPermissions>();

  for (const row of rows as any[]) {
    if (!roleMap.has(row.id)) {
      roleMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt,
        permissions: [],
      });
    }

    if (row.permissionId) {
      roleMap.get(row.id)!.permissions.push({
        id: row.permissionId,
        name: row.permissionName,
        description: row.permissionDescription,
        module: row.permissionModule,
      });
    }
  }

  return {
    data: Array.from(roleMap.values()),
    total: roleMap.size,
  };
}

/**
 * getRoleById - Get role by ID with permissions
 * @param id - Role UUID
 * @returns Role with permissions
 * @throws Error if role not found
 */
export async function getRoleById(id: string): Promise<RoleWithPermissions> {
  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      createdAt: roles.createdAt,
      permissionId: permissions.id,
      permissionName: permissions.name,
      permissionDescription: permissions.description,
      permissionModule: permissions.module,
    })
    .from(roles)
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(roles.id, id));

  if (rows.length === 0) {
    throw new Error('Role tidak ditemukan');
  }

  // Aggregate permissions
  const role: RoleWithPermissions = {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    createdAt: rows[0].createdAt,
    permissions: [],
  };

  for (const row of rows) {
    if (row.permissionId) {
      role.permissions.push({
        id: row.permissionId,
        name: row.permissionName!,
        description: row.permissionDescription,
        module: row.permissionModule!,
      });
    }
  }

  return role;
}

/**
 * createRole - Create a new role with permissions
 * @param data - Role creation data
 * @returns Created role with permissions
 * @throws Error if validation fails
 */
export async function createRole(data: CreateRoleData): Promise<RoleWithPermissions> {
  const { name, description, permissionIds } = data;

  // Validation: name unique
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, name))
    .limit(1);

  if (existing) {
    throw new Error('Role name sudah terdaftar');
  }

  // Validation: permissionIds exist in database
  if (permissionIds && permissionIds.length > 0) {
    const permissionRecords = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));

    if (permissionRecords.length !== permissionIds.length) {
      throw new Error('Satu atau lebih permission tidak ditemukan');
    }
  }

  // Insert role
  const [created] = await db
    .insert(roles)
    .values({
      name,
      description: description || null,
    })
    .returning();

  // Insert role_permissions if provided
  if (permissionIds && permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      permissionIds.map((permissionId) => ({
        roleId: created.id,
        permissionId,
      }))
    );
  }

  // Return created role with permissions
  return getRoleById(created.id);
}

/**
 * updateRole - Update role data (partial update)
 * @param id - Role UUID
 * @param data - Role update data
 * @returns Updated role with permissions
 * @throws Error if role not found or name already exists
 */
export async function updateRole(
  id: string,
  data: UpdateRoleData
): Promise<RoleWithPermissions> {
  const { name, description } = data;

  // Check role exists
  const [existing] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Role tidak ditemukan');
  }

  // Validation: if name changed, check unique
  if (name && name !== existing.name) {
    const [nameCheck] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    if (nameCheck) {
      throw new Error('Role name sudah digunakan');
    }
  }

  // Build update object (only include provided fields)
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  // Update role
  await db.update(roles).set(updateData).where(eq(roles.id, id));

  return getRoleById(id);
}

/**
 * assignPermissionsToRole - Assign permissions to a role (replace all existing)
 * @param roleId - Role UUID
 * @param permissionIds - Array of permission UUIDs
 * @returns Updated role with new permissions
 * @throws Error if role not found or permissions don't exist
 */
export async function assignPermissionsToRole(
  roleId: string,
  permissionIds: string[]
): Promise<RoleWithPermissions> {
  // Validation: role exists
  const [existingRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!existingRole) {
    throw new Error('Role tidak ditemukan');
  }

  // Validation: all permissionIds exist
  if (permissionIds && permissionIds.length > 0) {
    const permissionRecords = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));

    if (permissionRecords.length !== permissionIds.length) {
      throw new Error('Satu atau lebih permission tidak ditemukan');
    }
  }

  // Delete all existing role_permissions
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  // Insert new role_permissions
  if (permissionIds && permissionIds.length > 0) {
    await db.insert(rolePermissions).values(
      permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }))
    );
  }

  return getRoleById(roleId);
}

/**
 * deleteRole - Delete role (and its role_permissions)
 * @param id - Role UUID
 * @returns Deletion result
 * @throws Error if role not found or is a system role (admin, verifikator, donatur)
 */
export async function deleteRole(id: string): Promise<DeleteRoleResult> {
  // Check role exists
  const [existing] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Role tidak ditemukan');
  }

  // Validation: cannot delete system roles
  const systemRoles = ['admin', 'verifikator', 'donatur'];
  if (systemRoles.includes(existing.name)) {
    throw new Error('Tidak dapat menghapus role sistem');
  }

  // Delete role_permissions first
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

  // Delete role
  await db.delete(roles).where(eq(roles.id, id));

  return { id, deleted: true };
}
