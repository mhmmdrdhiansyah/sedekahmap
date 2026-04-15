import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { listPermissions, createPermission } from '@/services/permission-management.service';

// ============================================================
// GET /api/admin/users/permissions
// List all permissions (admin only)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_READ);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const module = searchParams.get('module') || undefined;

    // Call service
    const result = await listPermissions({ search, module });

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
    console.error('Get permissions error:', error);

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
      { error: 'Gagal memuat data permissions' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/admin/users/permissions
// Create a new permission (admin only)
// ============================================================

interface CreateRequestBody {
  name: string;
  description?: string;
  module: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_CREATE);

    // Parse body
    const body: CreateRequestBody = await request.json();
    const { name, description, module } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Nama permission harus diisi' },
        { status: 400 }
      );
    }

    if (!module || typeof module !== 'string') {
      return NextResponse.json(
        { error: 'Module harus diisi' },
        { status: 400 }
      );
    }

    // Call service
    const result = await createPermission({
      name: name.trim().toLowerCase(),
      description: description?.trim(),
      module: module.trim().toLowerCase(),
    });

    return NextResponse.json(
      { data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create permission error:', error);

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
      { error: 'Gagal membuat permission baru' },
      { status: 500 }
    );
  }
}
