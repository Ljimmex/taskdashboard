import { pgTable, uuid, varchar, text, timestamp, boolean, pgPolicy, jsonb } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { workspaces } from './workspaces'
import { users } from './users'
import { projects } from './projects'
import { folders } from './folders'

export const whiteboards = pgTable('whiteboards', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    data: jsonb('data').default({}).notNull(),
    createdBy: text('created_by')
        .notNull()
        .references(() => users.id),
    projectId: uuid('project_id')
        .references(() => projects.id, { onDelete: 'set null' }),
    folderId: text('folder_id')
        .references(() => folders.id, { onDelete: 'set null' }),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, () => [
    pgPolicy("Workspace members can view whiteboards", {
        for: "select",
        using: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Workspace members can create whiteboards", {
        for: "insert",
        withCheck: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Workspace members can update whiteboards", {
        for: "update",
        using: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Creator or admin can delete whiteboards", {
        for: "delete",
        using: sql`created_by = auth.uid()::text OR workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin')
        )`,
    }),
])

export const whiteboardsRelations = relations(whiteboards, ({ one }) => ({
    workspace: one(workspaces, { fields: [whiteboards.workspaceId], references: [workspaces.id] }),
    creator: one(users, { fields: [whiteboards.createdBy], references: [users.id] }),
    project: one(projects, { fields: [whiteboards.projectId], references: [projects.id] }),
    folder: one(folders, { fields: [whiteboards.folderId], references: [folders.id] }),
}))

export type Whiteboard = typeof whiteboards.$inferSelect
export type NewWhiteboard = typeof whiteboards.$inferInsert
