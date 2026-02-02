export async function prepareSlackRequest(job: any, config: any) {
    const { event, payload } = job

    let text = `*Event:* ${event}`
    let blocks: any[] = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Event Triggered:* ${event}`
            }
        }
    ]

    if (event.startsWith('task.')) {
        text = `Task ${event.split('.')[1]}: ${payload.title || 'Untitled'}`
        blocks.push({
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*Task:* ${payload.title || 'Untitled'}` },
                { type: 'mrkdwn', text: `*Status:* ${payload.status || 'N/A'}` },
                { type: 'mrkdwn', text: `*Priority:* ${payload.priority || 'N/A'}` },
                { type: 'mrkdwn', text: `*ID:* ${payload.id || 'N/A'}` }
            ]
        })
    } else if (event === 'message.sent') {
        text = 'New message on TaskDashboard'
        const content = typeof payload.message === 'string' ? payload.message : (payload.message?.content || 'New message')
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Message Content:*\n> ${content}`
            }
        })
    }

    blocks.push({
        type: 'context',
        elements: [
            { type: 'mrkdwn', text: `_Sent from TaskDashboard Webhooks_` }
        ]
    })

    return {
        url: config.url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TaskDashboard-Webhook-Worker/1.0'
        },
        body: JSON.stringify({
            text, // Fallback text for notifications
            blocks
        })
    }
}
