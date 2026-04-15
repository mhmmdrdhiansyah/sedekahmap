import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { listRoles, createRole } from '@/services/role-management.service';

// ============================================================
// GET /api/admin/users/roles
// List all roles (admin only)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_READ);

    // Call service
    const result = await listRoles();

    return NextResponse.json(
      {
        data: result.data,
        pagination: {
          total: result.total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get roles error:', error);

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
    }

    return NextResponse.json(
      { error: 'Gagal memuat data roles' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/admin/users/roles
// Create a new role (admin only)
// ============================================================

interface CreateRequestBody {
  name: string;
  description?: string;
  permissionIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_CREATE);

    // Parse body
    const body: CreateRequestBody = await request.json();
    const { name, description, permissionIds } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Nama role harus diisi' },
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
    const result = await createRole({
      name: name.trim().toLowerCase(),
      description: description?.trim(),
      permissionIds,
    });

    return NextResponse.json(
      { data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create role error:', error);

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

      // Validation errors
      if (error.message.includes('sudah terdaftar') || error.message.includes('sudah digunakan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      // Other validation errors
      if (error.message.includes('tidak ditemukan') || error.message.includes('harus')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal membuat role baru' },
      { status: 500 }
    );
  }
}
