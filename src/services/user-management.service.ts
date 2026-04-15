import { eq, and, or, count, desc, SQL, like, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

import { db } from '@/db';
import { users, userRoles } from '@/db/schema/users';
import { roles } from '@/db/schema/roles';

// ============================================================
// TYPES
// ============================================================

export interface UserListFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserListPagination {
  limit?: number;
  offset?: number;
}

export interface UserListResult {
  data: UserWithRoles[];
  total: number;
}

export interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  roleIds: string[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ToggleActiveResult {
  id: string;
  isActive: boolean;
}

export interface DeleteUserResult {
  id: string;
  deleted: boolean;
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * listUsers - Get all users with filters and pagination
 * @param filters - Filter options (search, role, isActive)
 * @param pagination - Pagination options (limit, offset)
 * @returns Array of users with roles + total count
 */
export async function listUsers(
  filters: UserListFilters = {},
  pagination: UserListPagination = {}
): Promise<UserListResult> {
  const { search, role, isActive } = filters;
  const { limit = 20, offset = 0 } = pagination;

  // Build where conditions
  const conditions: SQL[] = [];

  if (search) {
    conditions.push(
      or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      )!
    );
  }

  if (isActive !== undefined) {
    conditions.push(eq(users.isActive, isActive));
  }

  // Filter by role name if specified (need to include in where condition)
  if (role) {
    conditions.push(eq(roles.name, role));
  }

  const whereCondition = conditions.length === 0 ? undefined : and(...conditions);

  // Get total count (without role filter for efficiency)
  const countConditions = role
    ? conditions.filter(c => c !== eq(roles.name, role))
    : conditions;
  const countWhere = countConditions.length === 0 ? undefined : and(...countConditions);

  const [countResult] = await db
    .select({ total: count() })
    .from(users)
    .where(countWhere);

  const total = countResult?.total ?? 0;

  // Get data with roles (LEFT JOIN)
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      address: users.address,
      isActive: users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDescription: roles.description,
    })
    .from(users)
    .leftJoin(userRoles, eq(users.id, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(whereCondition)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  // Group by user and aggregate roles
  const userMap = new Map<string, UserWithRoles>();

  for (const row of rows as any[]) {
    if (!userMap.has(row.id)) {
      userMap.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        isActive: row.isActive,
        emailVerifiedAt: row.emailVerifiedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        roles: [],
      });
    }

    if (row.roleId) {
      userMap.get(row.id)!.roles.push({
        id: row.roleId,
        name: row.roleName,
        description: row.roleDescription,
      });
    }
  }

  return {
    data: Array.from(userMap.values()),
    total,
  };
}

/**
 * getUserById - Get user by ID with roles
 * @param id - User UUID
 * @returns User with roles
 * @throws Error if user not found
 */
export async function getUserById(id: string): Promise<UserWithRoles> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      address: users.address,
      isActive: users.isActive,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDescription: roles.description,
    })
    .from(users)
    .leftJoin(userRoles, eq(users.id, userRoles.userId))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(users.id, id));

  if (rows.length === 0) {
    throw new Error('User tidak ditemukan');
  }

  // Aggregate roles
  const user: UserWithRoles = {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    phone: rows[0].phone,
    address: rows[0].address,
    isActive: rows[0].isActive,
    emailVerifiedAt: rows[0].emailVerifiedAt,
    createdAt: rows[0].createdAt,
    updatedAt: rows[0].updatedAt,
    roles: [],
  };

  for (const row of rows) {
    if (row.roleId) {
      user.roles.push({
        id: row.roleId,
        name: row.roleName!,
        description: row.roleDescription,
      });
    }
  }

  return user;
}

/**
 * createUser - Create a new user with roles
 * @param data - User creation data
 * @returns Created user with roles
 * @throws Error if validation fails
 */
