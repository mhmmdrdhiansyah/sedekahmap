import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { roles, rolePermissions } from './schema/roles';
import { permissions } from './schema/permissions';
import { users, userRoles } from './schema/users';
import bcrypt from 'bcrypt';
import { SECURITY } from '@/lib/constants';

// ============================================================
// KONEKSI DATABASE (terpisah dari app, karena ini script standalone)
// ============================================================
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

// ============================================================
// DATA: ROLES
// ============================================================
const ROLES = [
  { name: 'admin', description: 'Administrator sistem — full access' },
  { name: 'verifikator', description: 'Pihak kredibel yang menginput data target sedekah' },
  { name: 'donatur', description: 'Masyarakat umum yang ingin menyalurkan sedekah' },
] as const;

// ============================================================
// DATA: PERMISSIONS
// ============================================================
const PERMISSIONS = [
  // Modul: beneficiary
  { name: 'beneficiary:create', description: 'Input data target sedekah baru', module: 'beneficiary' },
  { name: 'beneficiary:read', description: 'Lihat data target sedekah', module: 'beneficiary' },
  { name: 'beneficiary:update', description: 'Edit data target sedekah', module: 'beneficiary' },
  { name: 'beneficiary:delete', description: 'Hapus data target sedekah', module: 'beneficiary' },

  // Modul: access_request
  { name: 'access_request:create', description: 'Buat request akses data', module: 'access_request' },
  { name: 'access_request:read', description: 'Lihat request akses', module: 'access_request' },
  { name: 'access_request:approve', description: 'Approve atau reject request akses', module: 'access_request' },

  // Modul: distribution
  { name: 'distribution:create', description: 'Lapor penyaluran bantuan', module: 'distribution' },
  { name: 'distribution:read', description: 'Lihat data penyaluran', module: 'distribution' },
  { name: 'distribution:verify', description: 'Verifikasi bukti penyaluran', module: 'distribution' },

  // Modul: review
  { name: 'review:create', description: 'Tulis ulasan penyaluran', module: 'review' },
  { name: 'review:read', description: 'Lihat ulasan', module: 'review' },

  // Modul: user
  { name: 'user:manage', description: 'CRUD kelola user', module: 'user' },
  { name: 'user:read', description: 'Lihat daftar user', module: 'user' },

  // Modul: region
  { name: 'region:manage', description: 'Kelola data wilayah', module: 'region' },
] as const;

// ============================================================
// MAPPING: ROLE → PERMISSIONS
// Admin punya semua. Verifikator & donatur punya subset.
// ============================================================
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: PERMISSIONS.map((p) => p.name), // Admin = semua permission
  verifikator: [
    'beneficiary:create',
    'beneficiary:read',
    'beneficiary:update',
    'distribution:read',
    'review:read',
  ],
  donatur: [
    'beneficiary:read',       // read hanya data agregat (detail setelah approved)
    'access_request:create',
    'access_request:read',
    'distribution:create',
    'distribution:read',
    'review:create',
    'review:read',
  ],
};

// ============================================================
// DATA: SAMPLE USERS
// ============================================================
const SAMPLE_USERS = [
  {
    name: 'Administrator',
    email: 'admin@sedekahmap.id',
    password: 'admin123',
    phone: '081234567890',
    role: 'admin',
  },
  {
    name: 'Verifikator Sample',
    email: 'verifikator@sedekahmap.id',
    password: 'verifikator123',
    phone: '081234567891',
    role: 'verifikator',
  },
  {
    name: 'Donatur Sample',
    email: 'donatur@sedekahmap.id',
    password: 'donatur123',
    phone: '081234567892',
    role: 'donatur',
  },
];

// ============================================================
// SEED FUNCTION
// ============================================================
async function seed() {
  console.log('🌱 Seeding database...\n');

  // --- 1. Insert Roles ---
  console.log('📋 Inserting roles...');
  const insertedRoles = await db
    .insert(roles)
    .values(ROLES.map((r) => ({ name: r.name, description: r.description })))
    .onConflictDoNothing({ target: roles.name })
    .returning();
  console.log(`   ✅ ${insertedRoles.length} roles inserted`);

  // Buat map name -> id untuk lookup
  const roleMap = new Map(insertedRoles.map((r) => [r.name, r.id]));

  // --- 2. Insert Permissions ---
  console.log('🔑 Inserting permissions...');
  const insertedPermissions = await db
    .insert(permissions)
    .values(
      PERMISSIONS.map((p) => ({
        name: p.name,
        description: p.description,
        module: p.module,
      }))
    )
    .onConflictDoNothing({ target: permissions.name })
    .returning();
  console.log(`   ✅ ${insertedPermissions.length} permissions inserted`);

  // Buat map name -> id
  const permissionMap = new Map(insertedPermissions.map((p) => [p.name, p.id]));

  // --- 3. Assign Permissions ke Roles ---
  console.log('🔗 Assigning permissions to roles...');
  const rolePermissionValues: { roleId: string; permissionId: string }[] = [];

  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const permName of permNames) {
      const permissionId = permissionMap.get(permName);
      if (!permissionId) continue;
      rolePermissionValues.push({ roleId, permissionId });
    }
  }

  if (rolePermissionValues.length > 0) {
    await db.insert(rolePermissions).values(rolePermissionValues).onConflictDoNothing();
  }
  console.log(`   ✅ ${rolePermissionValues.length} role-permission mappings created`);

  // --- 4. Insert Sample Users ---
  console.log('👤 Inserting sample users...');
  for (const userData of SAMPLE_USERS) {
    const hashedPassword = await bcrypt.hash(userData.password, SECURITY.BCRYPT_SALT_ROUNDS);

    const [insertedUser] = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        phone: userData.phone,
        isActive: true,
        emailVerifiedAt: new Date(),
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    if (insertedUser) {
      const roleId = roleMap.get(userData.role);
      if (roleId) {
        await db.insert(userRoles).values({
          userId: insertedUser.id,
          roleId,
        });
      }
      console.log(`   ✅ User "${userData.email}" created with role "${userData.role}"`);
    } else {
      console.log(`   ⏭️  User "${userData.email}" already exists, skipped`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin:       admin@sedekahmap.id / admin123');
  console.log('   Verifikator: verifikator@sedekahmap.id / verifikator123');
  console.log('   Donatur:     donatur@sedekahmap.id / donatur123');
}

// ============================================================
// EXECUTE
// ============================================================
seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
