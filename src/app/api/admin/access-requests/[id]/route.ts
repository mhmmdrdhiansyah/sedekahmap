import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { approveAccessRequest, rejectAccessRequest } from '@/services/access-request.service';

// ============================================================
// PATCH /api/admin/access-requests/[id]
// Approve or reject an access request (admin only)
// ============================================================

interface ActionBody {
  action: 'approve' | 'reject';
  reason?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.ACCESS_REQUEST_APPROVE);
    const { id } = await params;

    // Parse body
    const body: ActionBody = await request.json();
    const { action, reason } = body;

    // Validate action
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Action harus berupa approve atau reject' },
        { status: 400 }
      );
    }

    // Execute action
    if (action === 'approve') {
      const result = await approveAccessRequest(id, user.id);
      return NextResponse.json(
        {
          data: {
            accessRequest: {
              id: result.accessRequest.id,
              status: result.accessRequest.status,
              distributionCode: result.accessRequest.distributionCode,
              reviewedAt: result.accessRequest.reviewedAt,
            },
            distribution: result.distribution,
          },
        },
        { status: 200 }
      );
    } else {
      const result = await rejectAccessRequest(id, user.id, reason);
      return NextResponse.json(
        {
          data: {
            id: result.id,
            status: result.status,
            reviewedAt: result.reviewedAt,
            rejectionReason: result.rejectionReason,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Access request action error:', error);

    if (error instanceof Error) {
      // Not found
      if (error.message.includes('tidak ditemukan')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      // Already processed
      if (error.message.includes('sudah diproses')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
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
      { error: 'Gagal memproses permintaan akses' },
      { status: 500 }
    );
  }
}