export async function createUser(data: CreateUserData): Promise<UserWithRoles> {
  const { name, email, password, phone, address, roleIds } = data;

  // Validation: email unique
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    throw new Error('Email sudah terdaftar');
  }

  // Validation: minimal 1 role
  if (!roleIds || roleIds.length === 0) {
    throw new Error('Minimal 1 role harus dipilih');
  }

  // Validation: password min 8 chars
  if (!password || password.length < 8) {
    throw new Error('Password minimal 8 karakter');
  }

  // Validation: roleIds exist in database
  const roleRecords = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, roleIds));

  if (roleRecords.length !== roleIds.length) {
    throw new Error('Satu atau lebih role tidak ditemukan');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user
  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      address: address || null,
      isActive: true,
    })
    .returning();

  // Insert user_roles
  await db.insert(userRoles).values(
    roleIds.map((roleId) => ({
      userId: created.id,
      roleId,
    }))
  );

  // Return created user with roles
  return getUserById(created.id);
}

/**
 * updateUser - Update user data (partial update)
 * @param id - User UUID
 * @param data - User update data
 * @returns Updated user with roles
 * @throws Error if user not found or email already exists
 */
export async function updateUser(
  id: string,
  data: UpdateUserData
): Promise<UserWithRoles> {
  const { name, email, phone, address } = data;

  // Check user exists
  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('User tidak ditemukan');
  }

  // Validation: if email changed, check unique
  if (email && email !== existing.email) {
    const [emailCheck] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (emailCheck) {
      throw new Error('Email sudah digunakan');
    }
  }

  // Build update object (only include provided fields)
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone || null;
  if (address !== undefined) updateData.address = address || null;
  updateData.updatedAt = new Date();

  // Update user
  await db.update(users).set(updateData).where(eq(users.id, id));

  return getUserById(id);
}

/**
 * toggleUserActive - Flip user active status
 * @param id - User UUID
 * @returns Updated active status
 * @throws Error if user not found
 */
export async function toggleUserActive(id: string): Promise<ToggleActiveResult> {
  const [existing] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('User tidak ditemukan');
  }

  const newStatus = !existing.isActive;

  await db
    .update(users)
    .set({ isActive: newStatus, updatedAt: new Date() })
    .where(eq(users.id, id));

  return { id, isActive: newStatus };
}

/**
 * assignRoles - Assign roles to user (replace all existing roles)
 * @param userId - User UUID
 * @param roleIds - Array of role UUIDs
 * @returns Updated user with new roles
 * @throws Error if user not found or roles don't exist
 */
export async function assignRoles(
  userId: string,
  roleIds: string[]
): Promise<UserWithRoles> {
  // Validation: user exists
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existingUser) {
    throw new Error('User tidak ditemukan');
  }

  // Validation: all roleIds exist
  const roleRecords = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, roleIds));

  if (roleRecords.length !== roleIds.length) {
    throw new Error('Satu atau lebih role tidak ditemukan');
  }

  // Delete all existing user_roles
  await db.delete(userRoles).where(eq(userRoles.userId, userId));

  // Insert new user_roles
  await db.insert(userRoles).values(
    roleIds.map((roleId) => ({
      userId,
      roleId,
    }))
  );

  return getUserById(userId);
}

/**
 * deleteUser - Delete user (and their roles)
 * @param id - User UUID
 * @param currentUserId - Current user's ID (to prevent self-deletion)
 * @returns Deletion result
 * @throws Error if user not found or trying to delete self
 */
export async function deleteUser(
  id: string,
  currentUserId: string
): Promise<DeleteUserResult> {
  // Validation: cannot delete self
  if (id === currentUserId) {
    throw new Error('Tidak dapat menghapus diri sendiri');
  }

  // Check user exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('User tidak ditemukan');
  }

  // Delete user_roles first
  await db.delete(userRoles).where(eq(userRoles.userId, id));

  // Delete user
  await db.delete(users).where(eq(users.id, id));

  return { id, deleted: true };
}
