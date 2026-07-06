import { Polar } from '@polar-sh/sdk'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { workspaces } from '@/db/schema/workspaces'
import { subscriptions, invoices, subscriptionEvents } from '@/db/schema/subscriptions'
import { getPlanLimits, type SubscriptionPlan } from '@/lib/plans'

// =============================================================================
// Polar client
// =============================================================================

export const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
    server: process.env.POLAR_ENV === 'production' ? 'production' : 'sandbox',
})

export const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET ?? ''

// Product IDs configured in Polar.sh dashboard (one per plan & billing period)
export const POLAR_PRODUCTS: Record<
    Exclude<SubscriptionPlan, 'free' | 'enterprise'>,
    { monthlyProductId?: string; yearlyProductId?: string }
> = {
    plus: {
        monthlyProductId: process.env.POLAR_PLUS_MONTHLY_PRODUCT_ID,
        yearlyProductId: process.env.POLAR_PLUS_YEARLY_PRODUCT_ID,
    },
    pro: {
        monthlyProductId: process.env.POLAR_PRO_MONTHLY_PRODUCT_ID,
        yearlyProductId: process.env.POLAR_PRO_YEARLY_PRODUCT_ID,
    },
}

// =============================================================================
// Checkout
// =============================================================================

export async function createCheckoutSession({
    workspaceId,
    plan,
    billingPeriod = 'month',
    seats,
    successUrl,
    customerEmail,
}: {
    workspaceId: string
    plan: Exclude<SubscriptionPlan, 'free'>
    billingPeriod?: 'month' | 'year'
    seats: number
    successUrl: string
    customerEmail: string
}) {
    const config = POLAR_PRODUCTS[plan as 'plus' | 'pro']
    const productId = billingPeriod === 'year' ? config.yearlyProductId : config.monthlyProductId

    if (!productId) {
        throw new Error(`No Polar product configured for plan ${plan} / period ${billingPeriod}`)
    }

    const checkout = await polar.checkouts.create({
        products: [productId],
        successUrl,
        customerEmail,
        seats,
        metadata: {
            workspaceId,
            plan,
        },
    })

    return checkout
}

// =============================================================================
// Webhook verification
// =============================================================================

export function verifyPolarWebhook(rawBody: string, headers: Record<string, string>) {
    if (!POLAR_WEBHOOK_SECRET) {
        throw new Error('POLAR_WEBHOOK_SECRET is not configured')
    }
    try {
        return validateEvent(rawBody, headers, POLAR_WEBHOOK_SECRET)
    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            return null
        }
        throw error
    }
}

// =============================================================================
// Subscription synchronization
// =============================================================================

export async function syncSubscriptionFromPolar(polarSubscriptionId: string) {
    const polarSub = await polar.subscriptions.get({ id: polarSubscriptionId })

    const workspaceId = (polarSub.metadata?.workspaceId as string | undefined)
    if (!workspaceId) {
        console.warn(`Polar subscription ${polarSubscriptionId} has no workspaceId metadata`)
        return null
    }

    const plan = (polarSub.product?.metadata?.plan as SubscriptionPlan) ?? 'plus'
    const status = mapPolarStatus(polarSub.status)
    const billingDay = new Date(polarSub.currentPeriodStart).getUTCDate()
    const polarPriceId = polarSub.prices[0]?.id ?? null
    const seatPriceCents = polarSub.amount ?? getPlanLimits(plan).monthlySeatPriceCents ?? 0

    const result = await db.transaction(async (tx) => {
        // Upsert subscription record
        const [existing] = await tx
            .select({ id: subscriptions.id })
            .from(subscriptions)
            .where(eq(subscriptions.polarSubscriptionId, polarSubscriptionId))
            .limit(1)

        const subData = {
            workspaceId,
            polarSubscriptionId,
            polarCustomerId: polarSub.customerId,
            polarProductId: polarSub.productId,
            polarPriceId,
            plan,
            status,
            billingDay,
            currentSeats: polarSub.seats ?? 1,
            seatPriceCents,
            currency: polarSub.currency ?? 'USD',
            currentPeriodStart: new Date(polarSub.currentPeriodStart),
            currentPeriodEnd: new Date(polarSub.currentPeriodEnd),
            cancelAtPeriodEnd: polarSub.cancelAtPeriodEnd,
            updatedAt: new Date(),
        }

        let subscription
        if (existing) {
            ;[subscription] = await tx
                .update(subscriptions)
                .set(subData)
                .where(eq(subscriptions.id, existing.id))
                .returning()
        } else {
            ;[subscription] = await tx
                .insert(subscriptions)
                .values({ ...subData, createdAt: new Date() })
                .returning()
        }

        // Update workspace subscription fields
        await tx
            .update(workspaces)
            .set({
                subscriptionPlan: plan,
                subscriptionStatus: status,
                polarCustomerId: polarSub.customerId,
                polarSubscriptionId,
                billingDay,
                currentSeatCount: polarSub.seats ?? 1,
                updatedAt: new Date(),
            })
            .where(eq(workspaces.id, workspaceId))

        return subscription
    })

    return result
}

