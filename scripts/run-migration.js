/**
 * Run village_coordinates migration using postgres directly
 */

const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/sedekahmap';

async function migrate() {
  const sql = postgres(connectionString);

  try {
    console.log('Running migration: village_coordinates table...');

    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS village_coordinates (
        village_code VARCHAR(20) PRIMARY KEY,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
        source VARCHAR(50) NOT NULL DEFAULT 'nominatim',
        usage_count INTEGER NOT NULL DEFAULT 0
      );
    `;
    console.log('✓ Table village_coordinates created');

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_village_coordinates_usage ON village_coordinates(usage_count);
    `;
    console.log('✓ Index idx_village_coordinates_usage created');

    // Comments
    await sql`
      COMMENT ON TABLE village_coordinates IS 'Cache koordinat desa dari hasil geocoding (Nominatim, dll)';
    `;
    await sql`
      COMMENT ON COLUMN village_coordinates.village_code IS 'Kode desa dari regions table (primary key)';
    `;
    await sql`
      COMMENT ON COLUMN village_coordinates.latitude IS 'Latitude desa';
    `;
    await sql`
      COMMENT ON COLUMN village_coordinates.longitude IS 'Longitude desa';
    `;
    await sql`
      COMMENT ON COLUMN village_coordinates.cached_at IS 'Waktu ketika koordinat di-cache';
    `;
    await sql`
      COMMENT ON COLUMN village_coordinates.source IS 'Sumber data koordinat (nominatim, manual, dll)';
    `;
    await sql`
      COMMENT ON COLUMN village_coordinates.usage_count IS 'Berapa kali koordinat ini digunakan (untuk analisis)';
    `;
    console.log('✓ Comments added');

    console.log('Migration completed successfully!');

    // Verify table exists
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'village_coordinates';
    `;
    console.log('Verification:', tables.length > 0 ? 'Table exists!' : 'Table not found');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

migrate();
