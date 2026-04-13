import { eq, and, count, desc, SQL } from 'drizzle-orm';

import { db } from '@/db';
import { accessRequests } from '@/db/schema/accessRequests';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { STATUS } from '@/lib/constants';

// ============================================================
// TYPES
// ============================================================

export interface AccessRequestInput {
  beneficiaryId: string;
  intention: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AccessRequestItem {
  id: string;
  donaturId: string;
  beneficiaryId: string;
  intention: string;
  status: string;
  distributionCode: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessRequestWithBeneficiary extends AccessRequestItem {
  beneficiary: {
    id: string;
    name: string;
    needs: string;
    regionName: string | null;
  };
}

export interface AccessRequestListOptions {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface AccessRequestListResult {
  data: AccessRequestWithBeneficiary[];
  total: number;
}

export interface BeneficiaryForRequest {
  id: string;
  name: string;
  regionName: string | null;
  needs: string;
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * validateAccessRequest - Validate access request input
 * @param input - The input to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateAccessRequest(input: AccessRequestInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate beneficiaryId (UUID format - basic check)
  if (!input.beneficiaryId || typeof input.beneficiaryId !== 'string') {
    errors.push({ field: 'beneficiaryId', message: 'ID penerima manfaat harus diisi' });
  }

  // Validate intention (min 10, max 500 characters)
  if (!input.intention || typeof input.intention !== 'string') {
    errors.push({ field: 'intention', message: 'Niat sedekah harus diisi' });
  } else if (input.intention.trim().length < 10) {
    errors.push({ field: 'intention', message: 'Niat sedekah minimal 10 karakter' });
  } else if (input.intention.length > 500) {
    errors.push({ field: 'intention', message: 'Niat sedekah maksimal 500 karakter' });
  }

  return errors;
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * createAccessRequest - Create a new access request
 * @param donaturId - The donatur's user ID
 * @param beneficiaryId - The beneficiary ID to request access for
 * @param intention - The donatur's intention for helping
 * @returns The created access request
 * @throws Error if validation fails, beneficiary not found, or duplicate request exists
 */
export async function createAccessRequest(
  donaturId: string,
  beneficiaryId: string,
  intention: string
): Promise<AccessRequestItem> {
  const input = { beneficiaryId, intention };

  // Validate input
  const validationErrors = validateAccessRequest(input);
  if (validationErrors.length > 0) {
    const messages = validationErrors.map((e) => e.message).join(', ');
    throw new Error(messages);
  }

  // Check if beneficiary exists
  const [beneficiary] = await db
    .select({ id: beneficiaries.id })
    .from(beneficiaries)
    .where(eq(beneficiaries.id, beneficiaryId))
    .limit(1);

  if (!beneficiary) {
    throw new Error('Penerima manfaat tidak ditemukan');
  }

  // Check for duplicate pending request
  const [existing] = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.donaturId, donaturId),
        eq(accessRequests.beneficiaryId, beneficiaryId),
        eq(accessRequests.status, STATUS.ACCESS_REQUEST.PENDING)
      )
    )
    .limit(1);

  if (existing) {
    throw new Error('Anda sudah memiliki permintaan akses yang sedang diproses untuk penerima ini');
  }

  // Create access request
  const [created] = await db
    .insert(accessRequests)
    .values({
      donaturId,
      beneficiaryId,
      intention: intention.trim(),
      status: STATUS.ACCESS_REQUEST.PENDING,
    })
    .returning();

  return created as AccessRequestItem;
}

/**
 * getAccessRequestsByDonatur - Get access requests for a donatur with pagination
 * @param donaturId - The donatur's user ID
 * @param options - Filter and pagination options
 * @returns Array of access requests with beneficiary info and total count
 */
export async function getAccessRequestsByDonatur(
  donaturId: string,
  options: AccessRequestListOptions = {}
): Promise<AccessRequestListResult> {
  const { status, limit = 20, offset = 0 } = options;

  // Build where conditions
  const conditions: SQL[] = [eq(accessRequests.donaturId, donaturId)];
  if (status) {
    conditions.push(eq(accessRequests.status, status as 'pending' | 'approved' | 'rejected'));
  }
  const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ total: count() })
    .from(accessRequests)
    .where(whereCondition);

  const total = countResult?.total ?? 0;

  // Get data with beneficiary info
  const data = await db
    .select({
      id: accessRequests.id,
      donaturId: accessRequests.donaturId,
      beneficiaryId: accessRequests.beneficiaryId,
      intention: accessRequests.intention,
      status: accessRequests.status,
      distributionCode: accessRequests.distributionCode,
      reviewedById: accessRequests.reviewedById,
      reviewedAt: accessRequests.reviewedAt,
      rejectionReason: accessRequests.rejectionReason,
      createdAt: accessRequests.createdAt,
      updatedAt: accessRequests.updatedAt,
      beneficiary: {
        id: beneficiaries.id,
        name: beneficiaries.name,
        needs: beneficiaries.needs,
        regionName: beneficiaries.regionName,
      },
    })
    .from(accessRequests)
    .innerJoin(beneficiaries, eq(accessRequests.beneficiaryId, beneficiaries.id))
    .where(whereCondition)
    .orderBy(desc(accessRequests.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data: data as AccessRequestWithBeneficiary[],
    total,
  };
}

/**
 * getAccessRequestDetail - Get detail of a specific access request
 * @param id - The access request ID
 * @param donaturId - The donatur's user ID (for ownership check)
 * @returns The access request with full beneficiary info
 * @throws Error if request not found or doesn't belong to the donatur
 */
export async function getAccessRequestDetail(
  id: string,
  donaturId: string
): Promise<AccessRequestWithBeneficiary> {
  const [result] = await db
    .select({
      id: accessRequests.id,
      donaturId: accessRequests.donaturId,
      beneficiaryId: accessRequests.beneficiaryId,
      intention: accessRequests.intention,
      status: accessRequests.status,
      distributionCode: accessRequests.distributionCode,
      reviewedById: accessRequests.reviewedById,
      reviewedAt: accessRequests.reviewedAt,
      rejectionReason: accessRequests.rejectionReason,
      createdAt: accessRequests.createdAt,
      updatedAt: accessRequests.updatedAt,
      beneficiary: {
        id: beneficiaries.id,
        name: beneficiaries.name,
        needs: beneficiaries.needs,
        regionName: beneficiaries.regionName,
        address: beneficiaries.address,
        latitude: beneficiaries.latitude,
        longitude: beneficiaries.longitude,
        regionCode: beneficiaries.regionCode,
      },
    })
    .from(accessRequests)
    .innerJoin(beneficiaries, eq(accessRequests.beneficiaryId, beneficiaries.id))
    .where(and(eq(accessRequests.id, id), eq(accessRequests.donaturId, donaturId)))
    .limit(1);

  if (!result) {
    throw new Error('Permintaan akses tidak ditemukan');
  }

  return result as AccessRequestWithBeneficiary;
}
