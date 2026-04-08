import { NextRequest, NextResponse } from 'next/server';
import { getPublicStats } from '@/services/beneficiary.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const regionCode = searchParams.get('regionCode') || undefined;

    const data = await getPublicStats(regionCode);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public stats error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat statistik' },
      { status: 500 }
    );
  }
}
