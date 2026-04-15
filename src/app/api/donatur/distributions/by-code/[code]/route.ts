import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { getDistributionByCode } from '@/services/distribution.service';

// ============================================================
// GET /api/donatur/distributions/by-code/[code]
// Get distribution by code for authenticated donatur
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.DISTRIBUTION_READ);

    // Get distribution code from params
    const { code } = await params;

    // Get distribution by code (includes ownership check)
    const distribution = await getDistributionByCode(code, user.id);

    return NextResponse.json(
      {
        data: {
          distributionCode: distribution.distributionCode,
          beneficiaryName: distribution.beneficiary.name,
          regionName: distribution.beneficiary.regionName,
          needs: distribution.beneficiary.needs,
          status: distribution.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get distribution by code error:', error);

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

      // Business logic errors - return 404 for not found
      if (error.message.includes('tidak ditemukan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal memuat data distribusi' },
      { status: 500 }
    );
  }
}
