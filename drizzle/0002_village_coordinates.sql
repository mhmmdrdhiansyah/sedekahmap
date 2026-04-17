-- ============================================================
-- Migration: Add village_coordinates table
-- Purpose: Cache koordinat desa untuk menghindari rate limit Nominatim
-- ============================================================

CREATE TABLE IF NOT EXISTS village_coordinates (
  village_code VARCHAR(20) PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source VARCHAR(50) NOT NULL DEFAULT 'nominatim',
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Index untuk query yang sering digunakan
CREATE INDEX IF NOT EXISTS idx_village_coordinates_usage ON village_coordinates(usage_count);

-- Comment untuk dokumentasi
COMMENT ON TABLE village_coordinates IS 'Cache koordinat desa dari hasil geocoding (Nominatim, dll)';
COMMENT ON COLUMN village_coordinates.village_code IS 'Kode desa dari regions table (primary key)';
COMMENT ON COLUMN village_coordinates.latitude IS 'Latitude desa';
COMMENT ON COLUMN village_coordinates.longitude IS 'Longitude desa';
COMMENT ON COLUMN village_coordinates.cached_at IS 'Waktu ketika koordinat di-cache';
COMMENT ON COLUMN village_coordinates.source IS 'Sumber data koordinat (nominatim, manual, dll)';
COMMENT ON COLUMN village_coordinates.usage_count IS 'Berapa kali koordinat ini digunakan (untuk analisis)';
