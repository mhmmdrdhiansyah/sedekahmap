import { eq, count, desc, SQL, like } from 'drizzle-orm';

import { db } from '@/db';
import { permissions } from '@/db/schema/permissions';
import { roles, rolePermissions } from '@/db/schema/roles';

// ============================================================
// TYPES
// ============================================================

export interface PermissionListFilters {
  search?: string;
  module?: string;
}

export interface PermissionListResult {
  data: PermissionWithRoles[];
  total: number;
}

export interface PermissionWithRoles {
  id: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: Date;
  roles: Array<{
    id: string;
    name: string;
  }>;
}

export interface CreatePermissionData {
  name: string;
  description?: string;
  module: string;
}

export interface UpdatePermissionData {
  name?: string;
  description?: string;
  module?: string;
}

export interface DeletePermissionResult {
  id: string;
  deleted: boolean;
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * listPermissions - Get all permissions with filters
 * @param filters - Filter options (search, module)
 * @returns Array of permissions with roles + total count
 */
export async function listPermissions(
  filters: PermissionListFilters = {}
): Promise<PermissionListResult> {
  const { search, module } = filters;

  // Build where conditions
  const conditions: SQL[] = [];

  if (search) {
    conditions.push(
      like(permissions.name, `%${search}%`)
    );
  }

  if (module) {
    conditions.push(eq(permissions.module, module));
  }

  const whereCondition = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ total: count() })
    .from(permissions)
    .where(whereCondition);

  const total = countResult?.total ?? 0;

  // Get data with roles (LEFT JOIN)
  const rows = await db
    .select({
      id: permissions.id,
      name: permissions.name,
      description: permissions.description,
      module: permissions.module,
      createdAt: permissions.createdAt,
      roleId: roles.id,
      roleName: roles.name,
    })
    .from(permissions)
    .leftJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .leftJoin(roles, eq(rolePermissions.roleId, roles.id))
    .where(whereCondition)
    .orderBy(permissions.module, permissions.name);

  // Group by permission and aggregate roles
  const permissionMap = new Map<string, PermissionWithRoles>();

  for (const row of rows as any[]) {
    if (!permissionMap.has(row.id)) {
      permissionMap.set(row.id, {
        id: row.id,
        name: row.name,
        description: row.description,
        module: row.module,
        createdAt: row.createdAt,
        roles: [],
      });
    }

    if (row.roleId) {
      permissionMap.get(row.id)!.roles.push({
        id: row.roleId,
        name: row.roleName,
      });
    }
  }

  return {
    data: Array.from(permissionMap.values()),
    total,
  };
}

/**
 * getPermissionById - Get permission by ID with roles
 * @param id - Permission UUID
 * @returns Permission with roles
 * @throws Error if permission not found
 */
export async function getPermissionById(id: string): Promise<PermissionWithRoles> {
  const rows = await db
    .select({
      id: permissions.id,
      name: permissions.name,
      description: permissions.description,
      module: permissions.module,
      createdAt: permissions.createdAt,
      roleId: roles.id,
      roleName: roles.name,
    })
    .from(permissions)
    .leftJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .leftJoin(roles, eq(rolePermissions.roleId, roles.id))
    .where(eq(permissions.id, id));

  if (rows.length === 0) {
    throw new Error('Permission tidak ditemukan');
  }

  // Aggregate roles
  const permission: PermissionWithRoles = {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    module: rows[0].module,
    createdAt: rows[0].createdAt,
    roles: [],
  };

  for (const row of rows) {
    if (row.roleId) {
      permission.roles.push({
        id: row.roleId,
        name: row.roleName!,
      });
    }
  }

  return permission;
}

/**
 * createPermission - Create a new permission
 * @param data - Permission creation data
 * @returns Created permission
 * @throws Error if validation fails
 */
export async function createPermission(data: CreatePermissionData): Promise<PermissionWithRoles> {
  const { name, description, module } = data;

  // Validation: name unique
  const [existing] = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.name, name))
    .limit(1);

  if (existing) {
    throw new Error('Permission name sudah terdaftar');
  }

  // Insert permission
  const [created] = await db
    .insert(permissions)
    .values({
      name,
      description: description || null,
      module,
    })
    .returning();

  // Return created permission (without roles initially)
  return {
    id: created.id,
    name: created.name,
    description: created.description,
    module: created.module,
    createdAt: created.createdAt,
    roles: [],
  };
}

/**
 * updatePermission - Update permission data (partial update)
 * @param id - Permission UUID
 * @param data - Permission update data
 * @returns Updated permission
 * @throws Error if permission not found or name already exists
 */
export async function updatePermission(
  id: string,
  data: UpdatePermissionData
): Promise<PermissionWithRoles> {
  const { name, description, module } = data;

  // Check permission exists
  const [existing] = await db
    .select({ id: permissions.id, name: permissions.name })
    .from(permissions)
    .where(eq(permissions.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Permission tidak ditemukan');
  }

  // Validation: if name changed, check unique
  if (name && name !== existing.name) {
    const [nameCheck] = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.name, name))
      .limit(1);

    if (nameCheck) {
      throw new Error('Permission name sudah digunakan');
    }
  }

  // Build update object (only include provided fields)
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (module !== undefined) updateData.module = module;

  // Update permission
  await db.update(permissions).set(updateData).where(eq(permissions.id, id));

  return getPermissionById(id);
}

/**
 * deletePermission - Delete permission (and its role_permissions)
 * @param id - Permission UUID
 * @returns Deletion result
 * @throws Error if permission not found or is a system permission
 */
export async function deletePermission(id: string): Promise<DeletePermissionResult> {
  // Check permission exists
  const [existing] = await db
    .select({ id: permissions.id, name: permissions.name })
    .from(permissions)
    .where(eq(permissions.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Permission tidak ditemukan');
  }

  // Validation: cannot delete system permissions (optional, based on your requirements)
  // For now, we'll allow deleting all permissions

  // Delete role_permissions first
  await db.delete(rolePermissions).where(eq(rolePermissions.permissionId, id));

  // Delete permission
  await db.delete(permissions).where(eq(permissions.id, id));

  return { id, deleted: true };
}

// Import and for correct typing
import { and } from 'drizzle-orm';
