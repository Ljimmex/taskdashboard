import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import { sessions } from '../../db/schema/auth'
import { authMiddleware } from '@/middleware/auth'
import { type Auth } from '../../lib/auth'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

export const sessionsRoutes = new Hono<Env>()

sessionsRoutes.use('*', authMiddleware)

// -----------------------------------------------------------------------------
// DELETE /api/sessions/:id
// -----------------------------------------------------------------------------
sessionsRoutes.delete('/:id', async (c) => {
    const user = c.get('user')
    const sessionId = c.req.param('id')

    // Prevent deleting current session via this endpoint (should use signout)
    // Although allow it if they really want to, but client usually handles current differently.
    // The user requirement says "Log Out" button should work.

    // Check if session exists and belongs to user
    const [targetSession] = await db.select()
        .from(sessions)
        .where(and(
            eq(sessions.id, sessionId),
            eq(sessions.userId, user.id)
        ))

    if (!targetSession) {
        return c.json({ error: 'Session not found' }, 404)
    }

    // Delete it
    await db.delete(sessions)
        .where(eq(sessions.id, sessionId))

    return c.json({ success: true })
})
