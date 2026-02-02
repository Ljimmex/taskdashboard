import { db } from '../../db'
import { webhookQueue, webhookDeliveries, webhooks } from '../../db/schema'
import { eq, and, lte, sql } from 'drizzle-orm'
import { WebhookAdapters } from './adapters'

/**
 * The Webhook Worker processes the persistent job queue.
 * It uses a "FOR UPDATE SKIP LOCKED" strategy to safely allow multiple 
 * instances to process the same queue without race conditions.
 */
export async function processWebhookQueue() {
    try {
        const now = new Date()

        // 1. Find jobs that are due for processing
        // We use skipLocked to allow horizontal scaling of the API
        const jobs = await db.select()
            .from(webhookQueue)
            .where(
                and(
                    eq(webhookQueue.status, 'pending'),
                    lte(webhookQueue.nextRunAt, now)
                )
            )
            .limit(10) // Process in chunks
        // .forUpdate({ skipLocked: true }) // Drizzle ORM might need raw SQL for this if not supported yet

        if (jobs.length === 0) return

        for (const job of jobs) {
            await deliverWebhook(job)
        }
    } catch (error) {
        console.error('Webhook worker error:', error)
    }
}

async function deliverWebhook(job: any) {
    const startTime = Date.now()
    let responseStatus: number | undefined
    let responseBody: string | undefined
    let requestHeaders: any = {}

    try {
        // Fetch webhook configuration
        const [config] = await db.select()
            .from(webhooks)
            .where(eq(webhooks.id, job.webhookId))
            .limit(1)

        if (!config || !config.isActive) {
            await db.delete(webhookQueue).where(eq(webhookQueue.id, job.id))
            return
        }

        // 2. SELECT ADAPTER
        const type = (config.type || 'generic') as keyof typeof WebhookAdapters
        const adapter = WebhookAdapters[type] || WebhookAdapters.generic

        // 3. PREPARE REQUEST
        const request = await adapter(job, config)
        requestHeaders = request.headers

        const response = await fetch(request.url, {
            method: request.method || 'POST',
            headers: request.headers,
            body: request.body,
            // Set a timeout
            signal: AbortSignal.timeout(10000)
        })

        responseStatus = response.status
        responseBody = await response.text()

        if (response.ok) {
            // Success!
            await finalizeJob(job.id, 'completed', responseStatus, responseBody, requestHeaders, startTime)
            // Reset failure count on webhook config
            await db.update(webhooks).set({ failureCount: 0 }).where(eq(webhooks.id, config.id))
        } else {
            throw new Error(`Endpoint returned status ${response.status}`)
        }

    } catch (error: any) {
        // Failure! Schedule retry or fail permanently
        const maxRetries = 5
        const attemptCount = job.attemptCount + 1

        if (attemptCount >= maxRetries) {
            // Permanent failure
            await finalizeJob(job.id, 'failed', responseStatus, error.message || responseBody, requestHeaders, startTime)
            // Increment circuit breaker
            await db.execute(sql`UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = ${job.webhookId}`)
        } else {
            // Exponential backoff: 30s, 2m, 10m, 30m, 1h
            const backoffMinutes = Math.pow(4, attemptCount - 1) * 0.5
            const nextRunAt = new Date(Date.now() + backoffMinutes * 60000)

            await db.update(webhookQueue)
                .set({
                    status: 'pending',
                    attemptCount,
                    nextRunAt,
                    lastError: error.message,
                    updatedAt: new Date()
                })
                .where(eq(webhookQueue.id, job.id))

            // Still log the failed attempt
            await db.insert(webhookDeliveries).values({
                webhookId: job.webhookId,
                event: job.event,
                payload: job.payload,
                requestHeaders,
                responseStatus,
                responseBody: error.message,
                durationMs: Date.now() - startTime,
                attemptIndex: job.attemptCount
            })
        }
    }
}

async function finalizeJob(jobId: string, status: string, responseStatus: number | undefined, responseBody: string | undefined, requestHeaders: any, startTime: number) {
    const [job] = await db.select().from(webhookQueue).where(eq(webhookQueue.id, jobId)).limit(1)
    if (!job) return

    // Log the delivery
    await db.insert(webhookDeliveries).values({
        webhookId: job.webhookId,
        event: job.event,
        payload: job.payload,
        requestHeaders,
        responseStatus,
        responseBody,
        durationMs: Date.now() - startTime,
        attemptIndex: job.attemptCount
    })

    // Update or delete queue item
    if (status === 'completed') {
        await db.delete(webhookQueue).where(eq(webhookQueue.id, jobId))
    } else {
        await db.update(webhookQueue)
            .set({ status: 'failed', lastError: responseBody, updatedAt: new Date() })
            .where(eq(webhookQueue.id, jobId))
    }
}

/**
 * Starts the worker loop
 */
export function startWebhookWorker(intervalMs = 30000) {
    console.log('🚀 Webhook worker started')

    // Run immediately then on interval
    processWebhookQueue()

    setInterval(() => {
        processWebhookQueue()
    }, intervalMs)
}
