import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { distributions } from './distributions';
import { users } from './users';

// ============================================================
// TABLE: reviews
// ============================================================
export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  distributionId: uuid('distribution_id').notNull(),  // FK ke distributions.id
  donaturId: uuid('donatur_id').notNull(),             // FK ke users.id
  rating: integer('rating').notNull(),                 // 1-5 (validasi di application layer)
  content: text('content').notNull(),                  // Isi ulasan
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_reviews_distribution_id').on(table.distributionId),
  index('idx_reviews_donatur_id').on(table.donaturId),
  index('idx_reviews_rating').on(table.rating),
]);

// ============================================================
// RELATIONS
// ============================================================
export const reviewsRelations = relations(reviews, ({ one }) => ({
  distribution: one(distributions, {
    fields: [reviews.distributionId],
    references: [distributions.id],
  }),
  donatur: one(users, {
    fields: [reviews.donaturId],
    references: [users.id],
  }),
}));
