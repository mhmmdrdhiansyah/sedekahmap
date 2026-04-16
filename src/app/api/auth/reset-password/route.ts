import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/services/password-reset.service';
import { handleApiError } from '@/lib/http/error-mapper';

/**
 * POST /api/auth/reset-password
 * Reset password dengan token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token dan password baru diperlukan' },
        { status: 400 }
      );
    }

    const result = await resetPassword(token, newPassword);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
