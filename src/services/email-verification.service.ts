/**
 * Email Verification Service
 *
 * Menangani pembuatan dan verifikasi token email verification.
 * Token di-hash sebelum disimpan ke database.
 */

import { db } from '@/db';
import { emailVerificationTokens } from '@/db/schema/emailVerificationTokens';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';
import { generateToken, hashToken, isTokenExpired, getTokenTTL } from '@/lib/utils/security-tokens';
import { SECURITY } from '@/lib/constants';
import { sendVerificationEmail } from './email.service';

export interface CreateVerificationTokenResult {
  success: true;
  token: string; // Raw token untuk dikirim ke email
}

export interface VerifyEmailResult {
  success: true;
  userId: string;
}

export interface EmailVerificationError {
  success: false;
  code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_ALREADY_USED' | 'USER_NOT_FOUND';
  message: string;
}

export type EmailVerificationOutput = CreateVerificationTokenResult | VerifyEmailResult | EmailVerificationError;

/**
 * Buat token verifikasi untuk user dan kirim email
 */
export async function createEmailVerificationToken(
  userId: string,
  userEmail: string,
  userName: string
): Promise<EmailVerificationOutput> {
  try {
    // Cek user ada
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return {
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User tidak ditemukan',
      };
    }

    // Generate token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = getTokenTTL(SECURITY.EMAIL_VERIFY_TOKEN_TTL_HOURS);

    // Simpan token hash ke DB
    await db.insert(emailVerificationTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });

    // Kirim email
    await sendVerificationEmail({
      to: userEmail,
      token: rawToken,
      userName,
    });

    return {
      success: true,
      token: rawToken,
    };
  } catch (error) {
    console.error('[Email Verification Service] Error creating token:', error);
    throw new Error('Gagal membuat token verifikasi');
  }
}

/**
 * Verifikasi token dan tandai email sebagai verified
 */
export async function verifyEmail(rawToken: string): Promise<EmailVerificationOutput> {
  try {
    // Hash token yang diberikan user
    const tokenHash = hashToken(rawToken);

    // Cari token di DB
    const [tokenRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    if (!tokenRecord) {
      return {
        success: false,
        code: 'TOKEN_INVALID',
        message: 'Token verifikasi tidak valid',
      };
    }

    // Cek apakah sudah dipakai
    if (tokenRecord.usedAt) {
      return {
        success: false,
        code: 'TOKEN_ALREADY_USED',
        message: 'Token sudah digunakan',
      };
    }

    // Cek expired
    if (isTokenExpired(tokenRecord.expiresAt)) {
      return {
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Token verifikasi telah kadaluarsa',
      };
    }

    // Tandai token sebagai used dan set emailVerifiedAt
    await db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, tokenRecord.id));

    await db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, tokenRecord.userId));

    console.info(`[EMAIL VERIFICATION] Email verified successfully: userId=${tokenRecord.userId}`);

    return {
      success: true,
      userId: tokenRecord.userId,
    };
  } catch (error) {
    console.error('[Email Verification Service] Error verifying email:', error);
    throw new Error('Gagal verifikasi email');
  }
}
