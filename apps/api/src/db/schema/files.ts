import { pgTable, text, varchar, timestamp, integer, boolean, uuid, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'
import { teams } from './teams'
import { tasks } from './tasks'
import { workspaces } from './workspaces'
import { folders } from './folders'

// =============================================================================
// FILES TABLE
// =============================================================================

export const files = pgTable('files', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar('name', { length: 255 }).notNull(),
    path: text('path').notNull(), // Actual R2 key or path
    size: integer('size'),
    mimeType: varchar('mime_type', { length: 127 }),

    // New fields
    fileType: varchar('file_type', { length: 20 }), // e.g. 'pdf', 'png'
    r2Key: text('r2_key'),
    thumbnailUrl: text('thumbnail_url'),
    isArchived: boolean('is_archived').default(false).notNull(),

    // Relationships
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
    uploadedBy: text('uploaded_by').references(() => users.id),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Workspace members can view files", {
        for: "select",
        using: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Workspace members can create files", {
        for: "insert",
        withCheck: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Workspace members can update files", {
        for: "update",
        using: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Uploader or admin can delete files", {
        for: "delete",
        using: sql`uploaded_by = auth.uid()::text OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin'))`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const filesRelations = relations(files, ({ one, many }) => ({
    uploader: one(users, { fields: [files.uploadedBy], references: [users.id] }),
    workspace: one(workspaces, { fields: [files.workspaceId], references: [workspaces.id] }),
    team: one(teams, { fields: [files.teamId], references: [teams.id] }),
    task: one(tasks, { fields: [files.taskId], references: [tasks.id] }),
    folder: one(folders, { fields: [files.folderId], references: [folders.id] }),
    annotations: many(fileAnnotations),
}))

// =============================================================================
// TYPES
// =============================================================================

export type FileRecord = typeof files.$inferSelect
export type NewFileRecord = typeof files.$inferInsert

// =============================================================================
// FILE ANNOTATIONS TABLE
// =============================================================================

export const fileAnnotations = pgTable('file_annotations', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    fileId: text('file_id').references(() => files.id, { onDelete: 'cascade' }).notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

    // Position on document
    pageNumber: integer('page_number'), // null for text files
    positionX: integer('position_x'),   // percentage-based X coordinate (0-100)
    positionY: integer('position_y'),   // percentage-based Y coordinate (0-100)

    // Content
    content: text('content').notNull(),
    type: varchar('type', { length: 20 }).default('comment').notNull(), // 'comment' | 'highlight'

    // Threading
    parentId: text('parent_id'), // self-reference for replies

    // Status
    resolved: boolean('resolved').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Workspace members can view annotations", {
        for: "select",
        using: sql`file_id IN (SELECT id FROM files WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text))`,
    }),
    pgPolicy("Workspace members can create annotations", {
        for: "insert",
        withCheck: sql`file_id IN (SELECT id FROM files WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text))`,
    }),
    pgPolicy("Authors can update their annotations", {
        for: "update",
        using: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Authors can delete their annotations", {
        for: "delete",
        using: sql`user_id = auth.uid()::text`,
    }),
])

// =============================================================================
// FILE ANNOTATIONS RELATIONS
// =============================================================================

export const fileAnnotationsRelations = relations(fileAnnotations, ({ one, many }) => ({
    file: one(files, { fields: [fileAnnotations.fileId], references: [files.id] }),
    user: one(users, { fields: [fileAnnotations.userId], references: [users.id] }),
    parent: one(fileAnnotations, {
        fields: [fileAnnotations.parentId],
        references: [fileAnnotations.id],
        relationName: 'annotationReplies',
    }),
    replies: many(fileAnnotations, { relationName: 'annotationReplies' }),
}))

// =============================================================================
// FILE ANNOTATIONS TYPES
// =============================================================================

export type FileAnnotation = typeof fileAnnotations.$inferSelect
export type NewFileAnnotation = typeof fileAnnotations.$inferInsert

