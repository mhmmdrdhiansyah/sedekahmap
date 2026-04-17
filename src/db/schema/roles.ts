import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoles } from './users';

// ============================================================
// TABLE: roles
// ============================================================
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // admin, verifikator, donatur
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_roles_name').on(table.name),
]);

// ============================================================
// TABLE: role_permissions (junction)
// ============================================================
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
}, (table) => [
  index('idx_role_permissions_role_id').on(table.roleId),
  index('idx_role_permissions_permission_id').on(table.permissionId),
]);

// ============================================================
// RELATIONS
// ============================================================
export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

// Tambahkan relation userRoles -> role
export const userRolesToRoleRelation = relations(userRoles, ({ one }) => ({
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  // permission relation didefinisikan di permissions.ts
}));
