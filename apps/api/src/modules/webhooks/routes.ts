import { Hono } from 'hono'
import { db } from '../../db'
import { webhooks, webhookDeliveries, webhookQueue } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

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

        // The RLS handles security if using a compatible client, 
        // but here we manually check access for safety in the API layer.
        // For now, straightforward select:
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

        const [updated] = await db.update(webhooks)
            .set({
                ...body,
                updatedAt: new Date()
            })
            .where(eq(webhooks.id, id))
            .returning()

        if (!updated) return c.json({ success: false, error: 'Not found' }, 404)

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

        const [deleted] = await db.delete(webhooks)
            .where(eq(webhooks.id, id))
            .returning()

        if (!deleted) return c.json({ success: false, error: 'Not found' }, 404)

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

        return c.json({ success: true, message: 'Test delivery enqueued' })
    } catch (error) {
        console.error('Test webhook error:', error)
        return c.json({ success: false, error: 'Internal Server Error' }, 500)
    }
})

export { webhooksRoutes }
