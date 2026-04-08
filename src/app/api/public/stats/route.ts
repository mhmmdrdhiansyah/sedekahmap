import { NextResponse } from 'next/server';
import { getPublicStats } from '@/services/beneficiary.service';

export async function GET() {
  try {
    const data = await getPublicStats();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public stats error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat statistik' },
      { status: 500 }
    );
  }
}
