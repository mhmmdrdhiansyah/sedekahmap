import { NextRequest, NextResponse } from 'next/server';

const WILAYAH_API_BASE = 'https://wilayah.id/api';

// Valid types for the API
const VALID_TYPES = ['provinces', 'regencies', 'districts', 'villages'] as const;
type ValidType = typeof VALID_TYPES[number];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as ValidType | null;
    const parentCode = searchParams.get('parentCode');

    // Validate type parameter
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Parameter "type" wajib diisi (provinces, regencies, districts, villages)' },
        { status: 400 }
      );
    }

    // For non-province types, parentCode is required
    if (type !== 'provinces' && !parentCode) {
      return NextResponse.json(
        { error: 'Parameter "parentCode" wajib diisi untuk regencies/districts/villages' },
        { status: 400 }
      );
    }

    // Build the wilayah.id API URL
    let apiUrl: string;
    if (type === 'provinces') {
      apiUrl = `${WILAYAH_API_BASE}/provinces.json`;
    } else {
      apiUrl = `${WILAYAH_API_BASE}/${type}/${parentCode}.json`;
    }

    // Fetch from wilayah.id API (server-side, no CORS)
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`wilayah.id API returned ${response.status}`);
    }

    const result = await response.json();

    // Extract the data array from wilayah.id response { data: [...], meta: {...} }
    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (error) {
    console.error('Regions proxy API error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data wilayah' },
      { status: 500 }
    );
  }
}
