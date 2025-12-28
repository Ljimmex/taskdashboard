import { Context, Next } from 'hono'
import { db } from '../db'
import { users } from '../db/schema/users'
import { eq } from 'drizzle-orm'

// Track last activity update per user to avoid too frequent DB writes
const lastUpdateCache = new Map<string, number>()
const UPDATE_INTERVAL_MS = 60 * 1000 // Update at most once per minute

export async function updateLastActivity(c: Context, next: Next) {
    const userId = c.req.header('x-user-id')

    if (userId && userId !== 'temp-user-id') {
        const now = Date.now()
        const lastUpdate = lastUpdateCache.get(userId) || 0

        // Only update if enough time has passed
        if (now - lastUpdate > UPDATE_INTERVAL_MS) {
            lastUpdateCache.set(userId, now)

            // Fire and forget - don't block the request
            db.update(users)
                .set({ lastActiveAt: new Date() })
                .where(eq(users.id, userId))
                .then(() => {
                    // console.log(`Updated lastActiveAt for user ${userId}`)
                })
                .catch((err) => {
                    console.error('Failed to update lastActiveAt:', err)
                })
        }
    }

    await next()
}
