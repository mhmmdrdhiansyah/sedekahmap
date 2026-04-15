import { NextRequest, NextResponse } from 'next/server';
import { expireOverdueBeneficiaries, getExpiredBeneficiaryStats } from '@/services/beneficiary.service';

/**
 * POST /api/cron/expire-beneficiaries
 * Cron job untuk mengubah status beneficiary yang sudah melewati expiresAt.
 *
 * Auth: CRON_SECRET header (untuk mencegah akses tidak sah)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate CRON_SECRET
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await expireOverdueBeneficiaries();
    const stats = await getExpiredBeneficiaryStats();

    return NextResponse.json({
      message: `${result.updatedCount} beneficiary expired di-update`,
      updatedCount: result.updatedCount,
      stats,
    });
  } catch (error) {
    console.error('[cron/expire-beneficiaries] Error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses expired beneficiaries' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/expire-beneficiaries
 * Endpoint untuk melihat stats expired beneficiaries (manual trigger / monitoring).
 *
 * Auth: CRON_SECRET header
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await getExpiredBeneficiaryStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[cron/expire-beneficiaries] Error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil statistik' },
      { status: 500 }
    );
  }
}
