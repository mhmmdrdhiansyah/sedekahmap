import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEmailVerificationToken,
  verifyEmail,
} from '../email-verification.service';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { emailVerificationTokens } from '@/db/schema/emailVerificationTokens';
import { eq } from 'drizzle-orm';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock email service
vi.mock('../email.service', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock security tokens
vi.mock('@/lib/utils/security-tokens', () => ({
  generateToken: vi.fn(() => 'mock-token-456'),
  hashToken: vi.fn((token: string) => `hashed-${token}`),
  isTokenExpired: vi.fn(() => false),
  getTokenTTL: vi.fn((hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000)),
}));

describe('email-verification.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // createEmailVerificationToken
  // ============================================================

  describe('createEmailVerificationToken', () => {
    it('creates token and sends email for existing user', async () => {
      const mockUserQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
      };

      const mockInsertQuery = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockUserQuery);
      (db as any).insert.mockReturnValue(mockInsertQuery);

      const result = await createEmailVerificationToken(
        'user-1',
        'test@example.com',
        'Test User'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.token).toBe('mock-token-456');
      }
      expect(mockInsertQuery.values).toHaveBeenCalled();
    });

    it('returns error for non-existent user', async () => {
      const mockUserQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db as any).select.mockReturnValue(mockUserQuery);

      const result = await createEmailVerificationToken(
        'nonexistent-user',
        'test@example.com',
        'Test User'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('USER_NOT_FOUND');
      }
    });
  });

  // ============================================================
  // verifyEmail
  // ============================================================

  describe('verifyEmail', () => {
    it('returns error for invalid token', async () => {
      const mockTokenQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db as any).select.mockReturnValue(mockTokenQuery);

      const result = await verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('TOKEN_INVALID');
      }
    });

    it('returns error for already used token', async () => {
      const mockTokenQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'token-1',
            userId: 'user-1',
            usedAt: new Date(),
          },
        ]),
      };

      (db as any).select.mockReturnValue(mockTokenQuery);

      const result = await verifyEmail('used-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('TOKEN_ALREADY_USED');
      }
    });

    it('returns error for expired token', async () => {
      const { isTokenExpired } = await import('@/lib/utils/security-tokens');
      (isTokenExpired as any).mockReturnValueOnce(true);

      const mockTokenQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'token-1',
            userId: 'user-1',
            usedAt: null,
            expiresAt: new Date(Date.now() - 1000),
          },
        ]),
      };

      (db as any).select.mockReturnValue(mockTokenQuery);

      const result = await verifyEmail('expired-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('TOKEN_EXPIRED');
      }
    });

    it('successfully verifies email and marks user as verified', async () => {
      const mockTokenQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'token-1',
            userId: 'user-1',
            usedAt: null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        ]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockTokenQuery);
      (db as any).update.mockReturnValue(mockUpdateQuery);

      const result = await verifyEmail('valid-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBe('user-1');
      }
      // Verify update was called twice (token and user)
      expect(db.update).toHaveBeenCalledTimes(2);
    });
  });
});
