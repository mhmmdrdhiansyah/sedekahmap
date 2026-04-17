import bcrypt from 'bcrypt';
import { db } from '@/db';
import { users, userRoles } from '@/db/schema/users';
import { roles } from '@/db/schema/roles';
import { eq } from 'drizzle-orm';
import { ROLES, SECURITY } from '@/lib/constants';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface RegisterResult {
  success: true;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    isActive: boolean;
    createdAt: Date;
  };
}

export interface RegisterError {
  success: false;
  code: 'VALIDATION_FAILED' | 'EMAIL_ALREADY_EXISTS' | 'ROLE_NOT_FOUND' | 'INTERNAL_ERROR';
  message: string;
  details?: string[];
}

export type RegisterOutput = RegisterResult | RegisterError;

interface ValidationError {
  message: string;
}

export function validateRegisterInput(input: RegisterInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.name || typeof input.name !== 'string' || input.name.trim().length < 2) {
    errors.push({ message: 'Nama harus minimal 2 karakter' });
  }

  if (!input.email || typeof input.email !== 'string' || !input.email.includes('@')) {
    errors.push({ message: 'Email tidak valid' });
  }

  if (!input.password || typeof input.password !== 'string' || input.password.length < SECURITY.PASSWORD_MIN_LENGTH) {
    errors.push({ message: `Password harus minimal ${SECURITY.PASSWORD_MIN_LENGTH} karakter` });
  }

  if (input.phone !== undefined && typeof input.phone !== 'string') {
    errors.push({ message: 'No. telepon harus berupa teks' });
  }

  if (input.address !== undefined && typeof input.address !== 'string') {
    errors.push({ message: 'Alamat harus berupa teks' });
  }

  return errors;
}

export async function registerUser(input: RegisterInput): Promise<RegisterOutput> {
  try {
    // 1. Validasi input
    const validationErrors = validateRegisterInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        code: 'VALIDATION_FAILED',
        message: 'Validasi gagal',
        details: validationErrors.map((e) => e.message),
      };
    }

    const { name, email, password, phone, address } = input;

    // 2. Normalisasi email
    const normalizedEmail = email.toLowerCase().trim();

    // 3. Cek email unik
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email sudah terdaftar',
      };
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, SECURITY.BCRYPT_SALT_ROUNDS);

    // 5. Insert user baru
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        isActive: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        address: users.address,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    // 6. Ambil role donatur
    const [donaturRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, ROLES.DONATUR))
      .limit(1);

    if (!donaturRole) {
      // Rollback: hapus user jika role tidak ditemukan
      await db.delete(users).where(eq(users.id, newUser.id));
      return {
        success: false,
        code: 'ROLE_NOT_FOUND',
        message: 'Konfigurasi role tidak ditemukan. Silakan jalankan seed data.',
      };
    }

    // 7. Assign role donatur ke user
    await db.insert(userRoles).values({
      userId: newUser.id,
      roleId: donaturRole.id,
    });

    // 8. Return success
    return {
      success: true,
      user: newUser,
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan server',
    };
  }
}
