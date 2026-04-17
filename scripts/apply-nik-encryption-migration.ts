import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

async function applyMigration() {
  console.log('Applying NIK encryption migration...');

  try {
    // Add nikHash column
    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS nik_hash varchar(64);
    `);
    console.log('✓ Added nik_hash column');

    // Create unique index on nikHash
    await client.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_beneficiaries_nik_hash ON beneficiaries (nik_hash);
    `);
    console.log('✓ Created idx_beneficiaries_nik_hash index');

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
