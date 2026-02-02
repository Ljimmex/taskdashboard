import { db } from '../../db'
import { webhooks, webhookQueue } from '../../db/schema'
import { sql } from 'drizzle-orm'

/**
 * Enqueues a webhook event for all active subscribers in a workspace.
 * 
 * @param event The event name (e.g., 'task.created')
 * @param payload The data to send
 * @param workspaceId The workspace scope
 */
export async function triggerWebhook(event: string, payload: any, workspaceId: string) {
    try {
        // 1. Find all active webhooks for this workspace that are subscribed to this event
        // or have '*' (wildcard) event.
        const activeWebhooks = await db.select()
            .from(webhooks)
            .where(
                sql`${webhooks.workspaceId} = ${workspaceId} 
                AND ${webhooks.isActive} = true 
                AND (${webhooks.events} @> ${JSON.stringify([event])}::jsonb OR ${webhooks.events} @> ${JSON.stringify(['*'])}::jsonb)`
            )

        if (activeWebhooks.length === 0) return

        // 2. Enqueue a job for each subscriber
        const jobs = activeWebhooks.map(webhook => ({
            webhookId: webhook.id,
            event,
            payload,
            status: 'pending' as const,
            nextRunAt: new Date()
        }))

        if (jobs.length > 0) {
            await db.insert(webhookQueue).values(jobs)
        }
    } catch (error) {
        console.error(`Failed to trigger webhook ${event}:`, error)
    }
}
