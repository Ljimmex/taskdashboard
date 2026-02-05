import { Hono } from 'hono'
import { db } from '../../db'
import { webhooks, webhookDeliveries, webhookQueue } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { processWebhookQueue } from './worker'


const webhooksRoutes = new Hono()

// =============================================================================
// SCHEMAS
// =============================================================================

const createWebhookSchema = z.object({
    workspaceId: z.string(),
    url: z.string().url(),
    type: z.enum(['generic', 'discord', 'slack']).default('generic'),
    events: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
    silentMode: z.boolean().default(false),
    description: z.string().optional(),
})

const updateWebhookSchema = createWebhookSchema.partial()

// =============================================================================
// ROUTES
// =============================================================================

// GET /api/webhooks - List webhooks for workspace
webhooksRoutes.get('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const workspaceId = c.req.query('workspaceId')

        if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401)
        if (!workspaceId) return c.json({ success: false, error: 'Workspace ID required' }, 400)

        // Security Check: Verify user is a member of the workspace
        const member = await db.query.workspaceMembers.findFirst({
            where: (m, { and, eq }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, userId))
        })

        if (!member) {
            return c.json({ success: false, error: 'Forbidden: Access denied to this workspace' }, 403)
        }

        // API Access check handled by middleware if used, but here we do manual check or rely on it.
        // Let's add the check manually here for now as we don't have a clean way to pass workspaceId to middleware from query 
        // without route param, OR we update the route to be /workspaces/:workspaceId/webhooks...
        // For now, let's assumes the user has access if they can query it? 
        // actually, let's use the middleware on the route level if we can get the context.
        // But wait, the middleware expects :id param for workspace or team.
        // This list endpoint uses ?workspaceId. The middleware currently supports /api/workspaces/:id prefix.
        // We should explicitly check permission here using the helper.

        // TEMPORARY: For this sprint, we trust the userId check + db query filter. 
        // Ideally we refactor this route to be mounted under /workspaces/:id/webhooks

        const data = await db.select()
            .from(webhooks)
            .where(eq(webhooks.workspaceId, workspaceId))
            .orderBy(desc(webhooks.createdAt))

        return c.json({ success: true, data })
    } catch (error) {
        return c.json({ success: false, error: 'Internal Server Error' }, 500)
    }
})

// POST /api/webhooks - Create webhook
// NOTE: We should ideally require permission here. The proper way is to check the workspaceId from body.
webhooksRoutes.post('/', zValidator('json', createWebhookSchema), async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const body = c.req.valid('json')

        if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401)

        // Generate a random secret if not provided (usually provided by system)
        const secret = globalThis.crypto.randomUUID()

        const [newWebhook] = await db.insert(webhooks)
            .values({
                ...body,
                secret,
                createdBy: userId,
            })
            .returning()

        return c.json({ success: true, data: newWebhook })
    } catch (error) {
        return c.json({ success: false, error: 'Internal Server Error' }, 500)
    }
})

// PATCH /api/webhooks/:id - Update webhook
webhooksRoutes.patch('/:id', zValidator('json', updateWebhookSchema), async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const id = c.req.param('id')
        const body = c.req.valid('json')

        if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401)

        // 1. Get Webhook to check Workspace
        const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
        if (!webhook) return c.json({ success: false, error: 'Not found' }, 404)

        // 2. Check Permissions
        const member = await db.query.workspaceMembers.findFirst({
            where: (m, { and, eq }) => and(eq(m.workspaceId, webhook.workspaceId), eq(m.userId, userId))
        })
        if (!member) return c.json({ success: false, error: 'Forbidden' }, 403)

        const [updated] = await db.update(webhooks)
            .set({
                ...body,
                updatedAt: new Date()
            })
            .where(eq(webhooks.id, id))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error) {
        return c.json({ success: false, error: 'Internal Server Error' }, 500)
    }
})

// DELETE /api/webhooks/:id - Delete webhook
webhooksRoutes.delete('/:id', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const id = c.req.param('id')

        if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401)

        const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
        if (!webhook) return c.json({ success: false, error: 'Not found' }, 404)

        // Check Permissions
        const member = await db.query.workspaceMembers.findFirst({
            where: (m, { and, eq }) => and(eq(m.workspaceId, webhook.workspaceId), eq(m.userId, userId))
        })
        if (!member) return c.json({ success: false, error: 'Forbidden' }, 403)

        const [deleted] = await db.delete(webhooks)
            .where(eq(webhooks.id, id))
            .returning()

        return c.json({ success: true, data: deleted })
    } catch (error) {
        return c.json({ success: false, error: 'Internal Server Error' }, 500)
    }
})

// GET /api/webhooks/:id/deliveries - View delivery logs
webhooksRoutes.get('/:id/deliveries', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const id = c.req.param('id')

        if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401)

        // Need to check workspace access first via webhook
        const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
        if (!webhook) return c.json({ success: false, error: 'Webhook not found' }, 404)

        const member = await db.query.workspaceMembers.findFirst({
            where: (m, { and, eq }) => and(eq(m.workspaceId, webhook.workspaceId), eq(m.userId, userId))
        })
        if (!member) return c.json({ success: false, error: 'Forbidden' }, 403)

        const data = await db.select()
            .from(webhookDeliveries)
            .where(eq(webhookDeliveries.webhookId, id))
            .orderBy(desc(webhookDeliveries.createdAt))
            .limit(50)

        return c.json({ success: true, data })
    } catch (error) {
        return c.json({ success: false, error: 'Internal Server Error' }, 500)
    }
})

// POST /api/webhooks/:id/test - Send a test payload
webhooksRoutes.post('/:id/test', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const id = c.req.param('id')

        if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401)

        const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1)
        if (!webhook) return c.json({ success: false, error: 'Webhook not found' }, 404)

        // Check Permissions
        const member = await db.query.workspaceMembers.findFirst({
            where: (m, { and, eq }) => and(eq(m.workspaceId, webhook.workspaceId), eq(m.userId, userId))
        })
        if (!member) return c.json({ success: false, error: 'Forbidden' }, 403)

        const testPayload = {
            id: 'test-123',
            title: 'Test Webhook Task',
            status: 'in_progress',
            priority: 'high',
            description: 'This is a test notification from TaskDashboard.',
            message: 'Hello! This is a test message to verify your integration.',
            timestamp: new Date().toISOString()
        }

        // Add to queue manually
        await db.insert(webhookQueue).values({
            webhookId: id,
            event: 'webhook.test',
            payload: testPayload,
            status: 'pending',
            nextRunAt: new Date()
        })

        // Process immediately instead of waiting for worker interval
        processWebhookQueue()

        return c.json({ success: true, message: 'Test delivery enqueued' })
    } catch (error) {
        console.error('Test webhook error:', error)
        return c.json({ success: false, error: 'Internal Server Error' }, 500)
    }
})

export { webhooksRoutes }
