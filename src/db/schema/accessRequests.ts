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

// ============================================================
// ENUM: access_request_status
// ============================================================
export const accessRequestStatusEnum = pgEnum('access_request_status', [
  'pending',   // Menunggu review admin
  'approved',  // Disetujui, data terbuka untuk donatur
  'rejected',  // Ditolak
]);

// ============================================================
// TABLE: access_requests
// ============================================================
export const accessRequests = pgTable('access_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  donaturId: uuid('donatur_id').notNull(),         // FK ke users.id (donatur)
  beneficiaryId: uuid('beneficiary_id').notNull(),  // FK ke beneficiaries.id
  intention: text('intention').notNull(),            // Niat sedekah donatur
  status: accessRequestStatusEnum('status').default('pending').notNull(),
  distributionCode: varchar('distribution_code', { length: 20 }), // NULL sampai approved, format: SDK-XXXXXX
  reviewedById: uuid('reviewed_by_id'),             // FK ke users.id (admin yg review)
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),         // Alasan jika ditolak
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_access_requests_donatur_id').on(table.donaturId),
  index('idx_access_requests_beneficiary_id').on(table.beneficiaryId),
  index('idx_access_requests_status').on(table.status),
  index('idx_access_requests_distribution_code').on(table.distributionCode),
]);

// ============================================================
// RELATIONS
// ============================================================
export const accessRequestsRelations = relations(accessRequests, ({ one }) => ({
  donatur: one(users, {
    fields: [accessRequests.donaturId],
    references: [users.id],
    relationName: 'donaturRequests',
  }),
  beneficiary: one(beneficiaries, {
    fields: [accessRequests.beneficiaryId],
    references: [beneficiaries.id],
  }),
  reviewedBy: one(users, {
    fields: [accessRequests.reviewedById],
    references: [users.id],
    relationName: 'reviewerRequests',
  }),
}));
