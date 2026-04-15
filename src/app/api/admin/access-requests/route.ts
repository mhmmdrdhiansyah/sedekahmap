import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { getAllAccessRequests } from '@/services/access-request.service';

// ============================================================
// GET /api/admin/access-requests
// List all access requests (admin only)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Auth & permission check
    await requirePermission(PERMISSIONS.ACCESS_REQUEST_READ);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Call service
    const result = await getAllAccessRequests({ status, limit, offset });

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
    console.error('Get all access requests error:', error);

    if (error instanceof Error) {
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
      { error: 'Gagal memuat permintaan akses' },
      { status: 500 }
    );
  }
}
