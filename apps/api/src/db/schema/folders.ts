import { pgTable, text, timestamp, varchar, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { workspaces } from './workspaces'
import { users } from './users'


export const folders = pgTable('folders', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 255 }).notNull(),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
    parentId: text('parent_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdById: text('created_by_id').references(() => users.id),
}, (_table) => [
    pgPolicy("Workspace members can view folders", {
        for: "select",
        using: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Workspace members can create folders", {
        for: "insert",
        withCheck: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Workspace members can update folders", {
        for: "update",
        using: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Workspace members can delete folders", {
        for: "delete",
        using: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
])

export const foldersRelations = relations(folders, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [folders.workspaceId], references: [workspaces.id] }),
    parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'subfolders' }),
    subfolders: many(folders, { relationName: 'subfolders' }),
    creator: one(users, { fields: [folders.createdById], references: [users.id] }),
}))

export type Folder = typeof folders.$inferSelect
export type NewFolder = typeof folders.$inferInsert
