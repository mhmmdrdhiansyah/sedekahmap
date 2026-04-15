import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createBeneficiary,
  getBeneficiaryById,
  updateBeneficiary,
  deleteBeneficiary,
  getBeneficiariesByRegion,
  getBeneficiariesByVerifikator,
} from '../beneficiary.service';
import { db } from '@/db';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock beneficiary-filters
vi.mock('../beneficiary-filters', () => ({
  activeVerifiedBeneficiaryFilter: vi.fn().mockReturnValue({ _brand: 'filter' }),
}));

describe('beneficiary.service', () => {
  const mockDb = db as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================
  // createBeneficiary
  // ============================================================

  describe('createBeneficiary', () => {
    const validInput = {
      nik: '3174051234560001',
      name: 'Ahmad Rizki',
      address: 'Jl. Merdeka No. 10',
      needs: 'Makanan',
      latitude: -6.2088,
      longitude: 106.8456,
      regionCode: '31.74.05.1001',
      regionName: 'Kelurahan Menteng',
      regionPath: 'DKI Jakarta > Kota Jakarta Pusat > Kec. Menteng',
    };

    const mockInsertedBeneficiary = {
      id: 'ben-1',
      nik: '3174051234560001',
      name: 'Ahmad Rizki',
      address: 'Jl. Merdeka No. 10',
      needs: 'Makanan',
      latitude: -6.2088,
      longitude: 106.8456,
      regionCode: '31.74.05.1001',
      regionName: 'Kelurahan Menteng',
      regionPath: 'DKI Jakarta > Kota Jakarta Pusat > Kec. Menteng',
      status: 'verified',
      verifiedById: 'verif-1',
      verifiedAt: new Date('2024-06-15T10:00:00Z'),
      expiresAt: new Date('2024-12-15T10:00:00Z'),
      createdAt: new Date('2024-06-15T10:00:00Z'),
      updatedAt: new Date('2024-06-15T10:00:00Z'),
    };

    it('throws "NIK sudah terdaftar" when NIK duplicate exists', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'existing-ben' }]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      await expect(
        createBeneficiary(validInput, 'verif-1')
      ).rejects.toThrow('NIK sudah terdaftar');
    });

    it('creates beneficiary successfully when NIK is unique', async () => {
      // NIK uniqueness check returns empty
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      // Insert returns the new beneficiary
      const mockInsertQuery = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockInsertedBeneficiary]),
      };
      mockDb.insert.mockReturnValue(mockInsertQuery);

      const result = await createBeneficiary(validInput, 'verif-1');

      expect(result).toEqual(mockInsertedBeneficiary);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('sets expiresAt to 6 months from now', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const mockInsertQuery = {
        values: vi.fn().mockImplementation((vals: any) => {
          // Verify expiresAt is ~6 months from now
          const expiresAt = vals.expiresAt as Date;
          const expectedExpiry = new Date('2024-12-15T10:00:00Z');
          expect(expiresAt.getMonth()).toBe(expectedExpiry.getMonth());
          return mockInsertQuery;
        }),
        returning: vi.fn().mockResolvedValue([mockInsertedBeneficiary]),
      };
      mockDb.insert.mockReturnValue(mockInsertQuery);

      await createBeneficiary(validInput, 'verif-1');
    });

    it('sets status to verified and verifiedById', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const mockInsertQuery = {
        values: vi.fn().mockImplementation((vals: any) => {
          expect(vals.status).toBe('verified');
          expect(vals.verifiedById).toBe('verif-1');
          return mockInsertQuery;
        }),
        returning: vi.fn().mockResolvedValue([mockInsertedBeneficiary]),
      };
      mockDb.insert.mockReturnValue(mockInsertQuery);

      await createBeneficiary(validInput, 'verif-1');
    });
  });

  // ============================================================
  // getBeneficiaryById
  // ============================================================

  describe('getBeneficiaryById', () => {
    const mockBeneficiary = {
      id: 'ben-1',
      nik: '3174051234560001',
      name: 'Ahmad Rizki',
      address: 'Jl. Merdeka No. 10',
      needs: 'Makanan',
      latitude: -6.2088,
      longitude: 106.8456,
      regionCode: '31.74.05.1001',
      regionName: 'Kelurahan Menteng',
      regionPath: 'DKI Jakarta > Kota Jakarta Pusat > Kec. Menteng',
      status: 'verified',
      verifiedById: 'verif-1',
      verifiedAt: new Date('2024-06-15T10:00:00Z'),
      expiresAt: new Date('2024-12-15T10:00:00Z'),
      createdAt: new Date('2024-06-15T10:00:00Z'),
      updatedAt: new Date('2024-06-15T10:00:00Z'),
    };

    it('throws when beneficiary not found', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      await expect(
        getBeneficiaryById('non-existent-id')
      ).rejects.toThrow('Data penerima manfaat tidak ditemukan');
    });

    it('returns beneficiary when found', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBeneficiary]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const result = await getBeneficiaryById('ben-1');

      expect(result).toEqual(mockBeneficiary);
      expect(result.id).toBe('ben-1');
      expect(result.name).toBe('Ahmad Rizki');
    });
  });

  // ============================================================
  // updateBeneficiary
  // ============================================================

  describe('updateBeneficiary', () => {
    const mockBeneficiary = {
      id: 'ben-1',
      nik: '3174051234560001',
      name: 'Ahmad Rizki',
      address: 'Jl. Merdeka No. 10',
      needs: 'Makanan',
      latitude: -6.2088,
      longitude: 106.8456,
      regionCode: '31.74.05.1001',
      regionName: 'Kelurahan Menteng',
      regionPath: 'DKI Jakarta > Kota Jakarta Pusat > Kec. Menteng',
      status: 'verified',
      verifiedById: 'verif-1',
      verifiedAt: new Date('2024-06-15T10:00:00Z'),
      expiresAt: new Date('2024-12-15T10:00:00Z'),
      createdAt: new Date('2024-06-15T10:00:00Z'),
      updatedAt: new Date('2024-06-15T10:00:00Z'),
    };

    it('throws when beneficiary not found', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      await expect(
        updateBeneficiary('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Data penerima manfaat tidak ditemukan');
    });

    it('updates only provided fields', async () => {
      // getBeneficiaryById check
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBeneficiary]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const updatedBeneficiary = { ...mockBeneficiary, name: 'Ahmad Rizki Updated', updatedAt: new Date('2024-06-15T10:00:00Z') };
      const mockUpdateQuery = {
        set: vi.fn().mockImplementation((data: any) => {
          // Only name and updatedAt should be set
          expect(data.name).toBe('Ahmad Rizki Updated');
          expect(data.address).toBeUndefined();
          expect(data.needs).toBeUndefined();
          return mockUpdateQuery;
        }),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedBeneficiary]),
      };
      mockDb.update.mockReturnValue(mockUpdateQuery);

      const result = await updateBeneficiary('ben-1', { name: 'Ahmad Rizki Updated' });

      expect(result.name).toBe('Ahmad Rizki Updated');
    });

    it('includes updatedAt in update', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBeneficiary]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const mockUpdateQuery = {
        set: vi.fn().mockImplementation((data: any) => {
          expect(data.updatedAt).toBeInstanceOf(Date);
          return mockUpdateQuery;
        }),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockBeneficiary]),
      };
      mockDb.update.mockReturnValue(mockUpdateQuery);

      await updateBeneficiary('ben-1', { needs: 'Pakaian' });
    });
  });

  // ============================================================
  // deleteBeneficiary
  // ============================================================

  describe('deleteBeneficiary', () => {
    const mockBeneficiary = {
      id: 'ben-1',
      nik: '3174051234560001',
      name: 'Ahmad Rizki',
    };

    it('throws when beneficiary not found', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      await expect(
        deleteBeneficiary('non-existent-id')
      ).rejects.toThrow('Data penerima manfaat tidak ditemukan');
    });

    it('deletes beneficiary and returns success', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockBeneficiary]),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const mockDeleteQuery = {
        where: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.delete.mockReturnValue(mockDeleteQuery);

      const result = await deleteBeneficiary('ben-1');

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Name Masking (tested via list functions)
  // ============================================================

  describe('getBeneficiariesByRegion - name masking', () => {
    it('masks names in public output', async () => {
      const mockResults = [
        { id: 'ben-1', name: 'Ahmad Rizki', needs: 'Makanan', regionName: 'Jakarta', latitude: -6.2, longitude: 106.8 },
        { id: 'ben-2', name: 'Siti Aminah', needs: 'Pakaian', regionName: 'Bandung', latitude: -6.9, longitude: 107.6 },
        { id: 'ben-3', name: 'Budi', needs: 'Obat', regionName: 'Surabaya', latitude: -7.2, longitude: 112.7 },
        { id: 'ben-4', name: 'A', needs: 'Air', regionName: 'Semarang', latitude: -6.9, longitude: 110.4 },
      ];

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockResults),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const result = await getBeneficiariesByRegion('31');

      // Multi-word: "Ahmad Rizki" → "A*** ***i"
      expect(result[0].name).toBe('A*** ***i');
      // Multi-word: "Siti Aminah" → "S*** ***h"
      expect(result[1].name).toBe('S*** ***h');
      // Single word: "Budi" → "B***i"
      expect(result[2].name).toBe('B***i');
      // Single character: "A" → "A"
      expect(result[3].name).toBe('A');
    });
  });

  describe('getBeneficiariesByVerifikator - name masking', () => {
    it('masks names in verifikator list output', async () => {
      const mockResults = [
        { id: 'ben-1', name: 'Ahmad Rizki', nik: '3174051234560001', needs: 'Makanan', regionName: 'Jakarta', status: 'verified' },
      ];

      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockResults),
      };
      mockDb.select.mockReturnValue(mockSelectQuery);

      const result = await getBeneficiariesByVerifikator('verif-1');

      expect(result[0].name).toBe('A*** ***i');
    });
  });
});
