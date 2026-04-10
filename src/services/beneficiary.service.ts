import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { distributions } from '@/db/schema/distributions';
import { eq, count, avg, sql, like, and, desc, ne } from 'drizzle-orm';
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

// ============================================================
// VERIFIKATOR SERVICE FUNCTIONS
// ============================================================

export interface CreateBeneficiaryInput {
  nik: string;
  name: string;
  address: string;
  needs: string;
  latitude: number;
  longitude: number;
  regionCode: string;
  regionName?: string;
  regionPath?: string;
}

export interface BeneficiaryItem {
  id: string;
  nik: string;
  name: string;
  address: string;
  needs: string;
  latitude: number;
  longitude: number;
  regionCode: string;
  regionName: string | null;
  regionPath: string | null;
  status: string;
  verifiedById: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateBeneficiaryInput {
  name?: string;
  address?: string;
  needs?: string;
  latitude?: number;
  longitude?: number;
  regionCode?: string;
  regionName?: string;
  regionPath?: string;
}

/**
 * createBeneficiary - Create new beneficiary with NIK uniqueness check
 * @throws Error if NIK already exists
 */
export async function createBeneficiary(
  data: CreateBeneficiaryInput,
  verifikatorId: string
): Promise<BeneficiaryItem> {
  // Check NIK uniqueness
  const [existing] = await db
    .select({ id: beneficiaries.id })
    .from(beneficiaries)
    .where(eq(beneficiaries.nik, data.nik))
    .limit(1);

  if (existing) {
    throw new Error('NIK sudah terdaftar');
  }

  // Calculate expiresAt (6 months from now)
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  // Insert new beneficiary
  const [result] = await db
    .insert(beneficiaries)
    .values({
      nik: data.nik,
      name: data.name,
      address: data.address,
      needs: data.needs,
      latitude: data.latitude,
      longitude: data.longitude,
      regionCode: data.regionCode,
      regionName: data.regionName ?? null,
      regionPath: data.regionPath ?? null,
      status: 'verified',
      verifiedById: verifikatorId,
      verifiedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return result as BeneficiaryItem;
}

/**
 * Mask nama function - format "X*** ***y"
 * Examples: "Ahmad Rizki" → "A*** ***i", "Budi" → "B***i"
 */
function maskName(name: string): string {
  const trimmedName = name.trim();

  if (trimmedName.includes(' ')) {
    // Multi-word name: "Ahmad Rizki" → "A*** ***i"
    const parts = trimmedName.split(' ');
    if (parts.length >= 2) {
      const firstInitial = parts[0][0];
      const lastInitial = parts[parts.length - 1][parts[parts.length - 1].length - 1];
      return `${firstInitial}*** ***${lastInitial}`;
    }
  }

  // Single word name: "Budi" → "B***i"
  if (trimmedName.length > 1) {
    const firstChar = trimmedName[0];
    const lastChar = trimmedName[trimmedName.length - 1];
    return `${firstChar}***${lastChar}`;
  }

  // Single character: return as is
  return trimmedName;
}

/**
 * getBeneficiariesByVerifikator - Get all beneficiaries for a verifikator (with masked names)
 */
export async function getBeneficiariesByVerifikator(
  verifikatorId: string
): Promise<BeneficiaryItem[]> {
  const results = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.verifiedById, verifikatorId))
    .orderBy(desc(beneficiaries.createdAt));

  // Mask names for privacy
  return results.map((item) => ({
    ...item,
    name: maskName(item.name),
  })) as BeneficiaryItem[];
}

/**
 * getBeneficiaryById - Get single beneficiary by ID
 * @throws Error if not found
 */
export async function getBeneficiaryById(id: string): Promise<BeneficiaryItem> {
  const [result] = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.id, id))
    .limit(1);

  if (!result) {
    throw new Error('Data penerima manfaat tidak ditemukan');
  }

  return result as BeneficiaryItem;
}

/**
 * updateBeneficiary - Update beneficiary data
 * @throws Error if beneficiary not found
 */
export async function updateBeneficiary(
  id: string,
  data: UpdateBeneficiaryInput
): Promise<BeneficiaryItem> {
  // Check existence first
  await getBeneficiaryById(id);

  // Build update object with only provided fields
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.needs !== undefined) updateData.needs = data.needs;
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.regionCode !== undefined) updateData.regionCode = data.regionCode;
  if (data.regionName !== undefined) updateData.regionName = data.regionName;
  if (data.regionPath !== undefined) updateData.regionPath = data.regionPath;

  const [result] = await db
    .update(beneficiaries)
    .set(updateData)
    .where(eq(beneficiaries.id, id))
    .returning();

  return result as BeneficiaryItem;
}

/**
 * deleteBeneficiary - Hard delete a beneficiary
 * @throws Error if beneficiary not found
 */
export async function deleteBeneficiary(id: string): Promise<{ success: boolean }> {
  // Check existence first
  await getBeneficiaryById(id);

  await db.delete(beneficiaries).where(eq(beneficiaries.id, id));

  return { success: true };
}
