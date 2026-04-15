import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import {
  getPermissionById,
  updatePermission,
  deletePermission,
} from '@/services/permission-management.service';

// ============================================================
// GET /api/admin/users/permissions/[id]
// Get permission by ID (admin only)
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
    const result = await getPermissionById(id);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get permission error:', error);

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
      { error: 'Gagal memuat data permission' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/admin/users/permissions/[id]
// Update permission (admin only)
// ============================================================

interface UpdateRequestBody {
  name?: string;
  description?: string;
  module?: string;
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
    const { name, description, module } = body;

    // Call service
    const result = await updatePermission(id, { name, description, module });

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update permission error:', error);

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
      { error: 'Gagal memperbarui permission' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/admin/users/permissions/[id]
// Delete permission (admin only)
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
    const result = await deletePermission(id);

    return NextResponse.json(
      { data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete permission error:', error);

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
      { error: 'Gagal menghapus permission' },
      { status: 500 }
    );
  }
}
