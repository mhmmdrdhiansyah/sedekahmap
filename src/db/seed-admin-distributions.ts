import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './schema/users';
import { beneficiaries } from './schema/beneficiaries';
import { accessRequests } from './schema/accessRequests';
import { distributions } from './schema/distributions';
import { STATUS, SECURITY } from '@/lib/constants';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

// ============================================================
// KONEKSI DATABASE
// ============================================================
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

// ============================================================
// SEED DATA: ADMIN DISTRIBUTION VERIFICATION TEST
// ============================================================

async function seedAdminDistributionTest() {
  console.log('🌱 Seeding admin distribution verification test data...\n');

  // --- 1. Get or Create Admin User ---
  console.log('👤 Setting up admin user...');
  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@sedekahmap.id'))
    .limit(1);

  let adminId = adminUser?.id;

  if (!adminId) {
    const hashedPassword = await bcrypt.hash('admin123', SECURITY.BCRYPT_SALT_ROUNDS);
    const [insertedAdmin] = await db
      .insert(users)
      .values({
        name: 'Administrator',
        email: 'admin@sedekahmap.id',
        password: hashedPassword,
        phone: '081234567890',
        isActive: true,
        emailVerifiedAt: new Date(),
      })
      .returning();
    adminId = insertedAdmin.id;
    console.log('   ✅ Admin user created');
  } else {
    console.log('   ✅ Admin user exists');
  }

  // --- 2. Get or Create Donatur User ---
  console.log('👤 Setting up donatur user...');
  const [donaturUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'donatur@test.id'))
    .limit(1);

  let donaturId = donaturUser?.id;

  if (!donaturId) {
    const hashedPassword = await bcrypt.hash('donatur123', SECURITY.BCRYPT_SALT_ROUNDS);
    const [insertedDonatur] = await db
      .insert(users)
      .values({
        name: 'Donatur Test',
        email: 'donatur@test.id',
        password: hashedPassword,
        phone: '081234567891',
        isActive: true,
        emailVerifiedAt: new Date(),
      })
      .returning();
    donaturId = insertedDonatur.id;
    console.log('   ✅ Donatur user created');
  } else {
    console.log('   ✅ Donatur user exists');
  }

  // --- 3. Create Beneficiary ---
  console.log('🎯 Creating beneficiary...');
  const [beneficiary] = await db
    .insert(beneficiaries)
    .values({
      nik: '1234567890123456', // NIK dummy (16 digit)
      name: 'Bapak Ahmad',
      needs: 'Sembako',
      regionCode: '320101', // Jakarta Pusat
      regionName: 'DKI Jakarta - Jakarta Pusat',
      address: 'Jl. Test No. 123',
      status: STATUS.BENEFICIARY.IN_PROGRESS,
      verifiedById: adminId,
      verifiedAt: new Date(),
      latitude: -6.2088,
      longitude: 106.8456,
    })
    .returning();

  console.log(`   ✅ Beneficiary created: ${beneficiary.name}`);

  // --- 4. Create Approved Access Request ---
  console.log('📝 Creating access request...');
  const [accessRequest] = await db
    .insert(accessRequests)
    .values({
      donaturId,
      beneficiaryId: beneficiary.id,
      intention: 'Saya ingin membantu Bapak Ahmad dengan bantuan sembako',
      status: STATUS.ACCESS_REQUEST.APPROVED,
      distributionCode: 'SDK-TEST01',
      reviewedById: adminId,
      reviewedAt: new Date(),
    })
    .returning();

  console.log(`   ✅ Access request created and approved`);

  // --- 5. Create Distributions with Various Statuses ---
  console.log('📦 Creating distributions...');

  // Distribution 1: Pending Review (with proof)
  const [dist1] = await db
    .insert(distributions)
    .values({
      accessRequestId: accessRequest.id,
      donaturId,
      beneficiaryId: beneficiary.id,
      distributionCode: 'SDK-PEND1',
      proofPhotoUrl: 'https://picsum.photos/seed/proof1/400/300',
      status: STATUS.DISTRIBUTION.PENDING_REVIEW,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    })
    .returning();

  console.log(`   ✅ Distribution 1: ${dist1.distributionCode} - Pending Review`);

  // Distribution 2: Completed
  const [dist2] = await db
    .insert(distributions)
    .values({
      accessRequestId: accessRequest.id,
      donaturId,
      beneficiaryId: beneficiary.id,
      distributionCode: 'SDK-COMP1',
      proofPhotoUrl: 'https://picsum.photos/seed/proof2/400/300',
      status: STATUS.DISTRIBUTION.COMPLETED,
      verifiedById: adminId,
      verifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    })
    .returning();

  console.log(`   ✅ Distribution 2: ${dist2.distributionCode} - Completed`);

  // Distribution 3: Rejected
  const [dist3] = await db
    .insert(distributions)
    .values({
      accessRequestId: accessRequest.id,
      donaturId,
      beneficiaryId: beneficiary.id,
      distributionCode: 'SDK-REJ1',
      proofPhotoUrl: 'https://picsum.photos/seed/proof3/400/300',
      status: STATUS.DISTRIBUTION.REJECTED,
      verifiedById: adminId,
      verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      notes: 'Foto kurang jelas, mohon upload ulang',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    })
    .returning();

  console.log(`   ✅ Distribution 3: ${dist3.distributionCode} - Rejected`);

  // --- 6. Update beneficiary status for completed distribution ---
  await db
    .update(beneficiaries)
    .set({
      status: STATUS.BENEFICIARY.COMPLETED,
      updatedAt: new Date(),
    })
    .where(eq(beneficiaries.id, beneficiary.id));

  console.log(`   ✅ Beneficiary status updated to completed`);

  console.log('\n✅ Admin distribution verification test data seeded!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin:   admin@sedekahmap.id / admin123');
  console.log('   Donatur: donatur@test.id / donatur123');
  console.log('\n🔗 Test URL:');
  console.log('   http://localhost:3000/admin/distributions');
  console.log('\n📊 Test Data:');
  console.log('   - 1 distribution: Pending Review (SDK-PEND1) - ready for verification');
  console.log('   - 1 distribution: Completed (SDK-COMP1)');
  console.log('   - 1 distribution: Rejected (SDK-REJ1)');
}

// ============================================================
// EXECUTE
// ============================================================
seedAdminDistributionTest()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
