import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

async function applyMigration() {
  console.log('Applying audit logs migration...');

  try {
    // Create audit_action enum
    await client.unsafe(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM (
          'CREATE',
          'UPDATE',
          'DELETE',
          'APPROVE',
          'REJECT',
          'SOFT_DELETE',
          'RESTORE'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Created audit_action enum');

    // Create audit_logs table
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        action audit_action NOT NULL,
        table_name varchar(50) NOT NULL,
        record_id uuid NOT NULL,
        old_values jsonb,
        new_values jsonb,
        ip_address varchar(45),
        user_agent text,
        created_at timestamp with time zone NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created audit_logs table');

    // Create indexes
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
    `);
    console.log('✓ Created idx_audit_logs_user_id');

    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs (table_name, record_id);
    `);
    console.log('✓ Created idx_audit_logs_table_record');

    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
    `);
    console.log('✓ Created idx_audit_logs_action');

    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
    `);
    console.log('✓ Created idx_audit_logs_created_at');

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
