import { NextResponse } from 'next/server';
import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { eq, and, or, isNull, gt, sql } from 'drizzle-orm';

const JITTER_RANGE = 0.003; // ~300 meter max offset
const INTENSITY = 1.0;

export async function GET() {
  try {
    const result = await db
      .select({
        latitude: beneficiaries.latitude,
        longitude: beneficiaries.longitude,
      })
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.status, 'verified'),
          or(
            isNull(beneficiaries.expiresAt),
            gt(beneficiaries.expiresAt, sql`NOW()`)
          )
        )
      );

    const data: number[][] = result.map((row) => {
      const jitterLat = (Math.random() - 0.5) * 2 * JITTER_RANGE;
      const jitterLng = (Math.random() - 0.5) * 2 * JITTER_RANGE;
      return [
        row.latitude + jitterLat,
        row.longitude + jitterLng,
        INTENSITY,
      ];
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public heatmap data error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data heatmap' },
      { status: 500 }
    );
  }
}
