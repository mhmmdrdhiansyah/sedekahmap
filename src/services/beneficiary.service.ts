import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { regions } from '@/db/schema/regions';
import { distributions } from '@/db/schema/distributions';
import { eq, count, avg, sql } from 'drizzle-orm';
import { activeVerifiedBeneficiaryFilter } from './beneficiary-filters';

export interface RegionSummary {
  regionCode: string;
  regionName: string;
  regionLevel: number;
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

export async function getPublicMapData(): Promise<RegionSummary[]> {
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
    .where(activeVerifiedBeneficiaryFilter())
    .groupBy(beneficiaries.regionCode, regions.name, regions.level)
    .orderBy(sql`count(*) DESC`);

  return result.map((row) => ({
    regionCode: row.regionCode,
    regionName: row.regionName,
    regionLevel: row.regionLevel,
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

export async function getPublicStats(): Promise<PublicStats> {
  // Total verified active families
  const [familyRow] = await db
    .select({ total: count() })
    .from(beneficiaries)
    .where(activeVerifiedBeneficiaryFilter());

  // Total distinct villages with verified beneficiaries
  const [villageRow] = await db
    .select({ total: sql<number>`COUNT(DISTINCT ${beneficiaries.regionCode})` })
    .from(beneficiaries)
    .innerJoin(regions, eq(beneficiaries.regionCode, regions.code))
    .where(activeVerifiedBeneficiaryFilter());

  // Total completed distributions
  const [distRow] = await db
    .select({ total: count() })
    .from(distributions)
    .where(eq(distributions.status, 'completed'));

  return {
    totalFamilies: familyRow.total,
    totalVillages: villageRow.total,
    totalDistributions: distRow.total,
  };
}
