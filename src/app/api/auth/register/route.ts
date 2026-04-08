import { NextRequest, NextResponse } from 'next/server';
import { registerUser, type RegisterInput } from '@/services/user.service';

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json(
      { message: 'Registrasi berhasil', user: result.user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
