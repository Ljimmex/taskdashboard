import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum, boolean, pgPolicy, jsonb } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { projects } from './projects'
import { users } from './users'

// =============================================================================
// ENUMS
// =============================================================================

export const taskTypeEnum = pgEnum('task_type', ['task', 'meeting'])
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'done'])
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent'])
export const activityTypeEnum = pgEnum('activity_type', [
    'created', 'updated', 'status_changed', 'assigned', 'commented',
    'label_added', 'label_removed', 'time_logged', 'archived', 'restored',
    'subtask_created', 'subtask_updated', 'subtask_deleted'
])

// =============================================================================
// TASKS TABLE
// =============================================================================

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    type: taskTypeEnum('type').default('task').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: text('status').default('todo').notNull(),
    priority: taskPriorityEnum('priority').default('medium').notNull(),
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    reporterId: text('reporter_id').notNull().references(() => users.id),
    startDate: timestamp('start_date'),
    dueDate: timestamp('due_date'),
    meetingLink: varchar('meeting_link', { length: 512 }),
    estimatedHours: integer('estimated_hours'),
    progress: integer('progress').default(0).notNull(),
    position: integer('position').default(0).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    // Labels stored as JSONB array of label IDs (references workspace.labels)
    labels: text('labels').array().default([]),
    // Links stored as JSONB array of link objects
    links: jsonb('links').default([]).$type<TaskLink[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Team members can view tasks", {
        for: "select",
        using: sql`project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        )`,
    }),
    pgPolicy("Team members can create tasks", {
        for: "insert",
        withCheck: sql`project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        )`,
    }),
    pgPolicy("Team members can update tasks", {
        for: "update",
        using: sql`project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        )`,
    }),
    pgPolicy("Assignee or reporter can delete tasks", {
        for: "delete",
        using: sql`assignee_id = auth.uid()::text OR reporter_id = auth.uid()::text`,
    }),
])

// =============================================================================
// SUBTASKS TABLE (3.3)
// =============================================================================

export const subtasks = pgTable('subtasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: text('status').default('todo').notNull(),
    priority: taskPriorityEnum('priority').default('medium').notNull(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
})

// NOTE: task_labels junction table removed - labels are now stored directly on tasks.labels field

// =============================================================================
// TASK COMMENTS TABLE (3.6)
// =============================================================================

export const taskComments = pgTable('task_comments', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'), // For threaded replies
    content: text('content').notNull(),
    likes: text('likes').default('[]').notNull(), // JSON array of user IDs who liked
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
}, (_table) => [
    pgPolicy("Team members can view comments", {
        for: "select",
        using: sql`task_id IN (SELECT id FROM tasks WHERE project_id IN (
            SELECT id FROM projects WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        ))`,
    }),
    pgPolicy("Team members can create comments", {
        for: "insert",
        withCheck: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Users can delete own comments", {
        for: "delete",
        using: sql`user_id = auth.uid()::text`,
    }),
])

// =============================================================================
// TIME ENTRIES TABLE (3.7)
// =============================================================================

export const timeEntries = pgTable('time_entries', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
    subtasks: many(subtasks),
    // Note: labels are stored as text[] on tasks.labels, not as a relation
    comments: many(taskComments),
    timeEntries: many(timeEntries),
    activityLog: many(taskActivityLog),
}))

export const subtasksRelations = relations(subtasks, ({ one }) => ({
    task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
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
export type TaskComment = typeof taskComments.$inferSelect
export type NewTaskComment = typeof taskComments.$inferInsert
export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert
export type TaskActivity = typeof taskActivityLog.$inferSelect
export type NewTaskActivity = typeof taskActivityLog.$inferInsert

// Label type (matches workspace.labels JSONB structure)
export interface Label {
    id: string
    name: string
    color: string
}

// TaskLink type (for tasks.links JSONB structure)
export interface TaskLink {
    id: string
    url: string
    title?: string
    description?: string
    addedBy: string
    addedAt: string
}
