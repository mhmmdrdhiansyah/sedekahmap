import { NextResponse } from 'next/server';
import { getPublicMapData } from '@/services/beneficiary.service';

export async function GET() {
  try {
    const data = await getPublicMapData();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public map data error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data peta' },
      { status: 500 }
    );
  }
}
