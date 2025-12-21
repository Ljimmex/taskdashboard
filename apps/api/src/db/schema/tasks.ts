import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'

// =============================================================================
// ENUMS
// =============================================================================

export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'done'])
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent'])
export const activityTypeEnum = pgEnum('activity_type', [
    'created', 'updated', 'status_changed', 'assigned', 'commented',
    'label_added', 'label_removed', 'time_logged', 'archived', 'restored'
])

// =============================================================================
// TASKS TABLE
// =============================================================================

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'), // For subtask hierarchy (optional, legacy)
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
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// =============================================================================
// SUBTASKS TABLE (3.3)
// =============================================================================

export const subtasks = pgTable('subtasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
})

// =============================================================================
// LABELS TABLE (3.4)
// =============================================================================

export const labels = pgTable('labels', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    color: varchar('color', { length: 7 }).notNull().default('#6B7280'), // Hex color
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// TASK_LABELS TABLE (M:M) (3.5)
// =============================================================================

export const taskLabels = pgTable('task_labels', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    labelId: uuid('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// TASK COMMENTS TABLE (3.6)
// =============================================================================

export const taskComments = pgTable('task_comments', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'), // For threaded replies
    content: text('content').notNull(),
    likes: text('likes').default('[]').notNull(), // JSON array of user IDs who liked
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
})

// =============================================================================
// TIME ENTRIES TABLE (3.7)
// =============================================================================

export const timeEntries = pgTable('time_entries', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    description: varchar('description', { length: 255 }),
    durationMinutes: integer('duration_minutes').notNull(),
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// TASK ACTIVITY LOG TABLE (3.8)
// =============================================================================

export const taskActivityLog = pgTable('task_activity_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    activityType: activityTypeEnum('activity_type').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    metadata: text('metadata'), // JSON string for additional data
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
    assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
    reporter: one(users, { fields: [tasks.reporterId], references: [users.id] }),
    parent: one(tasks, {
        fields: [tasks.parentId],
        references: [tasks.id],
        relationName: 'task_hierarchy',
    }),
    children: many(tasks, {
        relationName: 'task_hierarchy',
    }),
    subtasks: many(subtasks), // Legacy, keeping for compatibility during transition
    labels: many(taskLabels),
    comments: many(taskComments),
    timeEntries: many(timeEntries),
    activityLog: many(taskActivityLog),
}))

export const subtasksRelations = relations(subtasks, ({ one }) => ({
    task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
}))

export const labelsRelations = relations(labels, ({ one, many }) => ({
    project: one(projects, { fields: [labels.projectId], references: [projects.id] }),
    taskLabels: many(taskLabels),
}))

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
    task: one(tasks, { fields: [taskLabels.taskId], references: [tasks.id] }),
    label: one(labels, { fields: [taskLabels.labelId], references: [labels.id] }),
}))

export const taskCommentsRelations = relations(taskComments, ({ one, many }) => ({
    task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
    user: one(users, { fields: [taskComments.userId], references: [users.id] }),
    parent: one(taskComments, {
        fields: [taskComments.parentId],
        references: [taskComments.id],
        relationName: 'comment_replies',
    }),
    replies: many(taskComments, {
        relationName: 'comment_replies',
    }),
}))

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
    task: one(tasks, { fields: [timeEntries.taskId], references: [tasks.id] }),
    user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
}))

export const taskActivityLogRelations = relations(taskActivityLog, ({ one }) => ({
    task: one(tasks, { fields: [taskActivityLog.taskId], references: [tasks.id] }),
    user: one(users, { fields: [taskActivityLog.userId], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type Subtask = typeof subtasks.$inferSelect
export type NewSubtask = typeof subtasks.$inferInsert
export type Label = typeof labels.$inferSelect
export type NewLabel = typeof labels.$inferInsert
export type TaskLabel = typeof taskLabels.$inferSelect
export type NewTaskLabel = typeof taskLabels.$inferInsert
export type TaskComment = typeof taskComments.$inferSelect
export type NewTaskComment = typeof taskComments.$inferInsert
export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert
export type TaskActivity = typeof taskActivityLog.$inferSelect
export type NewTaskActivity = typeof taskActivityLog.$inferInsert
