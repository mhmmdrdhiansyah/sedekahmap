import { eq, and, count, desc, SQL, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { accessRequests } from '@/db/schema/accessRequests';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { users } from '@/db/schema/users';
import { distributions } from '@/db/schema/distributions';
import { STATUS } from '@/lib/constants';
import { generateDistributionCode } from '@/lib/utils/generate-code';

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
// ADMIN TYPES
// ============================================================

export interface AdminAccessRequestFilters {
  status?: 'pending' | 'approved' | 'rejected';
  limit?: number;
  offset?: number;
}

export interface AdminAccessRequestWithDonatur extends AccessRequestItem {
  donatur: {
    id: string;
    name: string;
    email: string;
  };
  beneficiary: {
    id: string;
    name: string;
    needs: string;
    regionName: string | null;
  };
}

export interface ApproveResult {
  accessRequest: AccessRequestItem;
  distribution: {
    id: string;
    distributionCode: string;
  };
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

  // Check for duplicate pending or approved request
  const [existing] = await db
    .select({ id: accessRequests.id, status: accessRequests.status })
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.donaturId, donaturId),
        eq(accessRequests.beneficiaryId, beneficiaryId),
        inArray(accessRequests.status, [STATUS.ACCESS_REQUEST.PENDING, STATUS.ACCESS_REQUEST.APPROVED])
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === STATUS.ACCESS_REQUEST.APPROVED) {
      throw new Error('Anda sudah memiliki akses yang disetujui untuk penerima ini');
    }
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

// ============================================================
// ADMIN SERVICE FUNCTIONS
// ============================================================

/**
 * getAllAccessRequests - Get all access requests with donatur and beneficiary info
 * @param filters - Filter and pagination options
 * @returns Array of access requests with donatur and beneficiary info + total count
 */
export async function getAllAccessRequests(
  filters: AdminAccessRequestFilters = {}
): Promise<{ data: AdminAccessRequestWithDonatur[]; total: number }> {
  const { status, limit = 20, offset = 0 } = filters;

  // Build where conditions
  const conditions: SQL[] = [];
  if (status) {
    conditions.push(eq(accessRequests.status, status));
  }
  const whereCondition = conditions.length === 0 ? undefined : and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ total: count() })
    .from(accessRequests)
    .where(whereCondition);

  const total = countResult?.total ?? 0;

  // Get data with donatur & beneficiary info
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
      donatur: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      beneficiary: {
        id: beneficiaries.id,
        name: beneficiaries.name,
        needs: beneficiaries.needs,
        regionName: beneficiaries.regionName,
      },
    })
    .from(accessRequests)
    .innerJoin(users, eq(accessRequests.donaturId, users.id))
    .innerJoin(beneficiaries, eq(accessRequests.beneficiaryId, beneficiaries.id))
    .where(whereCondition)
    .orderBy(desc(accessRequests.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data: data as AdminAccessRequestWithDonatur[],
    total,
  };
}

/**
 * approveAccessRequest - Approve an access request and create distribution record
 * @param id - The access request ID
 * @param adminId - The admin user ID who is approving
 * @returns The updated access request and created distribution
 * @throws Error if request not found, not pending, or already processed
 */
export async function approveAccessRequest(
  id: string,
  adminId: string
): Promise<ApproveResult> {
  // 1. Check request exists & pending
  const [existing] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Permintaan akses tidak ditemukan');
  }

  if (existing.status !== STATUS.ACCESS_REQUEST.PENDING) {
    throw new Error('Permintaan akses sudah diproses sebelumnya');
  }

  // 2. Generate distribution code
  const distributionCode = generateDistributionCode();

  // 3-4. Update request & create distribution
  const [updatedRequest] = await db
    .update(accessRequests)
    .set({
      status: STATUS.ACCESS_REQUEST.APPROVED,
      distributionCode,
      reviewedById: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(accessRequests.id, id))
    .returning();

  const [distribution] = await db
    .insert(distributions)
    .values({
      accessRequestId: updatedRequest.id,
      donaturId: updatedRequest.donaturId,
      beneficiaryId: updatedRequest.beneficiaryId,
      distributionCode,
      status: STATUS.DISTRIBUTION.PENDING_PROOF,
    })
    .returning();

  return {
    accessRequest: updatedRequest as AccessRequestItem,
    distribution: {
      id: distribution.id,
      distributionCode: distribution.distributionCode,
    },
  };
}

/**
 * rejectAccessRequest - Reject an access request
 * @param id - The access request ID
 * @param adminId - The admin user ID who is rejecting
 * @param reason - Optional reason for rejection
 * @returns The updated access request
 * @throws Error if request not found, not pending, or already processed
 */
export async function rejectAccessRequest(
  id: string,
  adminId: string,
  reason?: string
): Promise<AccessRequestItem> {
  // Check request exists
  const [existing] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Permintaan akses tidak ditemukan');
  }

  if (existing.status !== STATUS.ACCESS_REQUEST.PENDING) {
    throw new Error('Permintaan akses sudah diproses sebelumnya');
  }

  // Update request
  const [updated] = await db
    .update(accessRequests)
    .set({
      status: STATUS.ACCESS_REQUEST.REJECTED,
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason || null,
      updatedAt: new Date(),
    })
    .where(eq(accessRequests.id, id))
    .returning();

  return updated as AccessRequestItem;
}

// ============================================================
// DONATUR SERVICE FUNCTIONS - DELETE
// ============================================================

/**
 * deleteAccessRequest - Delete a pending access request
 * @param id - The access request ID
 * @param donaturId - The donatur's user ID (for ownership check)
 * @throws Error if request not found, not owned by donatur, or already processed
 */
export async function deleteAccessRequest(
  id: string,
  donaturId: string
): Promise<void> {
  // 1. Check request exists & belongs to donatur
  const [existing] = await db
    .select({ status: accessRequests.status })
    .from(accessRequests)
    .where(eq(accessRequests.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Permintaan akses tidak ditemukan');
  }

  // 2. Verify ownership by checking if donatur has access to this request
  const [ownerCheck] = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(and(eq(accessRequests.id, id), eq(accessRequests.donaturId, donaturId)))
    .limit(1);

  if (!ownerCheck) {
    throw new Error('Permintaan akses tidak ditemukan');
  }

  // 3. Check if request is still pending (can only delete pending requests)
  if (existing.status !== STATUS.ACCESS_REQUEST.PENDING) {
    throw new Error('Hanya permintaan yang masih menunggu yang dapat dihapus');
  }

  // 4. Delete the access request
  await db.delete(accessRequests).where(eq(accessRequests.id, id));
}
