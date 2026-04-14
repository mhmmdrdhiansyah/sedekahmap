import { eq, and, count, desc, SQL } from 'drizzle-orm';
import { db } from '@/db';
import { distributions } from '@/db/schema/distributions';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { users } from '@/db/schema/users';
import { STATUS } from '@/lib/constants';

// Types
export interface DistributionItem {
  id: string;
  accessRequestId: string;
  donaturId: string;
  beneficiaryId: string;
  distributionCode: string;
  proofPhotoUrl: string | null;
  status: string;
  verifiedById: string | null;
  verifiedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DistributionWithDetails extends DistributionItem {
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

export interface DistributionListOptions {
  status?: 'pending_proof' | 'pending_review' | 'completed' | 'rejected';
  limit?: number;
  offset?: number;
}

export interface DistributionListResult {
  data: DistributionWithDetails[];
  total: number;
}

/**
 * getDistributions - Get all distributions with donatur and beneficiary info
 * @param filters - Filter and pagination options
 * @returns Array of distributions with donatur and beneficiary info + total count
 */
export async function getDistributions(
  filters: DistributionListOptions = {}
): Promise<DistributionListResult> {
  const { status, limit = 20, offset = 0 } = filters;

  // Build where conditions
  const conditions: SQL[] = [];
  if (status) {
    conditions.push(eq(distributions.status, status));
  }
  const whereCondition = conditions.length === 0 ? undefined : and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ total: count() })
    .from(distributions)
    .where(whereCondition);

  const total = countResult?.total ?? 0;

  // Get data with donatur & beneficiary info
  const data = await db
    .select({
      id: distributions.id,
      accessRequestId: distributions.accessRequestId,
      donaturId: distributions.donaturId,
      beneficiaryId: distributions.beneficiaryId,
      distributionCode: distributions.distributionCode,
      proofPhotoUrl: distributions.proofPhotoUrl,
      status: distributions.status,
      verifiedById: distributions.verifiedById,
      verifiedAt: distributions.verifiedAt,
      notes: distributions.notes,
      createdAt: distributions.createdAt,
      updatedAt: distributions.updatedAt,
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
    .from(distributions)
    .innerJoin(users, eq(distributions.donaturId, users.id))
    .innerJoin(beneficiaries, eq(distributions.beneficiaryId, beneficiaries.id))
    .where(whereCondition)
    .orderBy(desc(distributions.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data: data as DistributionWithDetails[],
    total,
  };
}

/**
 * verifyDistribution - Verify and approve/reject a distribution
 * @param id - The distribution ID
 * @param adminId - The admin user ID who is verifying
 * @param approved - Whether the distribution is approved (true) or rejected (false)
 * @param notes - Optional notes for the verification
 * @returns The updated distribution
 * @throws Error if distribution not found, not in pending_review, or proof not uploaded
 */
export async function verifyDistribution(
  id: string,
  adminId: string,
  approved: boolean,
  notes?: string
): Promise<DistributionItem> {
  // 1. Check distribution exists & in pending_review
  const [existing] = await db
    .select()
    .from(distributions)
    .where(eq(distributions.id, id))
    .limit(1);

  if (!existing) {
    throw new Error('Distribusi tidak ditemukan');
  }

  if (existing.status !== STATUS.DISTRIBUTION.PENDING_REVIEW) {
    throw new Error('Distribusi sudah diproses sebelumnya');
  }

  if (!existing.proofPhotoUrl) {
    throw new Error('Bukti foto belum diupload');
  }

  const now = new Date();

  // 2. Update distribution
  const [updatedDistribution] = await db
    .update(distributions)
    .set({
      status: approved ? STATUS.DISTRIBUTION.COMPLETED : STATUS.DISTRIBUTION.REJECTED,
      verifiedById: adminId,
      verifiedAt: now,
      notes: notes || null,
      updatedAt: now,
    })
    .where(eq(distributions.id, id))
    .returning();

  // 3. If approved, update beneficiary status to completed
  if (approved) {
    await db
      .update(beneficiaries)
      .set({
        status: STATUS.BENEFICIARY.COMPLETED,
        updatedAt: now,
      })
      .where(eq(beneficiaries.id, existing.beneficiaryId));
  }

  return updatedDistribution as DistributionItem;
}
