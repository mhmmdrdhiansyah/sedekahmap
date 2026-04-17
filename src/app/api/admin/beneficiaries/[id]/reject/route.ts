import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { rejectBeneficiary } from '@/services/beneficiary.service';

// ============================================================
// POST /api/admin/beneficiaries/[id]/reject
// Reject a pending beneficiary
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission(PERMISSIONS.BENEFICIARY_REJECT);
    const body = await request.json();

    const reason = body.reason || '';

    const data = await rejectBeneficiary(id, user.id, reason);

    return NextResponse.json(
      { data, message: 'Data penerima manfaat ditolak' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reject beneficiary error:', error);

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
      if (error.message === 'Data penerima manfaat tidak ditemukan') {
        return NextResponse.json(
          { error: 'Data tidak ditemukan' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal menolak data penerima manfaat' },
      { status: 500 }
    );
  }
}
