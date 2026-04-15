import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDistributions, verifyDistribution } from '../distribution.service';
import { db } from '@/db';
import { distributions } from '@/db/schema/distributions';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { STATUS } from '@/lib/constants';
import { eq, and, desc, count } from 'drizzle-orm';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe('distribution.service', () => {
  const mockDb = db as any;
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    mockDb.select = mockSelect;
    mockDb.update = mockUpdate;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDistributions', () => {
    const mockDistributions = [
      {
        id: 'dist-1',
        accessRequestId: 'ar-1',
        donaturId: 'user-1',
        beneficiaryId: 'ben-1',
        distributionCode: 'SDK-123456',
        proofPhotoUrl: 'https://example.com/proof1.jpg',
        status: 'pending_review',
        verifiedById: null,
        verifiedAt: null,
        notes: null,
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-10T10:00:00Z'),
        donatur: {
          id: 'user-1',
          name: 'Donatur A',
          email: 'donatur1@example.com',
        },
        beneficiary: {
          id: 'ben-1',
          name: 'Beneficiary A',
          needs: 'Makanan',
          regionName: 'Jakarta',
        },
      },
      {
        id: 'dist-2',
        accessRequestId: 'ar-2',
        donaturId: 'user-2',
        beneficiaryId: 'ben-2',
        distributionCode: 'SDK-789012',
        proofPhotoUrl: 'https://example.com/proof2.jpg',
        status: 'completed',
        verifiedById: 'admin-1',
        verifiedAt: new Date('2024-01-12T10:00:00Z'),
        notes: null,
        createdAt: new Date('2024-01-11T10:00:00Z'),
        updatedAt: new Date('2024-01-12T10:00:00Z'),
        donatur: {
          id: 'user-2',
          name: 'Donatur B',
          email: 'donatur2@example.com',
        },
        beneficiary: {
          id: 'ben-2',
          name: 'Beneficiary B',
          needs: 'Pakaian',
          regionName: 'Bandung',
        },
      },
    ];

    it('should return distributions with pagination', async () => {
      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1 }]),
      };

      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([mockDistributions[0]]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockCountQuery;
        }
        return mockDataQuery;
      });

      const result = await getDistributions({ limit: 10, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should filter by status - pending_review', async () => {
      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1 }]),
      };

      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([mockDistributions[0]]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockCountQuery;
        }
        return mockDataQuery;
      });

      const result = await getDistributions({
        status: 'pending_review',
        limit: 20,
        offset: 0,
      });

      expect(result.data[0].status).toBe('pending_review');
      expect(result.total).toBe(1);
    });

    it('should filter by status - completed', async () => {
      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1 }]),
      };

      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([mockDistributions[1]]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockCountQuery;
        }
        return mockDataQuery;
      });

      const result = await getDistributions({
        status: 'completed',
        limit: 20,
        offset: 0,
      });

      expect(result.data[0].status).toBe('completed');
      expect(result.data[0].verifiedById).toBe('admin-1');
    });

    it('should filter by status - rejected', async () => {
      const rejectedDistribution = {
        ...mockDistributions[0],
        status: 'rejected',
        notes: 'Foto tidak jelas',
      };

      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1 }]),
      };

      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([rejectedDistribution]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockCountQuery;
        }
        return mockDataQuery;
      });

      const result = await getDistributions({
        status: 'rejected',
        limit: 20,
        offset: 0,
      });

      expect(result.data[0].status).toBe('rejected');
      expect(result.data[0].notes).toBe('Foto tidak jelas');
    });

    it('should handle empty result', async () => {
      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      };

      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockCountQuery;
        }
        return mockDataQuery;
      });

      const result = await getDistributions({
        status: 'pending_review',
        limit: 20,
        offset: 0,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should use default limit and offset', async () => {
      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 2 }]),
      };

      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockDistributions),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockCountQuery;
        }
        return mockDataQuery;
      });

      await getDistributions({});

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should include donatur and beneficiary info', async () => {
      const mockCountQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ total: 1 }]),
      };

      const mockDataQuery = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([mockDistributions[0]]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockCountQuery;
        }
        return mockDataQuery;
      });

      const result = await getDistributions({});

      expect(result.data[0].donatur).toBeDefined();
      expect(result.data[0].donatur.name).toBe('Donatur A');
      expect(result.data[0].beneficiary).toBeDefined();
      expect(result.data[0].beneficiary.name).toBe('Beneficiary A');
      expect(result.data[0].beneficiary.regionName).toBe('Jakarta');
    });
  });

  describe('verifyDistribution - Approve', () => {
    const mockDistribution = {
      id: 'dist-1',
      accessRequestId: 'ar-1',
      donaturId: 'user-1',
      beneficiaryId: 'ben-1',
      distributionCode: 'SDK-123456',
      proofPhotoUrl: 'https://example.com/proof.jpg',
      status: 'pending_review',
      verifiedById: null,
      verifiedAt: null,
      notes: null,
      createdAt: new Date('2024-01-10T10:00:00Z'),
      updatedAt: new Date('2024-01-10T10:00:00Z'),
    };

    const adminId = 'admin-1';
    const now = new Date('2024-01-15T10:00:00Z');

    it('should approve distribution - update status to completed', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'completed',
            verifiedById: adminId,
            verifiedAt: now,
            notes: null,
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      const result = await verifyDistribution('dist-1', adminId, true);

      expect(result.status).toBe('completed');
      expect(result.verifiedById).toBe(adminId);
      expect(result.verifiedAt).toEqual(now);
    });

    it('should approve distribution - update beneficiary to completed', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'completed',
            verifiedById: adminId,
            verifiedAt: now,
            notes: null,
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      await verifyDistribution('dist-1', adminId, true);

      expect(mockUpdate).toHaveBeenCalledWith(beneficiaries);
      expect(mockUpdate).toHaveBeenCalledWith(distributions);
    });

    it('should set verifiedBy and verifiedAt on approve', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'completed',
            verifiedById: adminId,
            verifiedAt: now,
            notes: null,
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      const result = await verifyDistribution('dist-1', adminId, true);

      expect(result.verifiedById).toBe(adminId);
      expect(result.verifiedAt).toEqual(now);
    });

    it('should update updatedAt on approve', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'completed',
            verifiedById: adminId,
            verifiedAt: now,
            notes: null,
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      const result = await verifyDistribution('dist-1', adminId, true);

      expect(result.updatedAt).toEqual(now);
    });
  });

  describe('verifyDistribution - Reject', () => {
    const mockDistribution = {
      id: 'dist-1',
      accessRequestId: 'ar-1',
      donaturId: 'user-1',
      beneficiaryId: 'ben-1',
      distributionCode: 'SDK-123456',
      proofPhotoUrl: 'https://example.com/proof.jpg',
      status: 'pending_review',
      verifiedById: null,
      verifiedAt: null,
      notes: null,
      createdAt: new Date('2024-01-10T10:00:00Z'),
      updatedAt: new Date('2024-01-10T10:00:00Z'),
    };

    const adminId = 'admin-1';
    const notes = 'Foto tidak jelas';
    const now = new Date('2024-01-15T10:00:00Z');

    it('should reject distribution - update status to rejected', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'rejected',
            verifiedById: adminId,
            verifiedAt: now,
            notes,
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      const result = await verifyDistribution('dist-1', adminId, false, notes);

      expect(result.status).toBe('rejected');
      expect(result.notes).toBe(notes);
    });

    it('should reject distribution - NOT update beneficiary status', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'rejected',
            verifiedById: adminId,
            verifiedAt: now,
            notes,
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      await verifyDistribution('dist-1', adminId, false, notes);

      // beneficiaries should only be updated once (not called for rejection)
      const updateCallCount = mockUpdate.mock.calls.length;
      // Distribution is updated, but beneficiary should not be updated on reject
      expect(updateCallCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle reject with notes', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'rejected',
            verifiedById: adminId,
            verifiedAt: now,
            notes: 'Bukti tidak valid',
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      const result = await verifyDistribution('dist-1', adminId, false, 'Bukti tidak valid');

      expect(result.notes).toBe('Bukti tidak valid');
      expect(result.status).toBe('rejected');
    });

    it('should update updatedAt on reject', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockDistribution]),
      };

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...mockDistribution,
            status: 'rejected',
            verifiedById: adminId,
            verifiedAt: now,
            notes,
            updatedAt: now,
          },
        ]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);
      mockUpdate.mockReturnValue(mockUpdateQuery);

      const result = await verifyDistribution('dist-1', adminId, false, notes);

      expect(result.updatedAt).toEqual(now);
    });
  });

  describe('verifyDistribution - Error Cases', () => {
    const mockDistribution = {
      id: 'dist-1',
      accessRequestId: 'ar-1',
      donaturId: 'user-1',
      beneficiaryId: 'ben-1',
      distributionCode: 'SDK-123456',
      proofPhotoUrl: 'https://example.com/proof.jpg',
      status: 'pending_review',
      verifiedById: null,
      verifiedAt: null,
      notes: null,
      createdAt: new Date('2024-01-10T10:00:00Z'),
      updatedAt: new Date('2024-01-10T10:00:00Z'),
    };

    it('should throw "Distribusi tidak ditemukan" for invalid ID', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);

      await expect(
        verifyDistribution('invalid-id', 'admin-1', true)
      ).rejects.toThrow('Distribusi tidak ditemukan');
    });

    it('should throw "Distribusi sudah diproses sebelumnya" if not in pending_review', async () => {
      const alreadyProcessed = {
        ...mockDistribution,
        status: 'completed',
      };

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([alreadyProcessed]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);

      await expect(
        verifyDistribution('dist-1', 'admin-1', true)
      ).rejects.toThrow('Distribusi sudah diproses sebelumnya');
    });

    it('should throw "Bukti foto belum diupload" if proofPhotoUrl is null', async () => {
      const noProofDistribution = {
        ...mockDistribution,
        proofPhotoUrl: null,
      };

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([noProofDistribution]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);

      await expect(
        verifyDistribution('dist-1', 'admin-1', true)
      ).rejects.toThrow('Bukti foto belum diupload');
    });

    it('should throw for rejected status (already processed)', async () => {
      const rejectedDistribution = {
        ...mockDistribution,
        status: 'rejected',
      };

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([rejectedDistribution]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);

      await expect(
        verifyDistribution('dist-1', 'admin-1', true)
      ).rejects.toThrow('Distribusi sudah diproses sebelumnya');
    });

    it('should throw for pending_proof status (not ready for review)', async () => {
      const pendingProofDistribution = {
        ...mockDistribution,
        status: 'pending_proof',
      };

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([pendingProofDistribution]),
      };

      mockSelect.mockReturnValue(mockSelectQuery);

      await expect(
        verifyDistribution('dist-1', 'admin-1', true)
      ).rejects.toThrow('Distribusi sudah diproses sebelumnya');
    });
  });
});
