import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/services/password-reset.service';
import { handleApiError } from '@/lib/http/error-mapper';

/**
 * POST /api/auth/forgot-password
 * Request password reset (anti-enumeration: selalu return success)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email diperlukan' },
        { status: 400 }
      );
    }

    // Selalu return success, meskipun email tidak terdaftar (anti-enumeration)
    await requestPasswordReset(email);

    return NextResponse.json({
      message: 'Jika email terdaftar, link reset password telah dikirim ke email Anda.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
