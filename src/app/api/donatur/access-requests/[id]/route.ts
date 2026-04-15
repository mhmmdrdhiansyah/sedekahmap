import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { deleteAccessRequest } from '@/services/access-request.service';

// ============================================================
// DELETE /api/donatur/access-requests/[id]
// Delete a pending access request
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.ACCESS_REQUEST_CREATE);

    // Get access request ID from params
    const { id } = await params;

    // Delete access request
    await deleteAccessRequest(id, user.id);

    return NextResponse.json(
      {
        message: 'Permintaan akses berhasil dihapus',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete access request error:', error);

    if (error instanceof Error) {
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
      { error: 'Gagal menghapus permintaan akses' },
      { status: 500 }
    );
  }
}
