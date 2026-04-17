/**
 * Cek dan apply migration auth security
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

async function checkAndApply() {
  const client = postgres(connectionString);
  const db = drizzle({ client });

  try {
    // Cek apakah kolom sudah ada
    console.log('🔍 Checking if columns exist...\n');

    const result = await db.execute(sql.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('failed_login_attempts', 'locked_until', 'last_failed_login_at')
    `));

    console.log('Query result:', result);

    const columns: string[] = [];
    if (result && Array.isArray(result)) {
      for (const row of result) {
        columns.push(row.column_name);
      }
    }
    console.log('Existing columns:', columns);

    // Add missing columns
    if (!columns.includes('failed_login_attempts')) {
      console.log('\n➕ Adding failed_login_attempts...');
      await db.execute(sql.raw('ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL'));
      console.log('  ✓ Done');
    }

    if (!columns.includes('locked_until')) {
      console.log('\n➕ Adding locked_until...');
      await db.execute(sql.raw('ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone'));
      console.log('  ✓ Done');
    }

    if (!columns.includes('last_failed_login_at')) {
      console.log('\n➕ Adding last_failed_login_at...');
      await db.execute(sql.raw('ALTER TABLE "users" ADD COLUMN "last_failed_login_at" timestamp with time zone'));
      console.log('  ✓ Done');
    }

    // Update email_verified_at for existing users
    console.log('\n📧 Updating email_verified_at for existing users...');
    const updateResult = await db.execute(sql.raw(`
      UPDATE "users"
      SET "email_verified_at" = now()
      WHERE "email_verified_at" IS NULL
    `));
    console.log(`  ✓ ${updateResult.rowCount} users updated`);

    console.log('\n✅ Migration complete! Now try seeding again.');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAndApply();
