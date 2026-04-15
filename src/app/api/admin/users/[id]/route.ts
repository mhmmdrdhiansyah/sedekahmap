import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import {
  getUserById,
  updateUser,
  toggleUserActive,
  assignRoles,
  deleteUser,
} from '@/services/user-management.service';

// ============================================================
// GET /api/admin/users/[id]
// Get user by ID (admin only)
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_READ);

    const { id } = await params;

    // Call service
    const result = await getUserById(id);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user error:', error);

    if (error instanceof Error) {
      // Auth errors
      if (error.message.startsWith('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Anda harus login terlebih dahulu' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('FORBIDDEN')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses' },
          { status: 403 }
        );
      }

      // Not found
      if (error.message.includes('tidak ditemukan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal memuat data pengguna' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/admin/users/[id]
// Update user profile (admin only)
// ============================================================

interface UpdateRequestBody {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_UPDATE);

    const { id } = await params;

    // Parse body
    const body: UpdateRequestBody = await request.json();
    const { name, email, phone, address } = body;

    // Build update data (only include provided fields)
    const updateData: UpdateRequestBody = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    // Call service
    const result = await updateUser(id, updateData);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user error:', error);

    if (error instanceof Error) {
      // Auth errors
      if (error.message.startsWith('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Anda harus login terlebih dahulu' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('FORBIDDEN')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses' },
          { status: 403 }
        );
      }

      // Not found
      if (error.message.includes('tidak ditemukan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      // Conflict (email already used)
      if (error.message.includes('sudah digunakan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal memperbarui data pengguna' },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH /api/admin/users/[id]
// Toggle active or assign roles (admin only)
// ============================================================

type PatchAction = 'toggle_active' | 'assign_roles';

interface PatchRequestBody {
  action: PatchAction;
  roleIds?: string[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse body first to check action
    const body: PatchRequestBody = await request.json();
    const { action, roleIds } = body;

    // Validate action
    if (action !== 'toggle_active' && action !== 'assign_roles') {
      return NextResponse.json(
        { error: 'Action harus berupa toggle_active atau assign_roles' },
        { status: 400 }
      );
    }

    // Permission check based on action
    if (action === 'assign_roles') {
      await requirePermission(PERMISSIONS.USER_ASSIGN_ROLE);
    } else {
      await requirePermission(PERMISSIONS.USER_UPDATE);
    }

    // Execute action
    let result;
    if (action === 'toggle_active') {
      result = await toggleUserActive(id);
    } else {
      // assign_roles
      if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
        return NextResponse.json(
          { error: 'Minimal 1 role harus dipilih' },
          { status: 400 }
        );
      }
      result = await assignRoles(id, roleIds);
    }

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('User action error:', error);

    if (error instanceof Error) {
      // Auth errors
      if (error.message.startsWith('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Anda harus login terlebih dahulu' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('FORBIDDEN')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses' },
          { status: 403 }
        );
      }

      // Not found
      if (error.message.includes('tidak ditemukan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      // Validation errors
      if (error.message.includes('harus')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal memproses aksi' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/admin/users/[id]
// Delete user (admin only)
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.USER_DELETE);

    const { id } = await params;

    // Call service (pass current user ID to prevent self-deletion)
    const result = await deleteUser(id, user.id);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete user error:', error);

    if (error instanceof Error) {
      // Auth errors
      if (error.message.startsWith('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Anda harus login terlebih dahulu' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('FORBIDDEN')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses' },
          { status: 403 }
        );
      }

      // Not found or validation error
      if (error.message.includes('tidak ditemukan') || error.message.includes('Tidak dapat')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal menghapus pengguna' },
      { status: 500 }
    );
  }
}
