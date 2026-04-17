import { NextRequest, NextResponse } from 'next/server';

import { getBeneficiariesByRegion } from '@/services/beneficiary.service';

// ============================================================
// GET /api/public/beneficiaries-by-region
// Get beneficiaries by region code (public endpoint, names are masked)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionCode = searchParams.get('regionCode');

    if (!regionCode) {
      return NextResponse.json(
        { error: 'Parameter regionCode harus diisi' },
        { status: 400 }
      );
    }

    const data = await getBeneficiariesByRegion(regionCode);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Get beneficiaries by region error:', error);

    return NextResponse.json(
      { error: 'Gagal memuat data penerima manfaat' },
      { status: 500 }
    );
  }
}
