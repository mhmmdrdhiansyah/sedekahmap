import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import {
  getRoleById,
  updateRole,
  assignPermissionsToRole,
  deleteRole,
} from '@/services/role-management.service';

// ============================================================
// GET /api/admin/users/roles/[id]
// Get role by ID (admin only)
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
    const result = await getRoleById(id);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get role error:', error);

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
      { error: 'Gagal memuat data role' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/admin/users/roles/[id]
// Update role (admin only)
// ============================================================

interface UpdateRequestBody {
  name?: string;
  description?: string;
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
    const { name, description } = body;

    // Call service
    const result = await updateRole(id, { name, description });

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update role error:', error);

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

      // Conflict (name already used)
      if (error.message.includes('sudah digunakan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal memperbarui role' },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH /api/admin/users/roles/[id]
// Assign permissions to role (admin only)
// ============================================================

interface PatchRequestBody {
  action: 'assign_permissions';
  permissionIds: string[];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_ASSIGN_ROLE);

    const { id } = await params;

    // Parse body
    const body: PatchRequestBody = await request.json();
    const { action, permissionIds } = body;

    // Validate action
    if (action !== 'assign_permissions') {
      return NextResponse.json(
        { error: 'Action harus berupa assign_permissions' },
        { status: 400 }
      );
    }

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: 'Permission IDs harus berupa array' },
        { status: 400 }
      );
    }

    // Call service
    const result = await assignPermissionsToRole(id, permissionIds);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Assign permissions error:', error);

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
      if (error.message.includes('tidak ditemukan') || error.message.includes('harus')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal menetapkan permissions' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/admin/users/roles/[id]
// Delete role (admin only)
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_DELETE);

    const { id } = await params;

    // Call service
    const result = await deleteRole(id);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete role error:', error);

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
      { error: 'Gagal menghapus role' },
      { status: 500 }
    );
  }
}
