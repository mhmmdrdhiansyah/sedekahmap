/**
 * Password Reset Service
 *
 * Menangani flow lupa password: request reset dan reset password.
 * Token di-hash sebelum disimpan ke database.
 */

import { db } from '@/db';
import { passwordResetTokens } from '@/db/schema/passwordResetTokens';
import { users } from '@/db/schema/users';
import { eq, and } from 'drizzle-orm';
import { generateToken, hashToken, isTokenExpired, getTokenTTLMinutes } from '@/lib/utils/security-tokens';
import { SECURITY } from '@/lib/constants';
import { sendPasswordResetEmail } from './email.service';
import bcrypt from 'bcrypt';

export interface RequestPasswordResetResult {
  success: true;
  // Selalu return success (anti-enumeration)
}

export interface ResetPasswordResult {
  success: true;
  userId: string;
}

export interface PasswordResetError {
  success: false;
  code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_ALREADY_USED' | 'WEAK_PASSWORD';
  message: string;
}

export type PasswordResetOutput = RequestPasswordResetResult | ResetPasswordResult | PasswordResetError;

/**
 * Request password reset
 * Selalu return success meskipun email tidak terdaftar (anti-enumeration)
 */
export async function requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
  try {
    // Cari user berdasarkan email
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.email, email), eq(users.isActive, true)))
      .limit(1);

    // Jika user tidak ada atau tidak aktif, tetap return success
    // Ini mencegah user enumeration
    if (!user) {
      console.log(`[Password Reset] Email not found or inactive: ${email}`);
      return { success: true };
    }

    // Generate token
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = getTokenTTLMinutes(SECURITY.PASSWORD_RESET_TOKEN_TTL_MINUTES);

    // Simpan token hash ke DB
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Kirim email
    await sendPasswordResetEmail({
      to: user.email,
      token: rawToken,
      userName: user.name,
    });

    console.info(`[PASSWORD RESET] Password reset requested: ${user.email}`);

    return { success: true };
  } catch (error) {
    console.error('[Password Reset Service] Error requesting reset:', error);
    // Tetap return success untuk anti-enumeration
    return { success: true };
  }
}

/**
 * Reset password dengan token
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string
): Promise<ResetPasswordResult | PasswordResetError> {
  try {
    // Validasi password
    if (!newPassword || newPassword.length < SECURITY.PASSWORD_MIN_LENGTH) {
      return {
        success: false,
        code: 'WEAK_PASSWORD',
        message: `Password harus minimal ${SECURITY.PASSWORD_MIN_LENGTH} karakter`,
      };
    }

    // Hash token untuk lookup
    const tokenHash = hashToken(rawToken);

    // Cari token di DB
    const [tokenRecord] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        tokenHash: passwordResetTokens.tokenHash,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!tokenRecord) {
      return {
        success: false,
        code: 'TOKEN_INVALID',
        message: 'Token reset tidak valid',
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
        message: 'Token reset telah kadaluarsa',
      };
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, SECURITY.BCRYPT_SALT_ROUNDS);

    // Update password user dan tandai token sebagai used
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, tokenRecord.userId));

      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, tokenRecord.id));
    });

    console.info(`[PASSWORD RESET] Password reset successful: userId=${tokenRecord.userId}`);

    return {
      success: true,
      userId: tokenRecord.userId,
    };
  } catch (error) {
    console.error('[Password Reset Service] Error resetting password:', error);
    throw new Error('Gagal reset password');
  }
}
