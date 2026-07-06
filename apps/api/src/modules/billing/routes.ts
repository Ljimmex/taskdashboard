import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/db'
import { auth } from '@/lib/auth'
import { subscriptions, invoices } from '@/db/schema/subscriptions'
import { getUserWorkspaceRole } from '@/modules/workspaces/routes'
import { canManageWorkspaceSettings } from '@/lib/permissions'
import {
    createCheckoutSession,
    verifyPolarWebhook,
    syncSubscriptionFromPolar,
    handleSubscriptionCanceled,
    handleOrderPaid,
} from './service'
import type { SubscriptionPlan } from '@/lib/plans'

const billingRoutes = new Hono()

// =============================================================================
// POST /api/billing/checkout - Create Polar checkout session for a workspace
// =============================================================================
const checkoutSchema = z.object({
    workspaceId: z.string(),
    plan: z.enum(['plus', 'pro']),
    billingPeriod: z.enum(['month', 'year']).default('month'),
    seats: z.number().int().min(1).default(1),
    successUrl: z.string().url(),
})

billingRoutes.post('/checkout', zValidator('json', checkoutSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const body = c.req.valid('json')
    const { workspaceId, plan, billingPeriod, seats, successUrl } = body

    const workspaceRole = await getUserWorkspaceRole(session.user.id, workspaceId)
    if (!canManageWorkspaceSettings(workspaceRole)) {
        return c.json({ error: 'Only workspace owners or admins can manage billing' }, 403)
    }

    const workspace = await db.query.workspaces.findFirst({
        where: (w, { eq }) => eq(w.id, workspaceId),
    })

    if (!workspace) {
        return c.json({ error: 'Workspace not found' }, 404)
    }

    try {
        const checkout = await createCheckoutSession({
            workspaceId,
            plan: plan as Exclude<SubscriptionPlan, 'free'>,
            billingPeriod,
            seats,
            successUrl,
            customerEmail: session.user.email ?? workspace.billingEmail ?? '',
        })

        return c.json({ data: { url: checkout.url, checkoutId: checkout.id } })
    } catch (error) {
        console.error('Failed to create checkout session:', error)
        const message = error instanceof Error ? error.message : 'Checkout creation failed'
        return c.json({ error: message }, 500)
    }
})

// =============================================================================
// GET /api/billing/subscription - Current subscription for a workspace
// =============================================================================
const subscriptionQuerySchema = z.object({
    workspaceId: z.string(),
})

billingRoutes.get('/subscription', zValidator('query', subscriptionQuerySchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const { workspaceId } = c.req.valid('query')
    const workspaceRole = await getUserWorkspaceRole(session.user.id, workspaceId)
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const subscription = await db.query.subscriptions.findFirst({
        where: (s, { eq }) => eq(s.workspaceId, workspaceId),
        orderBy: [desc(subscriptions.createdAt)],
    })

    return c.json({ data: subscription })
})

// =============================================================================
// GET /api/billing/invoices - Invoices for a workspace
// =============================================================================
const invoicesQuerySchema = z.object({
    workspaceId: z.string(),
})

billingRoutes.get('/invoices', zValidator('query', invoicesQuerySchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const { workspaceId } = c.req.valid('query')
    const workspaceRole = await getUserWorkspaceRole(session.user.id, workspaceId)
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const result = await db
        .select()
        .from(invoices)
        .where(eq(invoices.workspaceId, workspaceId))
        .orderBy(desc(invoices.createdAt))

    return c.json({ data: result })
})

// =============================================================================
// POST /api/billing/webhook - Polar.sh webhook handler
// =============================================================================
billingRoutes.post('/webhook', async (c) => {
    const rawBody = await c.req.raw.text()
    const headers = Object.fromEntries(c.req.raw.headers.entries())

    const event = verifyPolarWebhook(rawBody, headers)
    if (!event) {
        return c.text('Invalid signature', 403)
    }

    try {
        switch (event.type) {
            case 'subscription.active':
            case 'subscription.created':
            case 'subscription.updated':
            case 'subscription.past_due':
            case 'subscription.uncanceled': {
                const data = event.data as { id: string }
                if (data?.id) {
                    await syncSubscriptionFromPolar(data.id)
                }
                break
            }
            case 'subscription.canceled':
            case 'subscription.revoked': {
                const data = event.data as { id: string }
                if (data?.id) {
                    await handleSubscriptionCanceled(data.id)
                }
                break
            }
            case 'order.paid': {
                await handleOrderPaid((event as any).data)
                break
            }
            case 'order.refunded':
            case 'order.updated': {
                // Placeholder:Polar refunds/updates can be handled here
                console.log(`Unhandled Polar order event: ${event.type}`)
                break
            }
            default:
                console.log(`Unhandled Polar webhook event: ${event.type}`)
        }

        return c.text('', 202)
    } catch (error) {
        console.error('Error handling Polar webhook:', error)
        return c.text('Webhook processing failed', 500)
    }
})

export { billingRoutes }
