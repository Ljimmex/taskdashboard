import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, pgPolicy, pgEnum } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'
import { tasks } from './tasks'

// =============================================================================
// CALENDAR EVENTS TABLE
// =============================================================================

export const calendarEventTypeEnum = pgEnum('calendar_event_type', ['event', 'task', 'meeting', 'reminder'])

export const calendarEvents = pgTable('calendar_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),
    allDay: boolean('all_day').default(false).notNull(),
    recurrence: jsonb('recurrence'),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    teamIds: uuid('team_ids').array().notNull(), // List of team IDs
    type: calendarEventTypeEnum('type').default('event').notNull(),
    meetingLink: varchar('meeting_link', { length: 512 }),
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Team members can view events", {
        for: "select",
        // Check if event's teamIds overlap with user's teamIds
        using: sql`team_ids && ARRAY(SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Team members can create events", {
        for: "insert",
        withCheck: sql`created_by = auth.uid()::text`,
    }),
    pgPolicy("Creator can update events", {
        for: "update",
        using: sql`created_by = auth.uid()::text`,
    }),
    pgPolicy("Creator can delete events", {
        for: "delete",
        using: sql`created_by = auth.uid()::text`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
    task: one(tasks, { fields: [calendarEvents.taskId], references: [tasks.id] }),
    creator: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type CalendarEvent = typeof calendarEvents.$inferSelect
export type NewCalendarEvent = typeof calendarEvents.$inferInsert


