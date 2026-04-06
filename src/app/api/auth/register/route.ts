import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, userRoles } from '@/db/schema/users';
import { roles } from '@/db/schema/roles';
import { eq } from 'drizzle-orm';

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: RegisterBody = await request.json();
    const { name, email, password, phone, address } = body;

    // 2. Validasi input
    const errors: string[] = [];

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Nama harus minimal 2 karakter');
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      errors.push('Email tidak valid');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.push('Password harus minimal 6 karakter');
    }

    if (phone !== undefined && typeof phone !== 'string') {
      errors.push('No. telepon harus berupa teks');
    }

    if (address !== undefined && typeof address !== 'string') {
      errors.push('Alamat harus berupa teks');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: errors },
        { status: 400 }
      );
    }

    // 3. Cek apakah email sudah terdaftar
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 409 }
      );
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Insert user baru
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
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

    // 6. Ambil role 'donatur'
    const [donaturRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, 'donatur'))
      .limit(1);

    if (!donaturRole) {
      // Rollback: hapus user jika role tidak ditemukan
      await db.delete(users).where(eq(users.id, newUser.id));
      return NextResponse.json(
        { error: 'Konfigurasi role tidak ditemukan. Silakan jalankan seed data.' },
        { status: 500 }
      );
    }

    // 7. Assign role donatur ke user
    await db.insert(userRoles).values({
      userId: newUser.id,
      roleId: donaturRole.id,
    });

    // 8. Return success response
    return NextResponse.json(
      {
        message: 'Registrasi berhasil',
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
