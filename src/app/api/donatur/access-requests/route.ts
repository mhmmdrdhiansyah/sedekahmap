import { NextRequest, NextResponse } from 'next/server';

import { requireRole } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import { createAccessRequest, getAccessRequestsByDonatur } from '@/services/access-request.service';

// ============================================================
// POST /api/donatur/access-requests
// Create a new access request
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(ROLES.DONATUR);

    const body = await request.json();
    const { beneficiaryId, intention } = body;

    // Validate required fields
    if (!beneficiaryId || !intention) {
      return NextResponse.json(
        { error: 'ID penerima manfaat dan niat sedekah harus diisi' },
        { status: 400 }
      );
    }

    // Create access request
    const result = await createAccessRequest(user.id, beneficiaryId, intention);

    return NextResponse.json(
      {
        data: {
          id: result.id,
          beneficiaryId: result.beneficiaryId,
          intention: result.intention,
          status: result.status,
          createdAt: result.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create access request error:', error);

    if (error instanceof Error) {
      // Validation errors
      if (error.message.includes('minimal') || error.message.includes('maksimal')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Duplicate pending request
      if (error.message.includes('sudah memiliki permintaan')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      // Beneficiary not found
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
      { error: 'Terjadi kesalahan saat membuat permintaan akses' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET /api/donatur/access-requests
// Get access requests for the authenticated donatur
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(ROLES.DONATUR);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getAccessRequestsByDonatur(user.id, {
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
    console.error('Get access requests error:', error);

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
      { error: 'Gagal memuat permintaan akses' },
      { status: 500 }
    );
  }
}
