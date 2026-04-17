import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { rolePermissions } from './roles';

// ============================================================
// TABLE: permissions
// ============================================================
export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), // e.g. "beneficiary:create"
  description: text('description'),
  module: varchar('module', { length: 50 }).notNull(), // e.g. "beneficiary", "access_request", "distribution", "user"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_permissions_name').on(table.name),
  index('idx_permissions_module').on(table.module),
]);

// ============================================================
// RELATIONS
// ============================================================
export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

// Tambahkan relation rolePermissions -> permission
export const rolePermissionsToPermissionRelation = relations(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));
