import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestPasswordReset,
  resetPassword,
} from '../password-reset.service';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { passwordResetTokens } from '@/db/schema/passwordResetTokens';
import { eq, and } from 'drizzle-orm';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$newhashedpassword'),
  },
}));

// Mock email service
vi.mock('../email.service', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock security tokens
vi.mock('@/lib/utils/security-tokens', () => ({
  generateToken: vi.fn(() => 'mock-token-123'),
  hashToken: vi.fn((token: string) => `hashed-${token}`),
  isTokenExpired: vi.fn(() => false),
  getTokenTTLMinutes: vi.fn((minutes: number) => new Date(Date.now() + minutes * 60 * 1000)),
}));

describe('password-reset.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // requestPasswordReset
  // ============================================================

  describe('requestPasswordReset', () => {
    it('always returns success (anti-enumeration) for existing active user', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        ]),
      };

      const mockInsertQuery = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);
      (db as any).insert.mockReturnValue(mockInsertQuery);

      const result = await requestPasswordReset('test@example.com');

      expect(result).toEqual({ success: true });
    });

    it('always returns success (anti-enumeration) for non-existent user', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);

      const result = await requestPasswordReset('nonexistent@example.com');

      expect(result).toEqual({ success: true });
    });

    it('always returns success for inactive user', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);

      const result = await requestPasswordReset('inactive@example.com');

      expect(result).toEqual({ success: true });
    });
  });

  // ============================================================
  // resetPassword
  // ============================================================

  describe('resetPassword', () => {
    it('returns error for weak password', async () => {
      const result = await resetPassword('valid-token', 'short');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('WEAK_PASSWORD');
      }
    });

    it('returns error for invalid token', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);

      const result = await resetPassword('invalid-token', 'NewPassword123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('TOKEN_INVALID');
      }
    });

    it('returns error for already used token', async () => {
      const mockSelectQuery = {
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

      (db as any).select.mockReturnValue(mockSelectQuery);

      const result = await resetPassword('used-token', 'NewPassword123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('TOKEN_ALREADY_USED');
      }
    });

    it('returns error for expired token', async () => {
      const { isTokenExpired } = await import('@/lib/utils/security-tokens');
      (isTokenExpired as any).mockReturnValueOnce(true);

      const mockSelectQuery = {
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

      (db as any).select.mockReturnValue(mockSelectQuery);

      const result = await resetPassword('expired-token', 'NewPassword123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('TOKEN_EXPIRED');
      }
    });

    it('successfully resets password with valid token', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'token-1',
            userId: 'user-1',
            tokenHash: 'hashed-mock-token-123',
            usedAt: null,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        ]),
      };

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        await callback({
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        });
      });

      (db as any).select.mockReturnValue(mockSelectQuery);
      (db as any).transaction = mockTransaction;

      const result = await resetPassword('valid-token', 'NewPassword123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBe('user-1');
      }
    });
  });
});
