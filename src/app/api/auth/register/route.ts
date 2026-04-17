import { NextRequest, NextResponse } from 'next/server';
import { registerUser, type RegisterInput } from '@/services/user.service';
import { createEmailVerificationToken } from '@/services/email-verification.service';
import { checkRateLimit } from '@/services/rate-limit.service';
import { SECURITY } from '@/lib/constants';
import { handleApiError } from '@/lib/http/error-mapper';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (by IP address)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await checkRateLimit(
      `register:ip:${ip}`,
      SECURITY.RATE_LIMIT.AUTH_REGISTER.limit,
      SECURITY.RATE_LIMIT.AUTH_REGISTER.windowMinutes
    );

    if (!rateLimitResult.allowed) {
      const headers: Record<string, string> = {};
      if (rateLimitResult.retryAfter) {
        headers['Retry-After'] = rateLimitResult.retryAfter.toString();
      }

      return NextResponse.json(
        { error: 'Terlalu banyak percobaan registrasi. Silakan coba lagi nanti.' },
        {
          status: 429,
          headers,
        }
      );
    }

    const body: RegisterInput = await request.json();
    const result = await registerUser(body);

    if (!result.success) {
      const statusCode: Record<string, number> = {
        VALIDATION_FAILED: 400,
        EMAIL_ALREADY_EXISTS: 409,
        ROLE_NOT_FOUND: 500,
        INTERNAL_ERROR: 500,
      };

      const status = statusCode[result.code] ?? 500;
      const responseBody: Record<string, unknown> = { error: result.message };

      if (result.details) {
        responseBody.details = result.details;
      }

      return NextResponse.json(responseBody, { status });
    }

    // Kirim email verifikasi
    await createEmailVerificationToken(
      result.user.id,
      result.user.email,
      result.user.name
    );

    console.info(`[AUTH] Registration successful: ${result.user.email}`);

    return NextResponse.json(
      {
        message: 'Registrasi berhasil. Silakan cek email untuk verifikasi.',
        user: result.user,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
