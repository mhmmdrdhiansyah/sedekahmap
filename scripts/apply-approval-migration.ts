import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

async function applyMigration() {
  console.log('Applying approval workflow migration...');

  try {
    // Add 'pending' and 'rejected' to beneficiary_status enum
    await client.unsafe(`
      ALTER TYPE "beneficiary_status" ADD VALUE IF NOT EXISTS 'pending' BEFORE 'verified';
    `);
    console.log('✓ Added pending status');

    await client.unsafe(`
      ALTER TYPE "beneficiary_status" ADD VALUE IF NOT EXISTS 'rejected' BEFORE 'verified';
    `);
    console.log('✓ Added rejected status');

    // Add new columns to beneficiaries table
    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS created_by_id uuid;
    `);
    console.log('✓ Added created_by_id column');

    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS approved_by_id uuid;
    `);
    console.log('✓ Added approved_by_id column');

    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
    `);
    console.log('✓ Added approved_at column');

    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS rejected_by_id uuid;
    `);
    console.log('✓ Added rejected_by_id column');

    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone;
    `);
    console.log('✓ Added rejected_at column');

    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS rejection_reason text;
    `);
    console.log('✓ Added rejection_reason column');

    // Create indexes
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_beneficiaries_created_by_id ON beneficiaries USING btree (created_by_id);
    `);
    console.log('✓ Created idx_beneficiaries_created_by_id');

    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_beneficiaries_approved_by_id ON beneficiaries USING btree (approved_by_id);
    `);
    console.log('✓ Created idx_beneficiaries_approved_by_id');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
