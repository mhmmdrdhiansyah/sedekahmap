import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { distributions } from '@/db/schema/distributions';
import { eq, count, avg, sql, like, and, desc, ne, lt, isNotNull, isNull } from 'drizzle-orm';
import { STATUS } from '@/lib/constants';
import { activeVerifiedBeneficiaryFilter } from './beneficiary-filters';
import { encrypt, decrypt, hashNIK } from '@/lib/crypto';
import { createAuditLog } from './audit.service';
import type { ParsedBeneficiaryRow } from '@/lib/csv-parser';
import { randomUUID } from 'crypto';

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

export interface BeneficiaryListItem {
  id: string;
  name: string;
  needs: string;
  regionName: string | null;
  latitude?: number;
  longitude?: number;
}

/**
 * getBeneficiariesByRegion - Get beneficiaries by region code (public, with masked names)
 * Used for donatur to see available beneficiaries in a region before requesting access
 * @param regionCode - Region code to match (supports prefix matching)
 * @param exact - If true, use exact match; if false, use LIKE prefix matching (default: false)
 */
export async function getBeneficiariesByRegion(
  regionCode: string,
  exact: boolean = false
): Promise<BeneficiaryListItem[]> {
  // Build condition: exact match or prefix match (LIKE)
  const regionCondition = exact
    ? eq(beneficiaries.regionCode, regionCode)
    : like(beneficiaries.regionCode, `${regionCode}%`);

  const results = await db
    .select({
      id: beneficiaries.id,
      name: beneficiaries.name,
      needs: beneficiaries.needs,
      regionName: beneficiaries.regionName,
      latitude: beneficiaries.latitude,
      longitude: beneficiaries.longitude,
    })
    .from(beneficiaries)
    .where(and(regionCondition, activeVerifiedBeneficiaryFilter()))
    .orderBy(desc(beneficiaries.createdAt));

  // Mask names for privacy
  return results.map((item) => ({
    ...item,
    name: maskName(item.name),
  })) as BeneficiaryListItem[];
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
 * Status default: 'pending' - requires admin approval
 * @throws Error if NIK already exists
 */
export async function createBeneficiary(
  data: CreateBeneficiaryInput,
  verifikatorId: string
): Promise<BeneficiaryItem> {
  // Encrypt NIK and generate hash for uniqueness check
  const encryptedNIK = encrypt(data.nik);
  const nikHash = hashNIK(data.nik);

  // Check NIK uniqueness using hash
  const [existing] = await db
    .select({ id: beneficiaries.id })
    .from(beneficiaries)
    .where(eq(beneficiaries.nikHash, nikHash))
    .limit(1);

  if (existing) {
    throw new Error('NIK sudah terdaftar');
  }

  // Calculate expiresAt (6 months from now - will be set on approval)
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  // Insert new beneficiary with pending status
  const [result] = await db
    .insert(beneficiaries)
    .values({
      nik: encryptedNIK,
      nikHash,
      name: data.name,
      address: data.address,
      needs: data.needs,
      latitude: data.latitude,
      longitude: data.longitude,
      regionCode: data.regionCode,
      regionName: data.regionName ?? null,
      regionPath: data.regionPath ?? null,
      status: 'pending', // Requires admin approval
      createdById: verifikatorId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create audit log (without NIK)
  await createAuditLog({
    userId: verifikatorId,
    action: 'CREATE',
    tableName: 'beneficiaries',
    recordId: result.id,
    newValues: {
      name: data.name,
      status: 'pending',
      address: data.address,
      needs: data.needs,
    },
  });

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

  // Mask names for privacy and decrypt NIK
  return results.map((item) => ({
    ...item,
    name: maskName(item.name),
    nik: decrypt(item.nik),
  })) as BeneficiaryItem[];
}

/**
 * getVerifikatorDashboardStats - Get dashboard statistics for a verifikator
 * Returns counts by status: total, pending, verified, inProgress, completed
 */
export async function getVerifikatorDashboardStats(
  verifikatorId: string
): Promise<{
  total: number;
  pending: number;
  verified: number;
  inProgress: number;
  completed: number;
}> {
  const stats = await db
    .select({
      status: beneficiaries.status,
      count: count(),
    })
    .from(beneficiaries)
    .where(eq(beneficiaries.verifiedById, verifikatorId))
    .groupBy(beneficiaries.status);

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const pending = stats.find((s) => s.status === 'pending')?.count ?? 0;
  const verified = stats.find((s) => s.status === 'verified')?.count ?? 0;
  const inProgress = stats.find((s) => s.status === 'in_progress')?.count ?? 0;
  const completed = stats.find((s) => s.status === 'completed')?.count ?? 0;

  return { total, pending, verified, inProgress, completed };
}

/**
 * getRecentBeneficiariesByVerifikator - Get recent beneficiaries for a verifikator
 */
export async function getRecentBeneficiariesByVerifikator(
  verifikatorId: string,
  limit = 5
): Promise<
  Array<{
    name: string;
    address: string;
    needs: string;
    status: string;
    createdAt: Date;
  }>
> {
  const results = await db
    .select({
      name: beneficiaries.name,
      address: beneficiaries.address,
      needs: beneficiaries.needs,
      status: beneficiaries.status,
      createdAt: beneficiaries.createdAt,
    })
    .from(beneficiaries)
    .where(eq(beneficiaries.verifiedById, verifikatorId))
    .orderBy(desc(beneficiaries.createdAt))
    .limit(limit);

  return results;
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

  // Decrypt NIK before returning
  return {
    ...result,
    nik: decrypt(result.nik),
  } as BeneficiaryItem;
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
/**
 * softDeleteBeneficiary - Soft delete a beneficiary
 * Sets deletedAt and deletedById instead of permanently deleting
 */
export async function softDeleteBeneficiary(
  id: string,
  userId: string
): Promise<{ success: boolean }> {
  const beneficiary = await getBeneficiaryById(id);

  const [deleted] = await db
    .update(beneficiaries)
    .set({
      deletedAt: new Date(),
      deletedById: userId,
      updatedAt: new Date(),
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!deleted) {
    throw new Error('Data penerima manfaat tidak ditemukan');
  }

  // Create audit log
  await createAuditLog({
    userId,
    action: 'SOFT_DELETE',
    tableName: 'beneficiaries',
    recordId: id,
    oldValues: { name: beneficiary.name },
  });

  return { success: true };
}

/**
 * restoreBeneficiary - Restore a soft-deleted beneficiary
 */
export async function restoreBeneficiary(
  id: string,
  adminId: string
): Promise<BeneficiaryItem> {
  const [restored] = await db
    .update(beneficiaries)
    .set({
      deletedAt: null,
      deletedById: null,
      updatedAt: new Date(),
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!restored) {
    throw new Error('Data penerima manfaat tidak ditemukan');
  }

  // Create audit log
  await createAuditLog({
    userId: adminId,
    action: 'RESTORE',
    tableName: 'beneficiaries',
    recordId: id,
    newValues: { name: restored.name },
  });

  return restored as BeneficiaryItem;
}

/**
 * deleteBeneficiary - Hard delete a beneficiary (deprecated, use softDeleteBeneficiary)
 * @deprecated Use softDeleteBeneficiary instead
 */
export async function deleteBeneficiary(id: string): Promise<{ success: boolean }> {
  // Check existence first
  await getBeneficiaryById(id);

  await db.delete(beneficiaries).where(eq(beneficiaries.id, id));

  return { success: true };
}

// ============================================================
// APPROVAL WORKFLOW FUNCTIONS
// ============================================================

/**
 * getPendingBeneficiaries - Get all beneficiaries with pending status
 */
export async function getPendingBeneficiaries(): Promise<BeneficiaryItem[]> {
  const results = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.status, 'pending'))
    .orderBy(desc(beneficiaries.createdAt));

  return results as BeneficiaryItem[];
}

/**
 * approveBeneficiary - Approve a pending beneficiary
 * Sets status to 'verified' and calculates expiresAt
 */
export async function approveBeneficiary(
  id: string,
  adminId: string
): Promise<BeneficiaryItem> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  const [updated] = await db
    .update(beneficiaries)
    .set({
      status: 'verified',
      approvedById: adminId,
      approvedAt: now,
      verifiedById: adminId,
      verifiedAt: now,
      expiresAt,
      updatedAt: now,
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!updated) {
    throw new Error('Data penerima manfaat tidak ditemukan');
  }

  // Create audit log
  await createAuditLog({
    userId: adminId,
    action: 'APPROVE',
    tableName: 'beneficiaries',
    recordId: id,
    oldValues: { status: 'pending' },
    newValues: { status: 'verified', approvedAt: now },
  });

  return updated as BeneficiaryItem;
}

/**
 * rejectBeneficiary - Reject a pending beneficiary
 * Sets status to 'rejected' with reason
 */
export async function rejectBeneficiary(
  id: string,
  adminId: string,
  reason: string
): Promise<BeneficiaryItem> {
  const [updated] = await db
    .update(beneficiaries)
    .set({
      status: 'rejected',
      rejectedById: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!updated) {
    throw new Error('Data penerima manfaat tidak ditemukan');
  }

  // Create audit log
  await createAuditLog({
    userId: adminId,
    action: 'REJECT',
    tableName: 'beneficiaries',
    recordId: id,
    oldValues: { status: 'pending' },
    newValues: { status: 'rejected', reason },
  });

  return updated as BeneficiaryItem;
}

// ============================================================
// CRON: EXPIRED BENEFICIARY MANAGEMENT
// ============================================================

export interface ExpireResult {
  updatedCount: number;
}

/**
 * expireOverdueBeneficiaries - Update beneficiaries yang sudah melewati expiresAt
 * dari status 'verified' menjadi 'expired'.
 *
 * Kondisi: status = 'verified' AND expiresAt IS NOT NULL AND expiresAt < NOW()
 */
export async function expireOverdueBeneficiaries(): Promise<ExpireResult> {
  // First count the records to be updated
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.status, STATUS.BENEFICIARY.VERIFIED),
        isNotNull(beneficiaries.expiresAt),
        lt(beneficiaries.expiresAt, sql`NOW()`)
      )
    );

  // Then perform the update
  await db
    .update(beneficiaries)
    .set({
      status: STATUS.BENEFICIARY.EXPIRED,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(beneficiaries.status, STATUS.BENEFICIARY.VERIFIED),
        isNotNull(beneficiaries.expiresAt),
        lt(beneficiaries.expiresAt, sql`NOW()`)
      )
    );

  return { updatedCount: countResult?.count ?? 0 };
}

export interface ExpiredBeneficiaryStats {
  expiredCount: number;
  expiringSoonCount: number; // expiresAt dalam 7 hari ke depan
  verifiedActiveCount: number;
}

/**
 * getExpiredBeneficiaryStats - Statistik beneficiary expired & yang akan expired
 */
export async function getExpiredBeneficiaryStats(): Promise<ExpiredBeneficiaryStats> {
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Total sudah expired (status = 'expired')
  const [expiredRow] = await db
    .select({ total: count() })
    .from(beneficiaries)
    .where(eq(beneficiaries.status, STATUS.BENEFICIARY.EXPIRED));

  // Total yang akan expired dalam 7 hari (verified, expiresAt not null, expiresAt <= NOW+7d)
  const [expiringSoonRow] = await db
    .select({ total: count() })
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.status, STATUS.BENEFICIARY.VERIFIED),
        isNotNull(beneficiaries.expiresAt),
        lt(beneficiaries.expiresAt, sevenDaysFromNow)
      )
    );

  // Total verified aktif (menggunakan filter yang sama dengan public queries)
  const [activeRow] = await db
    .select({ total: count() })
    .from(beneficiaries)
    .where(activeVerifiedBeneficiaryFilter());

  return {
    expiredCount: expiredRow.total,
    expiringSoonCount: expiringSoonRow.total,
    verifiedActiveCount: activeRow.total,
  };
}

// ============================================================
// BULK IMPORT FUNCTIONS
// ============================================================

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * bulkImportBeneficiaries - Import multiple beneficiaries from parsed CSV
 * Skips duplicates and continues on errors
 */
export async function bulkImportBeneficiaries(
  rows: ParsedBeneficiaryRow[],
  verifikatorId: string
): Promise<BulkImportResult> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; message: string }>,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const encryptedNIK = encrypt(row.nik);
      const nikHash = hashNIK(row.nik);

      // Check duplicate
      const existing = await db
        .select()
        .from(beneficiaries)
        .where(eq(beneficiaries.nikHash, nikHash))
        .limit(1);

      if (existing.length > 0) {
        results.failed++;
        results.errors.push({ row: i + 1, message: 'NIK sudah terdaftar' });
        continue;
      }

      // Insert
      await db.insert(beneficiaries).values({
        id: randomUUID(),
        nik: encryptedNIK,
        nikHash,
        name: row.nama,
        address: row.alamat,
        needs: row.kebutuhan,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        regionCode: row.kodeWilayah,
        regionName: row.namaWilayah || null,
        regionPath: row.jalurWilayah || null,
        status: 'pending',
        createdById: verifikatorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
