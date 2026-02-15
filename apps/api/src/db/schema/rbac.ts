
import { pgTable, text, timestamp, primaryKey, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'

// =============================================================================
// ROLES TABLE
// =============================================================================

export const roles = pgTable('roles', {
    id: text('id').primaryKey(), // 'owner', 'admin', 'team_lead', etc.
    name: text('name').notNull(),
    description: text('description'),
    type: text('type').notNull(), // 'global' | 'team'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, () => [
    pgPolicy('roles_read_policy', {
        for: 'select',
        to: authenticatedRole,
        using: sql`true`,
    }),
    pgPolicy('roles_admin_policy', {
        for: 'all',
        to: authenticatedRole,
        using: sql`auth.uid()::text IN (SELECT user_id FROM workspace_members WHERE role = 'owner')`, // Example check
    })
])

// =============================================================================
// PERMISSIONS TABLE
// =============================================================================

export const permissions = pgTable('permissions', {
    id: text('id').primaryKey(), // 'workspace.manageSettings', 'tasks.create', etc.
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull(), // 'workspace', 'tasks', 'projects', etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, () => [
    pgPolicy('permissions_read_policy', {
        for: 'select',
        to: authenticatedRole,
        using: sql`true`,
    })
])

// =============================================================================
// ROLE_PERMISSIONS TABLE (Many-to-Many)
// =============================================================================

export const rolePermissions = pgTable('role_permissions', {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
}, (t) => ({
    pk: primaryKey(t.roleId, t.permissionId),
    readPolicy: pgPolicy('role_permissions_read_policy', {
        for: 'select',
        to: authenticatedRole,
        using: sql`true`,
    })
}))

// =============================================================================
// RELATIONS
// =============================================================================

export const rolesRelations = relations(roles, ({ many }) => ({
    permissions: many(rolePermissions),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
    roles: many(rolePermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
    role: one(roles, {
        fields: [rolePermissions.roleId],
        references: [roles.id],
    }),
    permission: one(permissions, {
        fields: [rolePermissions.permissionId],
        references: [permissions.id],
    }),
}))
