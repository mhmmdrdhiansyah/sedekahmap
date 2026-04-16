/**
 * Rate Limit Service
 *
 * Rate limiting dengan DB-based sliding window.
 * Untuk endpoint auth seperti login dan register.
 */

import { db } from '@/db';
import { authRateLimits } from '@/db/schema/authRateLimits';
import { eq, sql } from 'drizzle-orm';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds until retry is allowed
}

/**
 * Cek rate limit untuk key tertentu
 *
 * @param key - Unique identifier (e.g., "login:email:xxx", "register:ip:xxx")
 * @param limit - Maximum requests allowed
 * @param windowMinutes - Time window in minutes
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    // Cari existing record
    const [existing] = await db
      .select()
      .from(authRateLimits)
      .where(eq(authRateLimits.key, key))
      .limit(1);

    if (!existing) {
      // Belum ada record, buat baru
      await db.insert(authRateLimits).values({
        key,
        requestCount: 1,
        windowStart: now,
      });

      return { allowed: true };
    }

    // Cek apakah window sudah expired
    if (existing.windowStart < windowStart) {
      // Window expired, reset counter
      await db
        .update(authRateLimits)
        .set({
          requestCount: 1,
          windowStart: now,
          updatedAt: now,
        })
        .where(eq(authRateLimits.key, key));

      return { allowed: true };
    }

    // Dalam window yang sama, cek counter
    if (existing.requestCount >= limit) {
      // Hitung sisa waktu
      const windowEnd = new Date(existing.windowStart.getTime() + windowMinutes * 60 * 1000);
      const retryAfterSeconds = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000));

      console.info(`[RATE LIMIT] Blocked: key=${key}, count=${existing.requestCount}/${limit}`);

      return {
        allowed: false,
        retryAfter: retryAfterSeconds,
      };
    }

    // Increment counter
    await db
      .update(authRateLimits)
      .set({
        requestCount: existing.requestCount + 1,
        updatedAt: now,
      })
      .where(eq(authRateLimits.key, key));

    return { allowed: true };
  } catch (error) {
    console.error('[Rate Limit Service] Error:', error);
    // Pada error, allow request (fail-open)
    return { allowed: true };
  }
}

/**
 * Cleanup rate limit records yang expired
 * Bisa dijalankan secara periodik (cron job)
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    // Hapus record yang windowStart-nya lebih dari 24 jam yang lalu
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const deleted = await db
      .delete(authRateLimits)
      .where(sql`${authRateLimits.windowStart} < ${cutoff}`);

    console.log(`[RATE LIMIT] Cleaned up expired records`);
  } catch (error) {
    console.error('[Rate Limit Service] Cleanup error:', error);
  }
}
