export async function prepareDiscordRequest(job: any, config: any) {
    const { event, payload } = job
    let embed: any = {
        title: `Event: ${event}`,
        description: 'New activity on TaskDashboard',
        color: 0x3B82F6, // Default blue
        timestamp: new Date().toISOString(),
        footer: {
            text: 'TaskDashboard Webhooks'
        }
    }

    // Custom formatting based on event types
    if (event.startsWith('task.')) {
        embed.title = `Task ${event.split('.')[1]}: ${payload.title || 'Untitled'}`
        embed.fields = [
            { name: 'Status', value: payload.status || 'N/A', inline: true },
            { name: 'Priority', value: payload.priority || 'N/A', inline: true },
        ]
        if (payload.id) {
            embed.url = `https://taskdashboard.io/tasks/${payload.id}` // Placeholder URL
        }

        // Color based on priority
        if (payload.priority === 'urgent') embed.color = 0xEF4444 // Red
        else if (payload.priority === 'high') embed.color = 0xF59E0B // Orange
    } else if (event === 'message.sent') {
        embed.title = 'New Message Sent'
        embed.description = typeof payload.message === 'string' ? payload.message : (payload.message?.content || 'New message')
        embed.fields = [
            { name: 'Conversation ID', value: payload.conversationId || 'N/A', inline: true }
        ]
    } else if (event.startsWith('member.')) {
        embed.title = `Member ${event.split('.')[1]}`
        embed.description = `User ${payload.userId || 'unknown'} has ${event.split('.')[1]}ed the workspace.`
    }

    // Debug: Log silentMode value
    console.log(`[Discord Adapter] silentMode = ${config.silentMode} (type: ${typeof config.silentMode})`)

    // Build the body - only add flags if silentMode is explicitly true
    const body: any = { embeds: [embed] }
    if (config.silentMode === true) {
        body.flags = 4096 // SUPPRESS_NOTIFICATIONS flag
    }

    return {
        url: config.url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TaskDashboard-Webhook-Worker/1.0'
        },
        body: JSON.stringify(body)
    }
}

