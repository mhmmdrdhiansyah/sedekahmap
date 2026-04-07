import { NextResponse } from 'next/server';
import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { regions } from '@/db/schema/regions';
import { eq, and, or, isNull, gt, sql, count, avg } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db
      .select({
        regionCode: beneficiaries.regionCode,
        regionName: regions.name,
        regionLevel: regions.level,
        count: count(),
        centerLat: avg(beneficiaries.latitude),
        centerLng: avg(beneficiaries.longitude),
      })
      .from(beneficiaries)
      .innerJoin(regions, eq(beneficiaries.regionCode, regions.code))
      .where(
        and(
          eq(beneficiaries.status, 'verified'),
          or(
            isNull(beneficiaries.expiresAt),
            gt(beneficiaries.expiresAt, sql`NOW()`)
          )
        )
      )
      .groupBy(beneficiaries.regionCode, regions.name, regions.level)
      .orderBy(sql`count(*) DESC`);

    const data = result.map((row) => ({
      regionCode: row.regionCode,
      regionName: row.regionName,
      regionLevel: row.regionLevel,
      count: row.count,
      centerLat: parseFloat(String(row.centerLat)),
      centerLng: parseFloat(String(row.centerLng)),
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public map data error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data peta' },
      { status: 500 }
    );
  }
}
