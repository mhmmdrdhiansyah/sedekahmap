/**
 * Migration script untuk village_coordinates table
 * Run dengan: npx tsx scripts/migrate-village-coordinates.ts
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running migration: village_coordinates table...');

  try {
    // Create table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS village_coordinates (
        village_code VARCHAR(20) PRIMARY KEY,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
        source VARCHAR(50) NOT NULL DEFAULT 'nominatim',
        usage_count INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('✓ Table village_coordinates created');

    // Create index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_village_coordinates_usage ON village_coordinates(usage_count);
    `);
    console.log('✓ Index idx_village_coordinates_usage created');

    // Comments
    await db.execute(sql`
      COMMENT ON TABLE village_coordinates IS 'Cache koordinat desa dari hasil geocoding (Nominatim, dll)';
    `);
    await db.execute(sql`
      COMMENT ON COLUMN village_coordinates.village_code IS 'Kode desa dari regions table (primary key)';
    `);
    await db.execute(sql`
      COMMENT ON COLUMN village_coordinates.latitude IS 'Latitude desa';
    `);
    await db.execute(sql`
      COMMENT ON COLUMN village_coordinates.longitude IS 'Longitude desa';
    `);
    await db.execute(sql`
      COMMENT ON COLUMN village_coordinates.cached_at IS 'Waktu ketika koordinat di-cache';
    `);
    await db.execute(sql`
      COMMENT ON COLUMN village_coordinates.source IS 'Sumber data koordinat (nominatim, manual, dll)';
    `);
    await db.execute(sql`
      COMMENT ON COLUMN village_coordinates.usage_count IS 'Berapa kali koordinat ini digunakan (untuk analisis)';
    `);
    console.log('✓ Comments added');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
