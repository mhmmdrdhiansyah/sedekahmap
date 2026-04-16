import { eq, and, desc, count } from 'drizzle-orm';

import { db } from '@/db';
import { reviews } from '@/db/schema/reviews';
import { distributions } from '@/db/schema/distributions';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { users } from '@/db/schema/users';
import { STATUS } from '@/lib/constants';

// ============================================================
// TYPES
// ============================================================

export interface ReviewInput {
  distributionId: string;
  rating: number;
  content: string;
}

export interface ReviewItem {
  id: string;
  distributionId: string;
  donaturId: string;
  rating: number;
  content: string;
  createdAt: Date;
}

export interface ReviewWithDistribution extends ReviewItem {
  distribution: {
    id: string;
    distributionCode: string;
    status: string;
  };
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * validateReviewInput - Validate review input
 * @param input - The input to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateReviewInput(input: ReviewInput): string[] {
  const errors: string[] = [];

  // Validate distributionId
  if (!input.distributionId || typeof input.distributionId !== 'string') {
    errors.push('ID distribusi harus diisi');
  }

  // Validate rating (1-5)
  if (!input.rating || typeof input.rating !== 'number') {
    errors.push('Rating harus diisi');
  } else if (input.rating < 1 || input.rating > 5) {
    errors.push('Rating harus antara 1-5');
  }

  // Validate content (min 10 chars)
  if (!input.content || typeof input.content !== 'string') {
    errors.push('Ulasan harus diisi');
  } else if (input.content.trim().length < 10) {
    errors.push('Ulasan minimal 10 karakter');
  } else if (input.content.length > 1000) {
    errors.push('Ulasan maksimal 1000 karakter');
  }

  return errors;
}

// ============================================================
// SERVICE FUNCTIONS
// ============================================================

/**
 * createReview - Create a new review for a distribution
 * @param donaturId - The donatur's user ID
 * @param input - The review input data
 * @returns The created review
 * @throws Error if validation fails, distribution not found, not completed, or already reviewed
 */
export async function createReview(
  donaturId: string,
  input: ReviewInput
): Promise<ReviewItem> {
  // Validate input
  const validationErrors = validateReviewInput(input);
  if (validationErrors.length > 0) {
    const messages = validationErrors.join(', ');
    throw new Error(messages);
  }

  // 1. Check distribution exists & belongs to donatur & is completed
  const [distribution] = await db
    .select({
      id: distributions.id,
      donaturId: distributions.donaturId,
      status: distributions.status,
    })
    .from(distributions)
    .where(eq(distributions.id, input.distributionId))
    .limit(1);

  if (!distribution) {
    throw new Error('Distribusi tidak ditemukan');
  }

  if (distribution.donaturId !== donaturId) {
    throw new Error('Distribusi tidak ditemukan');
  }

  if (distribution.status !== STATUS.DISTRIBUTION.COMPLETED) {
    throw new Error('Hanya distribusi yang sudah selesai yang dapat diulas');
  }

  // 2. Check for existing review (prevent double review)
  const [existingReview] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.distributionId, input.distributionId),
        eq(reviews.donaturId, donaturId)
      )
    )
    .limit(1);

  if (existingReview) {
    throw new Error('Anda sudah memberikan ulasan untuk distribusi ini');
  }

  // 3. Create review
  const [created] = await db
    .insert(reviews)
    .values({
      distributionId: input.distributionId,
      donaturId,
      rating: input.rating,
      content: input.content.trim(),
    })
    .returning();

  return created as ReviewItem;
}

/**
 * getReviewByDistributionId - Get review by distribution ID and donatur ID
 * @param distributionId - The distribution ID
 * @param donaturId - The donatur's user ID (for ownership check)
 * @returns The review if exists, null otherwise
 */
export async function getReviewByDistributionId(
  distributionId: string,
  donaturId: string
): Promise<ReviewItem | null> {
  const [review] = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.distributionId, distributionId),
        eq(reviews.donaturId, donaturId)
      )
    )
    .limit(1);

  return (review as ReviewItem) ?? null;
}

/**
 * getReviewsByDonaturId - Get all reviews by a donatur with pagination
 * @param donaturId - The donatur's user ID
 * @param options - Pagination options
 * @returns Array of reviews with distribution info + total count
 */
export async function getReviewsByDonaturId(
  donaturId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ data: ReviewWithDistribution[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  // Get total count
  const [countResult] = await db
    .select({ total: count() })
    .from(reviews)
    .where(eq(reviews.donaturId, donaturId));

  const total = countResult?.total ?? 0;

  // Get data with distribution info
  const data = await db
    .select({
      id: reviews.id,
      distributionId: reviews.distributionId,
      donaturId: reviews.donaturId,
      rating: reviews.rating,
      content: reviews.content,
      createdAt: reviews.createdAt,
      distribution: {
        id: distributions.id,
        distributionCode: distributions.distributionCode,
        status: distributions.status,
      },
    })
    .from(reviews)
    .innerJoin(distributions, eq(reviews.distributionId, distributions.id))
    .where(eq(reviews.donaturId, donaturId))
    .limit(limit)
    .offset(offset);

  return {
    data: data as ReviewWithDistribution[],
    total,
  };
}

// ============================================================
// PUBLIC REVIEWS
// ============================================================

export interface PublicReviewItem {
  id: string;
  donaturName: string;
  rating: number;
  content: string;
  area: string;
  createdAt: Date;
}

/**
 * getPublicReviews - Get latest reviews for public display
 * Only includes reviews from completed distributions.
 * Does NOT expose target name, NIK, or address.
 */
export async function getPublicReviews(
  limit: number = 6
): Promise<PublicReviewItem[]> {
  const rows = await db
    .select({
      id: reviews.id,
      donaturName: users.name,
      rating: reviews.rating,
      content: reviews.content,
      area: beneficiaries.regionPath,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(distributions, eq(reviews.distributionId, distributions.id))
    .innerJoin(beneficiaries, eq(distributions.beneficiaryId, beneficiaries.id))
    .innerJoin(users, eq(reviews.donaturId, users.id))
    .where(eq(distributions.status, STATUS.DISTRIBUTION.COMPLETED))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  return rows as PublicReviewItem[];
}
