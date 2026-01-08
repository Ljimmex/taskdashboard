import { pgTable, uuid, text, varchar, timestamp, boolean, jsonb, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { workspaces } from './workspaces'
import { users } from './users'

// =============================================================================
// TASK TEMPLATES TABLE
// =============================================================================

// Template data structure - partial task fields
export interface TaskTemplateData {
    titlePrefix?: string
    description?: string
    type?: 'task' | 'meeting'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    labels?: string[]
    estimatedHours?: number
    subtasks?: {
        title: string
        description?: string
        priority?: string
    }[]
}

export const taskTemplates = pgTable('task_templates', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    // Template info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Template content
    templateData: jsonb('template_data').$type<TaskTemplateData>().notNull(),

    // Settings
    isActive: boolean('is_active').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Workspace members can view templates", {
        for: "select",
        using: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Workspace members can create templates", {
        for: "insert",
        withCheck: sql`workspace_id IN (
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text
        )`,
    }),
    pgPolicy("Template creators can update templates", {
        for: "update",
        using: sql`created_by = auth.uid()::text`,
    }),
    pgPolicy("Template creators can delete templates", {
        for: "delete",
        using: sql`created_by = auth.uid()::text`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const taskTemplatesRelations = relations(taskTemplates, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [taskTemplates.workspaceId],
        references: [workspaces.id]
    }),
    creator: one(users, {
        fields: [taskTemplates.createdBy],
        references: [users.id]
    }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type TaskTemplate = typeof taskTemplates.$inferSelect
export type NewTaskTemplate = typeof taskTemplates.$inferInsert
