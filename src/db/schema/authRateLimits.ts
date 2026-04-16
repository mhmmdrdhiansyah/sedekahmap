import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// ============================================================
// TABLE: auth_rate_limits
// Rate limiting untuk endpoint auth (login, register, dll)
// Menggunakan sliding window algorithm
// ============================================================
export const authRateLimits = pgTable(
  'auth_rate_limits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(), // e.g., "login:email:xxx", "register:ip:xxx"
    requestCount: integer('request_count').default(1).notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_auth_rate_limits_key').on(table.key),
    index('idx_auth_rate_limits_window_start').on(table.windowStart),
  ]
);
