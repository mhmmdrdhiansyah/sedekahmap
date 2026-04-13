import { eq, and, desc, count, sql } from 'drizzle-orm';

import { db } from '@/db';
import { distributions } from '@/db/schema/distributions';
import { accessRequests } from '@/db/schema/accessRequests';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { STATUS } from '@/lib/constants';

// ============================================================
// TYPES
// ============================================================
export interface DonaturStatistics {
  totalDonation: number;
  activeDonations: number;
  beneficiariesHelped: number;
  completedDonations: number;
}

export interface DonaturRecentRequest {
  id: string;
  beneficiaryName: string;
  needs: string;
  status: string;
  createdAt: Date;
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * getDonaturStatistics - Get statistics for a donatur
 * @param userId - The donatur's user ID
 * @returns Statistics object with donation counts
 */
export async function getDonaturStatistics(
  userId: string
): Promise<DonaturStatistics> {
  // Get all statistics in a single query using conditional counts
  const [statsResult] = await db
    .select({
      totalDonation: count(),
      activeDonations: count(
        sql`CASE WHEN ${distributions.status} = 'pending_proof' OR ${distributions.status} = 'pending_review' THEN 1 END`
      ),
      completedDonations: count(
        sql`CASE WHEN ${distributions.status} = 'completed' THEN 1 END`
      ),
    })
    .from(distributions)
    .where(eq(distributions.donaturId, userId));

  // Get distinct beneficiaries helped from completed distributions
  const [beneficiariesResult] = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${distributions.beneficiaryId})`,
    })
    .from(distributions)
    .where(
      and(
        eq(distributions.donaturId, userId),
        eq(distributions.status, STATUS.DISTRIBUTION.COMPLETED)
      )
    );

  return {
    totalDonation: statsResult?.totalDonation ?? 0,
    activeDonations: statsResult?.activeDonations ?? 0,
    beneficiariesHelped: beneficiariesResult?.count ?? 0,
    completedDonations: statsResult?.completedDonations ?? 0,
  };
}

/**
 * getDonaturRecentRequests - Get recent access requests for a donatur
 * @param userId - The donatur's user ID
 * @param limit - Maximum number of requests to return (default: 10)
 * @returns Array of recent requests with beneficiary information
 */
export async function getDonaturRecentRequests(
  userId: string,
  limit: number = 10
): Promise<DonaturRecentRequest[]> {
  const results = await db
    .select({
      id: accessRequests.id,
      beneficiaryName: beneficiaries.name,
      needs: beneficiaries.needs,
      status: accessRequests.status,
      createdAt: accessRequests.createdAt,
    })
    .from(accessRequests)
    .innerJoin(beneficiaries, eq(accessRequests.beneficiaryId, beneficiaries.id))
    .where(eq(accessRequests.donaturId, userId))
    .orderBy(desc(accessRequests.createdAt))
    .limit(limit);

  return results;
}
