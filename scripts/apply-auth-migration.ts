/**
 * Manual migration script untuk auth security tables
 * Run: npx tsx scripts/apply-auth-migration.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL!;
const sqlFile = path.join(process.cwd(), 'drizzle/manual-auth-migration.sql');

async function applyMigration() {
  console.log('🔄 Applying auth security migration...\n');

  const client = postgres(connectionString);
  const db = drizzle({ client });

  try {
    // Baca dan eksekusi SQL file
    const migrationSQL = fs.readFileSync(sqlFile, 'utf8');

    // Split per statement dan eksekusi satu per satu
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] ${statement.substring(0, 50)}...`);

      try {
        await db.execute(sql.raw(statement));
        console.log('  ✓ Success');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          console.log('  ⏭️  Already exists (skipped)');
        } else {
          console.error('  ✗ Error:', error.message);
          throw error;
        }
      }
    }

    // Update existing users untuk emailVerifiedAt
    console.log('\n📧 Backwards compatibility update...');
    await db.execute(sql.raw('UPDATE "users" SET "email_verified_at" = now() WHERE "email_verified_at" IS NULL'));
    console.log('  ✓ Done');

    console.log('\n✅ Migration applied successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
