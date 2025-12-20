import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { teams } from './teams'
import { tasks } from './tasks'

// =============================================================================
// FILES TABLE
// =============================================================================

export const files = pgTable('files', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    path: text('path').notNull(),
    size: integer('size').notNull(),
    mimeType: varchar('mime_type', { length: 127 }).notNull(),
    uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const filesRelations = relations(files, ({ one }) => ({
    uploader: one(users, { fields: [files.uploadedBy], references: [users.id] }),
    team: one(teams, { fields: [files.teamId], references: [teams.id] }),
    task: one(tasks, { fields: [files.taskId], references: [tasks.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type FileRecord = typeof files.$inferSelect
export type NewFileRecord = typeof files.$inferInsert
