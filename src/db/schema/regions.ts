import {
  pgTable,
  uuid,
  varchar,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// TABLE: regions
// Hierarki: Provinsi (1) > Kabupaten (2) > Kecamatan (3) > Desa (4)
// ============================================================
export const regions = pgTable('regions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(), // Kode Kemendagri, contoh: "19.04"
  name: varchar('name', { length: 255 }).notNull(),
  level: integer('level').notNull(), // 1=Provinsi, 2=Kabupaten, 3=Kecamatan, 4=Desa
  parentCode: varchar('parent_code', { length: 20 }), // NULL untuk Provinsi
}, (table) => [
  index('idx_regions_code').on(table.code),
  index('idx_regions_parent_code').on(table.parentCode),
  index('idx_regions_level').on(table.level),
]);

// ============================================================
// RELATIONS
// ============================================================
export const regionsRelations = relations(regions, ({ one, many }) => ({
  parent: one(regions, {
    fields: [regions.parentCode],
    references: [regions.code],
    relationName: 'regionHierarchy',
  }),
  children: many(regions, {
    relationName: 'regionHierarchy',
  }),
}));
