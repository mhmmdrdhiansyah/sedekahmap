import {
  pgTable,
  varchar,
  doublePrecision,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';

// ============================================================
// TABLE: village_coordinates
// Cache untuk koordinat desa (geocoding result)
// Menghindari rate limit dari Nominatim API
// ============================================================
export const villageCoordinates = pgTable('village_coordinates', {
  villageCode: varchar('village_code', { length: 20 }).primaryKey(), // Kode desa dari regions table
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  cachedAt: timestamp('cached_at', { mode: 'date' }).notNull().defaultNow(),
  // Track source untuk debugging dan prioritas
  source: varchar('source', { length: 50 }).notNull().default('nominatim'), // nominatim, manual, dll
  // Track berapa kali digunakan untuk analisis
  usageCount: integer('usage_count').notNull().default(0),
}, (table) => [
  index('idx_village_coordinates_usage').on(table.usageCount),
]);
