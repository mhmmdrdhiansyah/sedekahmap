import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { updateDistributionProof } from '@/services/distribution.service';

// ============================================================
// PATCH /api/donatur/distributions/[code]
// Update distribution with proof photo and notes
// ============================================================

interface UpdateProofBody {
  proofPhotoUrl: string;
  notes?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.DISTRIBUTION_READ);

    // Get distribution code from params
    const { code } = await params;

    // Parse request body
    const body = (await request.json()) as UpdateProofBody;

    // Validate required fields
    if (!body.proofPhotoUrl) {
      return NextResponse.json(
        { error: 'URL bukti foto harus diisi' },
        { status: 400 }
      );
    }

    // Update distribution proof
    const updatedDistribution = await updateDistributionProof(
      code,
      user.id,
      body.proofPhotoUrl,
      body.notes
    );

    return NextResponse.json(
      {
        data: {
          id: updatedDistribution.id,
          distributionCode: updatedDistribution.distributionCode,
          status: updatedDistribution.status,
          proofPhotoUrl: updatedDistribution.proofPhotoUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update distribution proof error:', error);

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

      // Business logic errors
      if (
        error.message.includes('tidak ditemukan') ||
        error.message.includes('sudah diproses')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal mengupdate distribusi' },
      { status: 500 }
    );
  }
}
