
import { pgTable, text, timestamp, jsonb, index, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { users } from './users'
import { workspaces } from './workspaces'

export const auditLogs = pgTable('audit_logs', {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }), // User who performed action
    action: text('action').notNull(), // e.g. 'project.create', 'member.update_role'
    entityType: text('entity_type').notNull(), // 'project', 'task', 'member'
    entityId: text('entity_id').notNull(), // ID of the affected entity
    details: jsonb('details'), // { old: {}, new: {} } - stores diff or metadata
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    workspaceIdx: index('audit_logs_workspace_idx').on(table.workspaceId),
    entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    actorIdx: index('audit_logs_actor_idx').on(table.actorId),
    createdIdx: index('audit_logs_created_idx').on(table.createdAt),
    // Policies
    insertPolicy: pgPolicy('audit_insert', {
        for: 'insert',
        to: authenticatedRole,
        withCheck: sql`true` // Allow services/authenticated users to log actions
    }),
    readPolicy: pgPolicy('audit_read', {
        for: 'select',
        to: authenticatedRole,
        using: sql`exists (
            select 1 from workspace_members 
            where workspace_id = ${table.workspaceId} 
            and user_id = auth.uid()::text
            and (role = 'owner' or role = 'admin')
        )`
    })
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [auditLogs.workspaceId],
        references: [workspaces.id],
    }),
    actor: one(users, {
        fields: [auditLogs.actorId],
        references: [users.id],
    }),
}))
