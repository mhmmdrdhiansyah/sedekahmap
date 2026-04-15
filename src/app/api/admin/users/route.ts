import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { listUsers, createUser } from '@/services/user-management.service';

// ============================================================
// GET /api/admin/users
// List all users (admin only)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_READ);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

    // Pagination with limits
    let limit = parseInt(searchParams.get('limit') || '20', 10);
    if (limit > 100) limit = 100; // Max 100
    if (limit < 1) limit = 20;

    let offset = parseInt(searchParams.get('offset') || '0', 10);
    if (offset < 0) offset = 0;

    // Call service
    const result = await listUsers(
      { search, role, isActive },
      { limit, offset }
    );

    return NextResponse.json(
      {
        data: result.data,
        pagination: {
          limit,
          offset,
          total: result.total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get users error:', error);

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
      { error: 'Gagal memuat data pengguna' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/admin/users
// Create a new user (admin only)
// ============================================================

interface CreateRequestBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  roleIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.USER_CREATE);

    // Parse body
    const body: CreateRequestBody = await request.json();
    const { name, email, password, phone, address, roleIds } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Nama harus diisi' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email harus diisi' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password harus diisi' },
        { status: 400 }
      );
    }

    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
      return NextResponse.json(
        { error: 'Minimal 1 role harus dipilih' },
        { status: 400 }
      );
    }

    // Call service
    const result = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone?.trim(),
      address: address?.trim(),
      roleIds,
    });

    return NextResponse.json(
      { data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);

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
      { error: 'Gagal membuat pengguna baru' },
      { status: 500 }
    );
  }
}
