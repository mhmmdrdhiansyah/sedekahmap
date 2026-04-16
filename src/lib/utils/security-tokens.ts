/**
 * Security Token Utilities
 *
 * Provides secure token generation and hashing for:
 * - Email verification tokens
 * - Password reset tokens
 * - Other one-time authentication tokens
 *
 * Security Notes:
 * - Uses crypto.randomBytes() for CSPRNG (not Math.random)
 * - Tokens are hashed before database storage (SHA-256)
 * - Raw tokens never touch the database
 * - Token comparison uses timing-safe comparison (hash compare)
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure random token.
 * Default 32 bytes = 64 hex characters (sufficient for security).
 *
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded random token
 *
 * @example
 * const token = generateToken(); // "a1b2c3d4..."
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for secure storage in the database.
 * Raw tokens are NEVER stored; only the SHA-256 hash is saved.
 * This prevents token leakage even if the database is compromised.
 *
 * @param token - The raw token to hash
 * @returns Hex-encoded SHA-256 hash
 *
 * @example
 * const rawToken = generateToken();
 * const hash = hashToken(rawToken); // store hash in DB
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawToken - The token provided by the user
 * @param storedHash - The hash stored in the database
 * @returns true if token matches the hash
 *
 * @example
 * const isValid = verifyToken(userToken, dbTokenHash);
 */
export function verifyToken(rawToken: string, storedHash: string): boolean {
  const tokenHash = hashToken(rawToken);
  // Timing-safe comparison
  return timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

/**
 * Check if a token has expired.
 *
 * @param expiresAt - The expiration timestamp
 * @returns true if token is expired
 *
 * @example
 * if (isTokenExpired(token.expiresAt)) {
 *   return { error: 'Token expired' };
 * }
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Calculate the TTL (Time To Live) timestamp for a token.
 *
 * @param hours - Hours until expiration
 * @returns Expiration timestamp
 *
 * @example
 * const expiresAt = getTokenTTL(24); // 24 hours from now
 */
export function getTokenTTL(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Calculate the TTL (Time To Live) timestamp in minutes.
 *
 * @param minutes - Minutes until expiration
 * @returns Expiration timestamp
 *
 * @example
 * const expiresAt = getTokenTTLMinutes(30); // 30 minutes from now
 */
export function getTokenTTLMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
