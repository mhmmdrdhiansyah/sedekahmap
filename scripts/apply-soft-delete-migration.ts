import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

async function applyMigration() {
  console.log('Applying soft delete migration...');

  try {
    // Add deletedAt column
    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    `);
    console.log('✓ Added deleted_at column');

    // Add deletedById column
    await client.unsafe(`
      ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS deleted_by_id uuid;
    `);
    console.log('✓ Added deleted_by_id column');

    // Create index
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_beneficiaries_deleted_at ON beneficiaries (deleted_at);
    `);
    console.log('✓ Created idx_beneficiaries_deleted_at');

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
