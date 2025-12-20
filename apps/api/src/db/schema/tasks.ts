import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'

// =============================================================================
// ENUMS
// =============================================================================

export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'done'])
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent'])

// =============================================================================
// TASKS TABLE
// =============================================================================

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').default('todo').notNull(),
    priority: taskPriorityEnum('priority').default('medium').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    reporterId: uuid('reporter_id').notNull().references(() => users.id),
    dueDate: timestamp('due_date'),
    estimatedHours: integer('estimated_hours'),
    progress: integer('progress').default(0).notNull(),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// =============================================================================
// TASK COMMENTS TABLE
// =============================================================================

export const taskComments = pgTable('task_comments', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
    assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
    reporter: one(users, { fields: [tasks.reporterId], references: [users.id] }),
    comments: many(taskComments),
}))

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
    task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
    user: one(users, { fields: [taskComments.userId], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskComment = typeof taskComments.$inferSelect
export type NewTaskComment = typeof taskComments.$inferInsert
