import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { teams } from './teams'
import { tasks } from './tasks'

// =============================================================================
// CALENDAR EVENTS TABLE
// =============================================================================

export const calendarEvents = pgTable('calendar_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),
    allDay: boolean('all_day').default(false).notNull(),
    recurrence: jsonb('recurrence'),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
    task: one(tasks, { fields: [calendarEvents.taskId], references: [tasks.id] }),
    team: one(teams, { fields: [calendarEvents.teamId], references: [teams.id] }),
    creator: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type CalendarEvent = typeof calendarEvents.$inferSelect
export type NewCalendarEvent = typeof calendarEvents.$inferInsert
