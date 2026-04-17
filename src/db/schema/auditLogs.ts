import { pgTable, pgEnum, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// ============================================================
// ENUM: audit_action
// ============================================================
export const auditActionEnum = pgEnum('audit_action', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'SOFT_DELETE',
  'RESTORE',
]);

// ============================================================
// TABLE: audit_logs
// ============================================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // Who performed the action
  action: auditActionEnum('action').notNull(),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  recordId: uuid('record_id').notNull(),
  oldValues: jsonb('old_values'), // MUST NOT contain NIK plain text
  newValues: jsonb('new_values'), // MUST NOT contain NIK plain text
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_audit_logs_user_id').on(table.userId),
  index('idx_audit_logs_table_record').on(table.tableName, table.recordId),
  index('idx_audit_logs_action').on(table.action),
  index('idx_audit_logs_created_at').on(table.createdAt),
]);
