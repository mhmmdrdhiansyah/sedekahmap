import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import {
  getBeneficiaryById,
  updateBeneficiary,
  deleteBeneficiary,
} from '@/services/beneficiary.service';

// ============================================================
// GET /api/verifikator/beneficiaries/[id]
// Get a single beneficiary by ID (with ownership check)
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(ROLES.VERIFIKATOR);

    const beneficiary = await getBeneficiaryById(id);

    // Ownership check
    if (beneficiary.verifiedById !== user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke data ini' },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: beneficiary }, { status: 200 });
  } catch (error) {
    console.error('Get beneficiary detail error:', error);

    // Handle auth errors
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
      // Handle not found
      if (error.message === 'Data penerima manfaat tidak ditemukan') {
        return NextResponse.json(
          { error: 'Data tidak ditemukan' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal memuat data penerima manfaat' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/verifikator/beneficiaries/[id]
// Update a beneficiary (with ownership check)
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(ROLES.VERIFIKATOR);

    // Check ownership first
    const existing = await getBeneficiaryById(id);
    if (existing.verifiedById !== user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke data ini' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate coordinates if provided
    if (body.latitude !== undefined) {
      const lat = Number(body.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { error: 'Latitude tidak valid (harus -90 sampai 90)' },
          { status: 400 }
        );
      }
    }

    if (body.longitude !== undefined) {
      const lng = Number(body.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'Longitude tidak valid (harus -180 sampai 180)' },
          { status: 400 }
        );
      }
    }

    // Update beneficiary
    const data = await updateBeneficiary(id, body);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Update beneficiary error:', error);

    // Handle auth errors
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
      // Handle not found
      if (error.message === 'Data penerima manfaat tidak ditemukan') {
        return NextResponse.json(
          { error: 'Data tidak ditemukan' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal mengupdate data penerima manfaat' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/verifikator/beneficiaries/[id]
// Delete a beneficiary (with ownership check)
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole(ROLES.VERIFIKATOR);

    // Check ownership first
    const existing = await getBeneficiaryById(id);
    if (existing.verifiedById !== user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke data ini' },
        { status: 403 }
      );
    }

    // Delete beneficiary
    await deleteBeneficiary(id);

    return NextResponse.json(
      { success: true, message: 'Data berhasil dihapus' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete beneficiary error:', error);

    // Handle auth errors
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
      // Handle not found
      if (error.message === 'Data penerima manfaat tidak ditemukan') {
        return NextResponse.json(
          { error: 'Data tidak ditemukan' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal menghapus data penerima manfaat' },
      { status: 500 }
    );
  }
}
