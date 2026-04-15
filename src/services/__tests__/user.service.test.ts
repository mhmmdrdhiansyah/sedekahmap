import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRegisterInput, registerUser } from '../user.service';
import { db } from '@/db';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'),
  },
}));

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // validateRegisterInput
  // ============================================================

  describe('validateRegisterInput', () => {
    it('returns no errors for valid input', () => {
      const errors = validateRegisterInput({
        name: 'Ahmad Rizki',
        email: 'ahmad@example.com',
        password: 'password123',
      });

      expect(errors).toHaveLength(0);
    });

    it('returns error for name shorter than 2 characters', () => {
      const errors = validateRegisterInput({
        name: 'A',
        email: 'ahmad@example.com',
        password: 'password123',
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Nama');
      expect(errors[0].message).toContain('2 karakter');
    });

    it('returns error for empty name', () => {
      const errors = validateRegisterInput({
        name: '',
        email: 'ahmad@example.com',
        password: 'password123',
      });

      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    it('returns error for invalid email (no @)', () => {
      const errors = validateRegisterInput({
        name: 'Ahmad',
        email: 'notanemail',
        password: 'password123',
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Email');
    });

    it('returns error for password shorter than 6 characters', () => {
      const errors = validateRegisterInput({
        name: 'Ahmad',
        email: 'ahmad@example.com',
        password: '12345',
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Password');
      expect(errors[0].message).toContain('6 karakter');
    });

    it('returns multiple errors for multiple invalid fields', () => {
      const errors = validateRegisterInput({
        name: '',
        email: '',
        password: '',
      });

      expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it('accepts optional phone and address', () => {
      const errors = validateRegisterInput({
        name: 'Ahmad',
        email: 'ahmad@example.com',
        password: 'password123',
        phone: '08123456789',
        address: 'Jl. Merdeka No. 10',
      });

      expect(errors).toHaveLength(0);
    });

    it('returns error when phone is not string', () => {
      const errors = validateRegisterInput({
        name: 'Ahmad',
        email: 'ahmad@example.com',
        password: 'password123',
        phone: 12345 as any,
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('telepon');
    });

    it('returns error when address is not string', () => {
      const errors = validateRegisterInput({
        name: 'Ahmad',
        email: 'ahmad@example.com',
        password: 'password123',
        address: 123 as any,
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Alamat');
    });
  });

  // ============================================================
  // registerUser
  // ============================================================

  describe('registerUser', () => {
    const validInput = {
      name: 'Ahmad Rizki',
      email: 'ahmad@example.com',
      password: 'password123',
    };

    it('returns VALIDATION_FAILED for invalid input', async () => {
      const result = await registerUser({
        name: '',
        email: '',
        password: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_FAILED');
        expect(result.details).toBeDefined();
        expect(result.details!.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('returns EMAIL_ALREADY_EXISTS for duplicate email', async () => {
      const mockSelectQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
      };
      (db as any).select.mockReturnValue(mockSelectQuery);

      const result = await registerUser({
        ...validInput,
        email: 'existing@example.com',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('EMAIL_ALREADY_EXISTS');
        expect(result.message).toContain('sudah terdaftar');
      }
    });

    it('returns ROLE_NOT_FOUND when donatur role missing', async () => {
      // Email check returns empty (no duplicate)
      const mockEmailQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      // Role check returns empty
      const mockRoleQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      let selectCount = 0;
      (db as any).select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return mockEmailQuery;
        return mockRoleQuery;
      });

      // Insert user
      const mockInsertQuery = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 'new-user-1',
          name: 'Ahmad Rizki',
          email: 'ahmad@example.com',
          phone: null,
          address: null,
          isActive: true,
          createdAt: new Date(),
        }]),
      };
      (db as any).insert.mockReturnValue(mockInsertQuery);

      // Delete rollback
      const mockDeleteQuery = {
        where: vi.fn().mockResolvedValue(undefined),
      };
      (db as any).delete.mockReturnValue(mockDeleteQuery);

      const result = await registerUser(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('ROLE_NOT_FOUND');
      }
    });

    it('registers user successfully', async () => {
      // Email check returns empty
      const mockEmailQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      // Role check returns role
      const mockRoleQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'role-donatur' }]),
      };

      let selectCount = 0;
      (db as any).select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return mockEmailQuery;
        return mockRoleQuery;
      });

      const newUser = {
        id: 'new-user-1',
        name: 'Ahmad Rizki',
        email: 'ahmad@example.com',
        phone: null,
        address: null,
        isActive: true,
        createdAt: new Date(),
      };

      // Insert user
      const mockInsertQuery = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newUser]),
      };

      // Insert user role
      const mockRoleInsertQuery = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      let insertCount = 0;
      (db as any).insert.mockImplementation(() => {
        insertCount++;
        if (insertCount === 1) return mockInsertQuery;
        return mockRoleInsertQuery;
      });

      const result = await registerUser(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.email).toBe('ahmad@example.com');
        expect(result.user.name).toBe('Ahmad Rizki');
      }
    });

    it('normalizes email to lowercase', async () => {
      const mockEmailQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockRoleQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'role-donatur' }]),
      };

      let selectCount = 0;
      (db as any).select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return mockEmailQuery;
        return mockRoleQuery;
      });

      const newUser = {
        id: 'new-user-1',
        name: 'Ahmad Rizki',
        email: 'ahmad@example.com',
        phone: null,
        address: null,
        isActive: true,
        createdAt: new Date(),
      };

      const mockInsertQuery = {
        values: vi.fn().mockImplementation((vals: any) => {
          expect(vals.email).toBe('ahmad@example.com');
          return mockInsertQuery;
        }),
        returning: vi.fn().mockResolvedValue([newUser]),
      };

      const mockRoleInsertQuery = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      let insertCount = 0;
      (db as any).insert.mockImplementation(() => {
        insertCount++;
        if (insertCount === 1) return mockInsertQuery;
        return mockRoleInsertQuery;
      });

      await registerUser({
        ...validInput,
        email: 'AHMAD@EXAMPLE.COM',
      });
    });
  });
});
