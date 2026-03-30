import { db } from '../../db'
import { notificationInboxes, type NotificationItem } from '../../db/schema/notifications'
import { eq, sql } from 'drizzle-orm'

export const NotificationService = {
    /**
     * Pushes a new notification to a user's inbox.
     * Upserts the inbox record if it doesn't exist.
     */
    async push(userId: string, notification: Omit<NotificationItem, 'id' | 'createdAt'>) {
        try {
            const id = crypto.randomUUID()
            const createdAt = new Date().toISOString()
            const fullNotification: NotificationItem = {
                ...notification,
                id,
                createdAt
            }

            // Atomycznie dodaj do tablicy JSONB lub stwórz nowy rekord
            // Używamy jsonb_concat (||) do dołączenia nowego obiektu do tablicy.
            // PostgreSQL JSONB array manual: [obj] || array

            await db.insert(notificationInboxes)
                .values({
                    userId,
                    unread: [fullNotification],
                    lastUpdated: new Date()
                })
                .onConflictDoUpdate({
                    target: notificationInboxes.userId,
                    set: {
                        unread: sql`unread || ${JSON.stringify([fullNotification])}::jsonb`,
                        lastUpdated: new Date()
                    }
                })

            console.log(`[NotificationService] Pushed ${notification.type} to user ${userId}`)
            return id
        } catch (error) {
            console.error('[NotificationService] Failed to push notification:', error)
            return null
        }
    },

    /**
     * Marks one or more notifications as read by removing them from the JSONB array.
     */
    async markRead(userId: string, notificationIds: string[]) {
        try {
            // Używamy sql fragmentu do odfiltrowania elementów z tablicy JSONB
            // Filtrujemy tablicę zachowując tylko te, których ID NIE ma w notificationIds
            await db.update(notificationInboxes)
                .set({
                    unread: sql`(
                        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                        FROM jsonb_array_elements(unread) AS elem
                        WHERE NOT (elem->>'id' = ANY(${notificationIds}))
                    )`,
                    lastUpdated: new Date()
                })
                .where(eq(notificationInboxes.userId, userId))

            return true
        } catch (error) {
            console.error('[NotificationService] Failed to mark notifications as read:', error)
            return false
        }
    },

    /**
     * Clears all unread notifications for a user.
     */
    async clearAll(userId: string) {
        try {
            await db.update(notificationInboxes)
                .set({
                    unread: [],
                    lastUpdated: new Date()
                })
                .where(eq(notificationInboxes.userId, userId))
            return true
        } catch (error) {
            console.error('[NotificationService] Failed to clear notifications:', error)
            return false
        }
    },

    /**
     * Fetches all unread notifications for a user.
     */
    async getUnread(userId: string): Promise<NotificationItem[]> {
        const inbox = await db.query.notificationInboxes.findFirst({
            where: eq(notificationInboxes.userId, userId)
        })
        return (inbox?.unread as NotificationItem[]) || []
    }
}
