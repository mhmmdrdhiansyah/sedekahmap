import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/services/email-verification.service';
import { handleApiError } from '@/lib/http/error-mapper';

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify email via link from email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token tidak ditemukan' },
        { status: 400 }
      );
    }

    const result = await verifyEmail(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Redirect ke login dengan success message
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('verified', 'true');
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/auth/verify-email
 * Verify email via API call
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token diperlukan' },
        { status: 400 }
      );
    }

    const result = await verifyEmail(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email berhasil diverifikasi',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
