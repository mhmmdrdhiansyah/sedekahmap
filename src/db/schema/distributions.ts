import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { beneficiaries } from './beneficiaries';
import { accessRequests } from './accessRequests';

// ============================================================
// ENUM: distribution_status
// ============================================================
export const distributionStatusEnum = pgEnum('distribution_status', [
  'pending_proof',    // Menunggu donatur upload bukti foto
  'pending_review',   // Bukti sudah diupload, menunggu verifikasi admin
  'completed',        // Admin sudah verifikasi, penyaluran selesai
  'rejected',         // Admin tolak bukti (foto tidak valid)
]);

// ============================================================
// TABLE: distributions
// ============================================================
export const distributions = pgTable('distributions', {
  id: uuid('id').defaultRandom().primaryKey(),
  accessRequestId: uuid('access_request_id').notNull(),  // FK ke access_requests.id
  donaturId: uuid('donatur_id').notNull(),                // FK ke users.id
  beneficiaryId: uuid('beneficiary_id').notNull(),        // FK ke beneficiaries.id
  distributionCode: varchar('distribution_code', { length: 20 }).notNull().unique(), // SDK-XXXXXX
  proofPhotoUrl: text('proof_photo_url'),                 // NULL sampai donatur upload
  status: distributionStatusEnum('status').default('pending_proof').notNull(),
  verifiedById: uuid('verified_by_id'),                   // FK ke users.id (admin yg verifikasi)
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  notes: text('notes'),                                   // Catatan tambahan
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_distributions_access_request_id').on(table.accessRequestId),
  index('idx_distributions_donatur_id').on(table.donaturId),
  index('idx_distributions_beneficiary_id').on(table.beneficiaryId),
  index('idx_distributions_distribution_code').on(table.distributionCode),
  index('idx_distributions_status').on(table.status),
]);

// ============================================================
// RELATIONS
// ============================================================
export const distributionsRelations = relations(distributions, ({ one }) => ({
  accessRequest: one(accessRequests, {
    fields: [distributions.accessRequestId],
    references: [accessRequests.id],
  }),
  donatur: one(users, {
    fields: [distributions.donaturId],
    references: [users.id],
    relationName: 'donaturDistributions',
  }),
  beneficiary: one(beneficiaries, {
    fields: [distributions.beneficiaryId],
    references: [beneficiaries.id],
  }),
  verifiedBy: one(users, {
    fields: [distributions.verifiedById],
    references: [users.id],
    relationName: 'verifierDistributions',
  }),
}));
