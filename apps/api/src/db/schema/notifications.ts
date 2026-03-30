import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { users } from './users'

// =============================================================================
// NOTIFICATION INBOXES TABLE
// =============================================================================
// Each user has ONE record representing their "unread tray".
// This is extremely efficient for tracking unread notifications without bloating 
// the database with millions of rows for history (since history isn't requested).

export const notificationInboxes = pgTable('notification_inboxes', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),

    // unread is a JSONB array of Notification objects.
    // Structure: { id, type, title, message, link, actor, createdAt, metadata }
    unread: jsonb('unread').default([]).notNull(),

    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
})

export type NotificationInbox = typeof notificationInboxes.$inferSelect
export type NewNotificationInbox = typeof notificationInboxes.$inferInsert

export interface NotificationItem {
    id: string
    type: string
    title: string
    message: string
    link: string
    actor?: {
        name: string
        image?: string
    }
    createdAt: string
    metadata?: Record<string, any>
}
