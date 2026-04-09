import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { distributions } from '@/db/schema/distributions';
import { eq, count, avg, sql, like, and } from 'drizzle-orm';
import { activeVerifiedBeneficiaryFilter } from './beneficiary-filters';

export interface RegionSummary {
  regionCode: string;
  regionName: string | null;
  count: number;
  centerLat: number;
  centerLng: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface PublicStats {
  totalFamilies: number;
  totalVillages: number;
  totalDistributions: number;
}

const JITTER_RANGE = 0.003; // ~300 meter max offset
const INTENSITY = 1.0;

// Helper: Determine region level from code format
// Level 1 (Prov): "31" (2 digits)
// Level 2 (Kab): "31.74" (5 chars)
// Level 3 (Kec): "31.74.09" (8 chars)
// Level 4 (Des): "31.74.09.1001" (14+ chars)
function getRegionLevelFromCode(code: string): number {
  const dots = code.split('.').length;
  if (dots === 1) return 1; // Provinsi
  if (dots === 2) return 2; // Kabupaten
  if (dots === 3) return 3; // Kecamatan
  return 4; // Desa
}

export async function getPublicMapData(): Promise<RegionSummary[]> {
  const result = await db
    .select({
      regionCode: beneficiaries.regionCode,
      regionName: beneficiaries.regionName,
      count: count(),
      centerLat: avg(beneficiaries.latitude),
      centerLng: avg(beneficiaries.longitude),
    })
    .from(beneficiaries)
    .where(activeVerifiedBeneficiaryFilter())
    .groupBy(beneficiaries.regionCode, beneficiaries.regionName)
    .orderBy(sql`count(*) DESC`);

  return result.map((row) => ({
    regionCode: row.regionCode,
    regionName: row.regionName || 'Unknown Region',
    count: row.count,
    centerLat: parseFloat(String(row.centerLat)),
    centerLng: parseFloat(String(row.centerLng)),
  }));
}

export async function getPublicHeatmapData(): Promise<HeatmapPoint[]> {
  const result = await db
    .select({
      latitude: beneficiaries.latitude,
      longitude: beneficiaries.longitude,
    })
    .from(beneficiaries)
    .where(activeVerifiedBeneficiaryFilter());

  return result.map((row) => {
    const jitterLat = (Math.random() - 0.5) * 2 * JITTER_RANGE;
    const jitterLng = (Math.random() - 0.5) * 2 * JITTER_RANGE;
    return {
      lat: row.latitude + jitterLat,
      lng: row.longitude + jitterLng,
      intensity: INTENSITY,
    };
  });
}

export async function getPublicStats(regionCode?: string): Promise<PublicStats> {
  // Build region filter if regionCode is provided
  const regionFilter = regionCode
    ? like(beneficiaries.regionCode, `${regionCode}%`)
    : undefined;

  // Total verified active families
  const familyConditions = regionFilter
    ? and(activeVerifiedBeneficiaryFilter(), regionFilter)
    : activeVerifiedBeneficiaryFilter();

  const [familyRow] = await db
    .select({ total: count() })
    .from(beneficiaries)
    .where(familyConditions);

  // Total distinct villages with verified beneficiaries (no JOIN needed)
  const villageConditions = regionFilter
    ? and(activeVerifiedBeneficiaryFilter(), regionFilter)
    : activeVerifiedBeneficiaryFilter();

  const [villageRow] = await db
    .select({ total: sql<number>`COUNT(DISTINCT ${beneficiaries.regionCode})` })
    .from(beneficiaries)
    .where(villageConditions);

  // Total completed distributions (filter by region through beneficiaries)
  const [distRow] = await db
    .select({ total: count() })
    .from(distributions)
    .innerJoin(beneficiaries, eq(distributions.beneficiaryId, beneficiaries.id))
    .where(
      regionFilter
        ? and(eq(distributions.status, 'completed'), regionFilter)
        : eq(distributions.status, 'completed')
    );

  return {
    totalFamilies: familyRow.total,
    totalVillages: villageRow.total,
    totalDistributions: distRow.total,
  };
}
