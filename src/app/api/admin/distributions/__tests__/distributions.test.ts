import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { PATCH } from '../[id]/route';
import { NextRequest } from 'next/server';
import { getDistributions, verifyDistribution } from '@/services/distribution.service';
import { requirePermission } from '@/lib/auth-utils';

// Mock dependencies
vi.mock('@/services/distribution.service');
vi.mock('@/lib/auth-utils');
vi.mock('@/db', () => ({
  db: {},
}));

describe('API Routes: /api/admin/distributions', () => {
  const mockGetDistributions = vi.mocked(getDistributions);
  const mockVerifyDistribution = vi.mocked(verifyDistribution);
  const mockRequirePermission = vi.mocked(requirePermission);

  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    permissions: ['distribution:read', 'distribution:verify'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(mockAdminUser as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/distributions', () => {
    it('should return distributions with default status = pending_review', async () => {
      const mockData = [
        {
          id: 'dist-1',
          distributionCode: 'SDK-123456',
          status: 'pending_review',
          donatur: { id: 'user-1', name: 'Donatur A', email: 'donatur@example.com' },
          beneficiary: { id: 'ben-1', name: 'Beneficiary A', needs: 'Makanan', regionName: 'Jakarta' },
          proofPhotoUrl: 'https://example.com/proof.jpg',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
      ];

      mockGetDistributions.mockResolvedValue({
        data: mockData as any,
        total: 1,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions'
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.pagination).toEqual({
        limit: 20,
        offset: 0,
        total: 1,
      });
      expect(mockGetDistributions).toHaveBeenCalledWith({
        status: 'pending_review',
        limit: 20,
        offset: 0,
      });
    });

    it('should accept status query param - completed', async () => {
      mockGetDistributions.mockResolvedValue({
        data: [],
        total: 0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions?status=completed'
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetDistributions).toHaveBeenCalledWith({
        status: 'completed',
        limit: 20,
        offset: 0,
      });
    });

    it('should accept status query param - rejected', async () => {
      mockGetDistributions.mockResolvedValue({
        data: [],
        total: 0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions?status=rejected'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetDistributions).toHaveBeenCalledWith({
        status: 'rejected',
        limit: 20,
        offset: 0,
      });
    });

    it('should accept limit and offset query params', async () => {
      mockGetDistributions.mockResolvedValue({
        data: [],
        total: 50,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions?limit=10&offset=20'
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.pagination).toEqual({
        limit: 10,
        offset: 20,
        total: 50,
      });
      expect(mockGetDistributions).toHaveBeenCalledWith({
        status: 'pending_review',
        limit: 10,
        offset: 20,
      });
    });

    it('should handle empty result', async () => {
      mockGetDistributions.mockResolvedValue({
        data: [],
        total: 0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions?status=completed'
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toHaveLength(0);
      expect(json.pagination.total).toBe(0);
    });

    it('should return 401 when unauthorized', async () => {
      mockRequirePermission.mockRejectedValue(
        new Error('UNAUTHORIZED: No session found')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions'
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Anda harus login terlebih dahulu');
    });

    it('should return 403 when forbidden - missing DISTRIBUTION_READ permission', async () => {
      mockRequirePermission.mockRejectedValue(
        new Error('FORBIDDEN: Missing permission')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions'
      );

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe('Anda tidak memiliki akses');
    });

    it('should handle invalid limit param (use parseInt)', async () => {
      mockGetDistributions.mockResolvedValue({
        data: [],
        total: 0,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions?limit=abc'
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      // parseInt('abc', 10) returns NaN, but the API should handle it
      expect(mockGetDistributions).toHaveBeenCalledWith({
        status: 'pending_review',
        limit: NaN,
        offset: 0,
      });
    });
  });

  describe('PATCH /api/admin/distributions/:id', () => {
    const mockUpdatedDistribution = {
      id: 'dist-1',
      status: 'completed',
      verifiedById: 'admin-1',
      verifiedAt: new Date('2024-01-15'),
      notes: null,
    };

    it('should verify distribution with action=verify', async () => {
      mockVerifyDistribution.mockResolvedValue(
        mockUpdatedDistribution as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'verify' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.status).toBe('completed');
      expect(mockVerifyDistribution).toHaveBeenCalledWith(
        'dist-1',
        'admin-1',
        true,
        undefined
      );
    });

    it('should reject distribution with action=reject and notes', async () => {
      const rejectedDistribution = {
        ...mockUpdatedDistribution,
        status: 'rejected',
        notes: 'Foto tidak jelas',
      };

      mockVerifyDistribution.mockResolvedValue(
        rejectedDistribution as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'reject', notes: 'Foto tidak jelas' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.status).toBe('rejected');
      expect(json.data.notes).toBe('Foto tidak jelas');
      expect(mockVerifyDistribution).toHaveBeenCalledWith(
        'dist-1',
        'admin-1',
        false,
        'Foto tidak jelas'
      );
    });

    it('should reject distribution without notes', async () => {
      const rejectedDistribution = {
        ...mockUpdatedDistribution,
        status: 'rejected',
        notes: null,
      };

      mockVerifyDistribution.mockResolvedValue(
        rejectedDistribution as any
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'reject' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });

      expect(response.status).toBe(200);
      expect(mockVerifyDistribution).toHaveBeenCalledWith(
        'dist-1',
        'admin-1',
        false,
        undefined
      );
    });

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'invalid' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Action harus berupa verify atau reject');
      expect(mockVerifyDistribution).not.toHaveBeenCalled();
    });

    it('should return 404 when distribution not found', async () => {
      mockVerifyDistribution.mockRejectedValue(
        new Error('Distribusi tidak ditemukan')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/invalid-id',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'verify' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      });
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('Distribusi tidak ditemukan');
    });

    it('should return 409 when already processed', async () => {
      mockVerifyDistribution.mockRejectedValue(
        new Error('Distribusi sudah diproses sebelumnya')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'verify' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.error).toBe('Distribusi sudah diproses sebelumnya');
    });

    it('should return 400 when proof not uploaded', async () => {
      mockVerifyDistribution.mockRejectedValue(
        new Error('Bukti foto belum diupload')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'verify' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Bukti foto belum diupload');
    });

    it('should return 401 when unauthorized', async () => {
      mockRequirePermission.mockRejectedValue(
        new Error('UNAUTHORIZED: No session found')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'verify' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Anda harus login terlebih dahulu');
    });

    it('should return 403 when forbidden - missing DISTRIBUTION_VERIFY permission', async () => {
      mockRequirePermission.mockRejectedValue(
        new Error('FORBIDDEN: Missing permission')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'verify' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe('Anda tidak memiliki akses');
    });

    it('should return 500 for unexpected errors', async () => {
      mockVerifyDistribution.mockRejectedValue(
        new Error('Unexpected database error')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/distributions/dist-1',
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'verify' }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'dist-1' }),
      });
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Gagal memverifikasi distribusi');
    });
  });
});
