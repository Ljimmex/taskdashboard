import { signWebhookPayload } from '../security'

export async function prepareGenericRequest(job: any, config: any) {
    const timestamp = Date.now()
    const signature = signWebhookPayload(job.payload, config.secret, timestamp)

    return {
        url: config.url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-TaskDashboard-Event': job.event,
            'X-TaskDashboard-Delivery': job.id,
            'X-TaskDashboard-Signature': signature,
            'X-TaskDashboard-Timestamp': timestamp.toString(),
            'User-Agent': 'TaskDashboard-Webhook-Worker/1.0'
        },
        body: JSON.stringify(job.payload)
    }
}
