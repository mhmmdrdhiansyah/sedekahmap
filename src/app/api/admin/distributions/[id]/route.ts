import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { verifyDistribution } from '@/services/distribution.service';

// ============================================================
// PATCH /api/admin/distributions/[id]
// Verify or reject a distribution (admin only)
// ============================================================

interface ActionBody {
  action: 'verify' | 'reject';
  notes?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.DISTRIBUTION_VERIFY);
    const { id } = await params;

    // Parse body
    const body: ActionBody = await request.json();
    const { action, notes } = body;

    // Validate action
    if (action !== 'verify' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Action harus berupa verify atau reject' },
        { status: 400 }
      );
    }

    // Execute action
    const result = await verifyDistribution(
      id,
      user.id,
      action === 'verify',
      notes
    );

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Distribution verify error:', error);

    if (error instanceof Error) {
      // Not found
      if (error.message.includes('tidak ditemukan')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      // Already processed
      if (error.message.includes('sudah diproses')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      // Proof not uploaded
      if (error.message.includes('belum diupload')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
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
      { error: 'Gagal memverifikasi distribusi' },
      { status: 500 }
    );
  }
}
