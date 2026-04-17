import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { getPendingBeneficiaries } from '@/services/beneficiary.service';

// ============================================================
// GET /api/admin/beneficiaries/pending
// Get all beneficiaries with pending status
// ============================================================
export async function GET() {
  try {
    const user = await requirePermission(PERMISSIONS.BENEFICIARY_READ);
    const data = await getPendingBeneficiaries();

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Get pending beneficiaries error:', error);

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
      { error: 'Gagal memuat data penerima manfaat pending' },
      { status: 500 }
    );
  }
}
