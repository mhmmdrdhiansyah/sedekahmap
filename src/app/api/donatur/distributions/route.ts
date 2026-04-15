import { NextRequest, NextResponse } from 'next/server';

import { requirePermission, getCurrentUser } from '@/lib/auth-utils';
import { PERMISSIONS, STATUS } from '@/lib/constants';
import { getDistributionsByDonaturId } from '@/services/distribution.service';

// ============================================================
// GET /api/donatur/distributions
// List distributions for authenticated donatur
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.DISTRIBUTION_READ);

    // Get donatur ID from user
    const donaturId = user.id;

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as
      | 'pending_proof'
      | 'pending_review'
      | 'completed'
      | 'rejected') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Call service
    const result = await getDistributionsByDonaturId(donaturId, {
      status,
      limit,
      offset,
    });

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
    console.error('Get donatur distributions error:', error);

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
      { error: 'Gagal memuat data distribusi' },
      { status: 500 }
    );
  }
}
