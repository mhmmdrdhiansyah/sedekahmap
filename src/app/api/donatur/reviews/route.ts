import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { createReview, getReviewByDistributionId } from '@/services/review.service';

// ============================================================
// POST /api/donatur/reviews
// Create a new review for a distribution
// ============================================================

interface CreateReviewBody {
  distributionId: string;
  rating: number;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.REVIEW_CREATE);

    // Parse request body
    const body = (await request.json()) as CreateReviewBody;

    // Validate required fields
    if (!body.distributionId) {
      return NextResponse.json(
        { error: 'ID distribusi harus diisi' },
        { status: 400 }
      );
    }

    if (!body.rating || typeof body.rating !== 'number') {
      return NextResponse.json(
        { error: 'Rating harus diisi' },
        { status: 400 }
      );
    }

    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Ulasan harus diisi' },
        { status: 400 }
      );
    }

    // Create review
    const review = await createReview(user.id, {
      distributionId: body.distributionId,
      rating: body.rating,
      content: body.content,
    });

    return NextResponse.json(
      {
        data: {
          id: review.id,
          distributionId: review.distributionId,
          rating: review.rating,
          content: review.content,
          createdAt: review.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create review error:', error);

    if (error instanceof Error) {
      // Auth errors
      if (error.message.startsWith('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Anda harus login terlebih dahulu' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('FORBIDDEN')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses' },
          { status: 403 }
        );
      }

      // Business logic errors
      if (
        error.message.includes('tidak ditemukan') ||
        error.message.includes('minimal') ||
        error.message.includes('maksimal') ||
        error.message.includes('antara')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // Duplicate review
      if (error.message.includes('sudah memberikan ulasan')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal membuat ulasan' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET /api/donatur/reviews?distributionId=xxx
// Get review by distribution ID for the authenticated donatur
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Auth & permission check
    const user = await requirePermission(PERMISSIONS.REVIEW_READ);

    // Get distributionId from query params
    const { searchParams } = new URL(request.url);
    const distributionId = searchParams.get('distributionId');

    if (!distributionId) {
      return NextResponse.json(
        { error: 'ID distribusi harus diisi' },
        { status: 400 }
      );
    }

    // Get review
    const review = await getReviewByDistributionId(distributionId, user.id);

    if (!review) {
      return NextResponse.json(
        { data: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: review.id,
          distributionId: review.distributionId,
          rating: review.rating,
          content: review.content,
          createdAt: review.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get review error:', error);

    if (error instanceof Error) {
      // Auth errors
      if (error.message.startsWith('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Anda harus login terlebih dahulu' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('FORBIDDEN')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal memuat ulasan' },
      { status: 500 }
    );
  }
}
