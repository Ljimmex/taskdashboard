import { Hono } from 'hono'
import { NotificationService } from './service'
import { type Auth } from '../../lib/auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

export const notificationRoutes = new Hono<Env>()

// GET /api/notifications - Fetch all unread notifications for current user
notificationRoutes.get('/', async (c) => {
    try {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const unread = await NotificationService.getUnread(user.id)
        return c.json({ success: true, data: unread })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return c.json({ success: false, error: 'Failed to fetch notifications' }, 500)
    }
})

// PATCH /api/notifications/read - Mark one or more notifications as read
const readSchema = z.object({
    ids: z.array(z.string())
})

notificationRoutes.patch('/read', zValidator('json', readSchema), async (c) => {
    try {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        const { ids } = c.req.valid('json')
        await NotificationService.markRead(user.id, ids)

        return c.json({ success: true })
    } catch (error) {
        console.error('Error marking notifications as read:', error)
        return c.json({ success: false, error: 'Failed to mark notifications as read' }, 500)
    }
})

// PATCH /api/notifications/read-all - Clear all notifications
notificationRoutes.patch('/read-all', async (c) => {
    try {
        const user = c.get('user')
        if (!user) return c.json({ error: 'Unauthorized' }, 401)

        await NotificationService.clearAll(user.id)
        return c.json({ success: true })
    } catch (error) {
        console.error('Error clearing notifications:', error)
        return c.json({ success: false, error: 'Failed to clear notifications' }, 500)
    }
})
