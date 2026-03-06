import { pgTable, uuid, varchar, text, timestamp, boolean, pgPolicy, jsonb } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { workspaces } from './workspaces'
import { users } from './users'

export const documents = pgTable('documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: jsonb('content').default({}).notNull(),
    createdBy: text('created_by')
        .notNull()
        .references(() => users.id),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, () => [
    pgPolicy("Workspace members can view documents", {
        for: "select",
        using: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Workspace members can create documents", {
        for: "insert",
        withCheck: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Workspace members can update documents", {
        for: "update",
        using: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Creator or admin can delete documents", {
        for: "delete",
        using: sql`created_by = auth.uid()::text OR workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')
        )`,
    }),
])

export const documentsRelations = relations(documents, ({ one }) => ({
    workspace: one(workspaces, { fields: [documents.workspaceId], references: [workspaces.id] }),
    creator: one(users, { fields: [documents.createdBy], references: [users.id] }),
}))

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
