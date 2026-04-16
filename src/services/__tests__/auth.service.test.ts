import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkAccountLockout,
  handleFailedLogin,
  resetLoginAttempts,
  verifyPassword,
} from '../auth.service';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // checkAccountLockout
  // ============================================================

  describe('checkAccountLockout', () => {
    it('throws error when account is locked', async () => {
      const lockedUser = {
        id: 'user-1',
        email: 'locked@example.com',
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      } as any;

      // Call the function and expect it to throw
      await expect(checkAccountLockout(lockedUser)).rejects.toThrow('ACCOUNT_LOCKED');
    });

    it('does not throw when account is not locked', async () => {
      const unlockedUser = {
        id: 'user-1',
        email: 'user@example.com',
        lockedUntil: null,
      } as any;

      // Should not throw
      await expect(checkAccountLockout(unlockedUser)).resolves.toBeUndefined();
    });

    it('does not throw when lock period has expired', async () => {
      const expiredLockUser = {
        id: 'user-1',
        email: 'user@example.com',
        lockedUntil: new Date(Date.now() - 1000), // 1 second ago
      } as any;

      // Should not throw
      await expect(checkAccountLockout(expiredLockUser)).resolves.toBeUndefined();
    });
  });

  // ============================================================
  // handleFailedLogin
  // ============================================================

  describe('handleFailedLogin', () => {
    it('increments failed login attempts without locking (under threshold)', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { failedLoginAttempts: 3 },
        ]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);
      (db as any).update.mockReturnValue(mockUpdateQuery);

      await handleFailedLogin('user-1');

      expect(mockUpdateQuery.set).toHaveBeenCalledWith({
        failedLoginAttempts: 4,
        lastFailedLoginAt: expect.any(Date),
      });
    });

    it('locks account when threshold is reached', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { failedLoginAttempts: 4 }, // Will become 5 (threshold)
        ]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);
      (db as any).update.mockReturnValue(mockUpdateQuery);

      await handleFailedLogin('user-1');

      expect(mockUpdateQuery.set).toHaveBeenCalledWith({
        failedLoginAttempts: 5,
        lastFailedLoginAt: expect.any(Date),
        lockedUntil: expect.any(Date),
      });
    });

    it('handles user not found gracefully', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);

      // Should not throw
      await expect(handleFailedLogin('user-1')).resolves.toBeUndefined();
    });
  });

  // ============================================================
  // resetLoginAttempts
  // ============================================================

  describe('resetLoginAttempts', () => {
    it('resets all lockout fields', async () => {
      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).update.mockReturnValue(mockUpdateQuery);

      await resetLoginAttempts('user-1');

      expect(mockUpdateQuery.set).toHaveBeenCalledWith({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      });
      expect(mockUpdateQuery.where).toHaveBeenCalled();
    });
  });

  // ============================================================
  // verifyPassword
  // ============================================================

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const bcrypt = await import('bcrypt');
      (bcrypt.default.compare as any).mockResolvedValueOnce(true);

      const result = await verifyPassword('password123', '$2b$12$hash');
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const bcrypt = await import('bcrypt');
      (bcrypt.default.compare as any).mockResolvedValueOnce(false);

      const result = await verifyPassword('wrongpassword', '$2b$12$hash');
      expect(result).toBe(false);
    });
  });
});
