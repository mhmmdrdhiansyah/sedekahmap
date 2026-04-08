import { beneficiaries } from '@/db/schema/beneficiaries';
import { eq, and, or, isNull, gt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/**
 * Filter condition untuk beneficiary yang aktif dan verified.
 * - status = 'verified'
 * - DAN (expiresAt IS NULL ATAU expiresAt > NOW())
 */
export function activeVerifiedBeneficiaryFilter(): SQL {
  return and(
    eq(beneficiaries.status, 'verified'),
    or(
      isNull(beneficiaries.expiresAt),
      gt(beneficiaries.expiresAt, sql`NOW()`)
    )
  )!;
}