export async function handleSubscriptionCanceled(polarSubscriptionId: string) {
    const result = await db.transaction(async (tx) => {
        const [sub] = await tx
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.polarSubscriptionId, polarSubscriptionId))
            .limit(1)

        if (!sub) return null

        await tx
            .update(subscriptions)
            .set({ status: 'cancelled', cancelAtPeriodEnd: true, updatedAt: new Date() })
            .where(eq(subscriptions.id, sub.id))

        await tx
            .update(workspaces)
            .set({ subscriptionStatus: 'cancelled', updatedAt: new Date() })
            .where(eq(workspaces.id, sub.workspaceId))

        return sub
    })

    return result
}

export async function handleOrderPaid(order: any) {
    const workspaceId = order.metadata?.workspaceId as string | undefined
    if (!workspaceId) return null

    const polarSubscriptionId = order.subscriptionId as string | undefined

    const [existing] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.polarInvoiceId, order.id))
        .limit(1)

    const subscriptionRow = polarSubscriptionId
        ? await db
            .select({ id: subscriptions.id })
            .from(subscriptions)
            .where(eq(subscriptions.polarSubscriptionId, polarSubscriptionId))
            .limit(1)
        : []

    const invoiceStatus: 'pending' | 'paid' = order.paid === true ? 'paid' : 'pending'

    const invoiceData = {
        workspaceId,
        subscriptionId: subscriptionRow[0]?.id ?? null,
        polarInvoiceId: order.id,
        polarOrderId: order.id,
        status: invoiceStatus,
        amountCents: order.totalAmount,
        currency: (order.currency as string) ?? 'USD',
        description: order.description,
        paidAt: invoiceStatus === 'paid' ? new Date() : null,
        updatedAt: new Date(),
    }

    if (existing) {
        return (await db.update(invoices).set(invoiceData).where(eq(invoices.id, existing.id)).returning())[0]
    }

    return (await db.insert(invoices).values({ ...invoiceData, createdAt: new Date() }).returning())[0]
}

export async function recordSeatChange({
    subscriptionId,
    workspaceId,
    type,
    seatsDelta,
    seatsAfter,
    amountCents,
    currency,
    description,
}: {
    subscriptionId: string
    workspaceId: string
    type: 'seat_added' | 'seat_removed'
    seatsDelta: number
    seatsAfter: number
    amountCents?: number
    currency?: string
    description?: string
}) {
    await db.insert(subscriptionEvents).values({
        subscriptionId,
        workspaceId,
        type,
        seatsDelta,
        seatsAfter,
        amountCents,
        currency,
        description,
    })
}

// =============================================================================
// Helpers
// =============================================================================

function mapPolarStatus(polarStatus: string): 'active' | 'trial' | 'expired' | 'cancelled' | 'past_due' {
    switch (polarStatus) {
        case 'active':
            return 'active'
        case 'trialing':
            return 'trial'
        case 'past_due':
            return 'past_due'
        case 'cancelled':
        case 'canceled':
            return 'cancelled'
        case 'expired':
            return 'expired'
        default:
            return 'active'
    }
}
