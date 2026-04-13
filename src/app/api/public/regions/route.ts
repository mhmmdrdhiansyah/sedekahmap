import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { like, and, sql } from 'drizzle-orm';
import { activeVerifiedBeneficiaryFilter } from '@/services/beneficiary-filters';

const WILAYAH_API_BASE = 'https://wilayah.id/api';

// Valid types for the API
const VALID_TYPES = ['provinces', 'regencies', 'districts', 'villages'] as const;
type ValidType = typeof VALID_TYPES[number];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Check if this is a search request (for region filter)
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      return handleRegionSearch(searchQuery);
    }

    // Existing wilayah.id proxy functionality
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
    console.error('Regions API error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data wilayah' },
      { status: 500 }
    );
  }
}

// ============================================================
// Handle Region Search (for donatur filter)
// Searches regions that have beneficiaries by region name
// ============================================================

async function handleRegionSearch(query: string) {
  // Return empty if query is too short
  if (query.length < 2) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  // Search regions by regionName using LIKE for prefix matching
  const results = await db
    .select({
      regionCode: beneficiaries.regionCode,
      regionName: beneficiaries.regionName,
      count: sql<number>`count(*)`.as('count'),
      centerLat: sql<number>`avg(${beneficiaries.latitude})`,
      centerLng: sql<number>`avg(${beneficiaries.longitude})`,
    })
    .from(beneficiaries)
    .where(
      and(
        activeVerifiedBeneficiaryFilter(),
        like(beneficiaries.regionName, `${query}%`)
      )
    )
    .groupBy(beneficiaries.regionCode, beneficiaries.regionName)
    .orderBy(sql`count(*) DESC`)
    .limit(20);

  // Transform results to match expected format
  const data = results.map((row) => ({
    regionCode: row.regionCode,
    regionName: row.regionName || 'Unknown',
    count: row.count,
    centerLat: parseFloat(String(row.centerLat)),
    centerLng: parseFloat(String(row.centerLng)),
  }));

  return NextResponse.json({ data }, { status: 200 });
}
