import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { beneficiaries } from '../src/db/schema/beneficiaries';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

// Import crypto functions directly to avoid module resolution issues
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return Buffer.from(key, 'hex');
}

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

function hashNIK(nik: string): string {
  return crypto.createHash('sha256').update(nik).digest('hex');
}

async function migrateExistingNIK() {
  console.log('🔐 Migrating existing NIK to encrypted format...\n');

  try {
    // Get all beneficiaries that don't have nikHash (not yet migrated)
    const result = await client.unsafe(`
      SELECT id, nik, nik_hash
      FROM beneficiaries
      WHERE nik_hash IS NULL
    `);

    console.log(`Found ${result.length} beneficiaries to migrate\n`);

    if (result.length === 0) {
      console.log('✅ No migration needed - all NIK already encrypted');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const row of result) {
      try {
        const encryptedNIK = encrypt(row.nik);
        const nikHash = hashNIK(row.nik);

        await client.unsafe(`
          UPDATE beneficiaries
          SET nik = $1, nik_hash = $2
          WHERE id = $3
        `, [encryptedNIK, nikHash, row.id]);

        successCount++;
        console.log(`✓ Migrated beneficiary ${row.id}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to migrate beneficiary ${row.id}:`, error);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateExistingNIK()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
