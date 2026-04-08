import { NextResponse } from 'next/server';
import { getPublicHeatmapData } from '@/services/beneficiary.service';

export async function GET() {
  try {
    const points = await getPublicHeatmapData();
    const data = points.map((p) => [p.lat, p.lng, p.intensity]);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public heatmap data error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data heatmap' },
      { status: 500 }
    );
  }
}
