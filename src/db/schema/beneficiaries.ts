import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  doublePrecision,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// ============================================================
// ENUM: beneficiary_status
// ============================================================
export const beneficiaryStatusEnum = pgEnum('beneficiary_status', [
  'pending',      // Menunggu approval admin
  'rejected',     // Ditolak admin
  'verified',     // Terverifikasi, tampil di peta
  'in_progress',  // Sedang dalam proses penyaluran
  'completed',    // Sudah menerima bantuan
  'expired',      // Kadaluarsa (>6 bulan), perlu re-assessment
]);

// ============================================================
// TABLE: beneficiaries
// ============================================================
export const beneficiaries = pgTable('beneficiaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  nik: text('nik').notNull(),            // ENCRYPTED — gunakan encrypt di application layer
  nikHash: varchar('nik_hash', { length: 64 }).notNull(), // SHA-256 hash untuk uniqueness check
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  needs: text('needs').notNull(),         // Deskripsi kebutuhan (sembako, obat, dll)
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  // Region data dari API wilayah.id (disimpan langsung, tidak perlu join)
  regionCode: varchar('region_code', { length: 20 }).notNull(), // Kode wilayah.id (misal "31.74.09.1001")
  regionName: varchar('region_name', { length: 255 }), // Nama desa/kelurahan (misal "Sreengseng Sawah") - nullable untuk backward compatibility
  regionPath: text('region_path'), // Full path: "DKI Jakarta > Kota Jakarta Selatan > Kec. Jagakarsa > Kel. Sreengseng Sawah"
  status: beneficiaryStatusEnum('status').default('verified').notNull(),
  verifiedById: uuid('verified_by_id'),  // FK ke users.id (verifikator)
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // Auto 6 bulan dari verifiedAt
  // Approval workflow columns
  createdById: uuid('created_by_id'),  // FK ke users.id (verifikator yang input)
  approvedById: uuid('approved_by_id'),  // FK ke users.id (admin yang approve)
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedById: uuid('rejected_by_id'),  // FK ke users.id (admin yang reject)
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  // Soft delete columns
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedById: uuid('deleted_by_id'),  // FK ke users.id (user yang menghapus)
}, (table) => [
  index('idx_beneficiaries_region_code').on(table.regionCode),
  index('idx_beneficiaries_status').on(table.status),
  index('idx_beneficiaries_verified_by_id').on(table.verifiedById),
  index('idx_beneficiaries_created_by_id').on(table.createdById),
  index('idx_beneficiaries_approved_by_id').on(table.approvedById),
  index('idx_beneficiaries_deleted_at').on(table.deletedAt),
  index('idx_beneficiaries_expires_at').on(table.expiresAt),
  index('idx_beneficiaries_lat_lng').on(table.latitude, table.longitude),
  uniqueIndex('idx_beneficiaries_nik_hash').on(table.nikHash),
]);

// ============================================================
// RELATIONS
// ============================================================
export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  verifiedBy: one(users, {
    fields: [beneficiaries.verifiedById],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [beneficiaries.createdById],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [beneficiaries.approvedById],
    references: [users.id],
  }),
  rejectedBy: one(users, {
    fields: [beneficiaries.rejectedById],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [beneficiaries.deletedById],
    references: [users.id],
  }),
}));
