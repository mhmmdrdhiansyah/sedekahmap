import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import {
  createBeneficiary,
  getBeneficiariesByVerifikator,
} from '@/services/beneficiary.service';

// ============================================================
// GET /api/verifikator/beneficiaries
// Get all beneficiaries for the logged-in verifikator
// ============================================================
export async function GET() {
  try {
    const user = await requireRole(ROLES.VERIFIKATOR);
    const data = await getBeneficiariesByVerifikator(user.id);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Get beneficiaries error:', error);

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
    }

    return NextResponse.json(
      { error: 'Gagal memuat data penerima manfaat' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/verifikator/beneficiaries
// Create a new beneficiary
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(ROLES.VERIFIKATOR);
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'nik',
      'name',
      'address',
      'needs',
      'latitude',
      'longitude',
      'regionCode',
    ] as const;

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Field ${field} wajib diisi` },
          { status: 400 }
        );
      }
    }

    // Validate NIK: 16 digits, numeric only
    const nik = String(body.nik).trim();
    if (!/^\d{16}$/.test(nik)) {
      return NextResponse.json(
        { error: 'NIK harus 16 digit angka' },
        { status: 400 }
      );
    }

    // Validate coordinates
    const lat = Number(body.latitude);
    const lng = Number(body.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: 'Latitude tidak valid (harus -90 sampai 90)' },
        { status: 400 }
      );
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Longitude tidak valid (harus -180 sampai 180)' },
        { status: 400 }
      );
    }

    // Create beneficiary
    const data = await createBeneficiary(
      {
        nik,
        name: String(body.name).trim(),
        address: String(body.address).trim(),
        needs: String(body.needs).trim(),
        latitude: lat,
        longitude: lng,
        regionCode: String(body.regionCode).trim(),
        regionName: body.regionName ? String(body.regionName).trim() : undefined,
        regionPath: body.regionPath ? String(body.regionPath).trim() : undefined,
      },
      user.id
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Create beneficiary error:', error);

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
      // Handle NIK duplicate
      if (error.message === 'NIK sudah terdaftar') {
        return NextResponse.json(
          { error: 'NIK sudah terdaftar' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal menyimpan data penerima manfaat' },
      { status: 500 }
    );
  }
}
