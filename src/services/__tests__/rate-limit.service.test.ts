import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, cleanupExpiredRateLimits } from '../rate-limit.service';
import { db } from '@/db';
import { authRateLimits } from '@/db/schema/authRateLimits';
import { eq, sql } from 'drizzle-orm';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('rate-limit.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  // ============================================================
  // checkRateLimit
  // ============================================================

  describe('checkRateLimit', () => {
    it('allows first request when no existing record', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertQuery = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);
      (db as any).insert.mockReturnValue(mockInsertQuery);

      const result = await checkRateLimit('test-key', 5, 15);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
      expect(mockInsertQuery.values).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
          requestCount: 1,
        })
      );
    });

    it('allows request when under limit', async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            key: 'test-key',
            requestCount: 3,
            windowStart,
          },
        ]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);
      (db as any).update.mockReturnValue(mockUpdateQuery);

      const result = await checkRateLimit('test-key', 5, 15);

      expect(result.allowed).toBe(true);
      expect(mockUpdateQuery.set).toHaveBeenCalledWith(
        expect.objectContaining({
          requestCount: 4,
        })
      );
    });

    it('blocks request when limit reached', async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 5 * 60 * 1000);

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            key: 'test-key',
            requestCount: 5, // At limit
            windowStart,
          },
        ]),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);

      const result = await checkRateLimit('test-key', 5, 15);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('resets counter when window expired', async () => {
      const now = new Date();
      const oldWindowStart = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago (expired)

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            key: 'test-key',
            requestCount: 10,
            windowStart: oldWindowStart,
          },
        ]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      (db as any).select.mockReturnValue(mockSelectQuery);
      (db as any).update.mockReturnValue(mockUpdateQuery);

      const result = await checkRateLimit('test-key', 5, 15);

      expect(result.allowed).toBe(true);
      expect(mockUpdateQuery.set).toHaveBeenCalledWith(
        expect.objectContaining({
          requestCount: 1, // Reset to 1
        })
      );
    });

    it('allows request on database error (fail-open)', async () => {
      (db as any).select.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await checkRateLimit('test-key', 5, 15);

      expect(result.allowed).toBe(true);
    });
  });

  // ============================================================
  // cleanupExpiredRateLimits
  // ============================================================

  describe('cleanupExpiredRateLimits', () => {
    it('deletes expired rate limit records', async () => {
      const mockDeleteQuery = {
        where: vi.fn().mockResolvedValue({ count: 100 }),
      };

      (db as any).delete.mockReturnValue(mockDeleteQuery);

      await cleanupExpiredRateLimits();

      expect(db.delete).toHaveBeenCalledWith(authRateLimits);
      expect(mockDeleteQuery.where).toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      (db as any).delete.mockImplementation(() => {
        throw new Error('Delete error');
      });

      // Should not throw
      await expect(cleanupExpiredRateLimits()).resolves.toBeUndefined();
    });
  });
});
