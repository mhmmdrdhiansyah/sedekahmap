import { NextResponse } from 'next/server';

import { requireRole } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import { getAccessRequestDetail } from '@/services/access-request.service';

// ============================================================
// GET /api/donatur/access-requests/[id]
// Get detail of a specific access request
// ============================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(ROLES.DONATUR);
    const { id } = await params;

    const result = await getAccessRequestDetail(id, user.id);

    return NextResponse.json(
      {
        data: {
          id: result.id,
          beneficiary: result.beneficiary,
          intention: result.intention,
          status: result.status,
          distributionCode: result.distributionCode,
          createdAt: result.createdAt,
          reviewedAt: result.reviewedAt,
          rejectionReason: result.rejectionReason,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get access request detail error:', error);

    if (error instanceof Error) {
      // Not found
      if (error.message.includes('tidak ditemukan')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

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
      { error: 'Gagal memuat detail permintaan akses' },
      { status: 500 }
    );
  }
}
