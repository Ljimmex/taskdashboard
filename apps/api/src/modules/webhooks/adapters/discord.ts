export async function prepareDiscordRequest(job: any, config: any) {
    const { event, payload } = job

    // Brand color - amber/gold to match TaskDashboard theme
    const BRAND_COLOR = 0xF59E0B

    // Priority colors
    const PRIORITY_COLORS: Record<string, number> = {
        urgent: 0xEF4444,  // Red
        high: 0xF97316,    // Orange
        medium: 0xF59E0B,  // Amber
        low: 0x22C55E,     // Green
        none: 0x6B7280     // Gray
    }

    // Event emoji mapping
    const EVENT_EMOJIS: Record<string, string> = {
        'task.created': '📝',
        'task.updated': '✏️',
        'task.deleted': '🗑️',
        'task.status_changed': '🔄',
        'task.priority_changed': '⚡',
        'task.assigned': '👤',
        'task.due_date_changed': '📅',
        'comment.added': '💬',
        'file.uploaded': '📎',
        'file.deleted': '🗑️',
        'member.added': '👋',
        'member.removed': '👋',
        'message.sent': '💬',
        'message.updated': '✏️',
        'message.deleted': '🗑️',
        'webhook.test': '🧪'
    }

    const emoji = EVENT_EMOJIS[event] || '📢'

    let embed: any = {
        color: BRAND_COLOR,
        timestamp: new Date().toISOString(),
        footer: {
            text: '📊 TaskDashboard'
        }
    }

    // Format based on event type
    if (event === 'webhook.test') {
        embed.title = `${emoji} Test Webhook`
        embed.description = payload.message || 'This is a test notification from TaskDashboard.'
        embed.color = 0x8B5CF6 // Purple for test
        embed.fields = [
            { name: '📍 Status', value: '✅ Connection successful', inline: true },
            { name: '⏰ Timestamp', value: new Date().toLocaleString('pl-PL'), inline: true }
        ]
    } else if (event.startsWith('task.')) {
        const action = event.split('.')[1]
        const actionText = action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')

        embed.title = `${emoji} Task ${actionText}`
        embed.description = payload.title ? `**${payload.title}**` : undefined
        embed.color = PRIORITY_COLORS[payload.priority] || BRAND_COLOR

        const fields = []

        if (payload.status) {
            fields.push({ name: '📊 Status', value: `\`${payload.status}\``, inline: true })
        }
        if (payload.priority) {
            const priorityEmoji = payload.priority === 'urgent' ? '🔴' :
                payload.priority === 'high' ? '🟠' :
                    payload.priority === 'medium' ? '🟡' : '🟢'
            fields.push({ name: '⚡ Priority', value: `${priorityEmoji} ${payload.priority}`, inline: true })
        }
        if (payload.assignee) {
            fields.push({ name: '👤 Assignee', value: payload.assignee, inline: true })
        }
        if (payload.dueDate) {
            fields.push({ name: '📅 Due Date', value: new Date(payload.dueDate).toLocaleDateString('pl-PL'), inline: true })
        }
        if (payload.description) {
            fields.push({ name: '📝 Description', value: payload.description.substring(0, 200) + (payload.description.length > 200 ? '...' : ''), inline: false })
        }

        if (fields.length > 0) {
            embed.fields = fields
        }
    } else if (event === 'message.sent' || event === 'message.updated') {
        embed.title = `${emoji} ${event === 'message.sent' ? 'New Message' : 'Message Updated'}`
        const content = typeof payload.message === 'string' ? payload.message : (payload.message?.content || payload.content || 'New message')
        embed.description = content.length > 300 ? content.substring(0, 300) + '...' : content
        embed.color = 0x3B82F6 // Blue for messages

        if (payload.sender || payload.userName) {
            embed.author = {
                name: payload.sender || payload.userName
            }
        }
    } else if (event === 'message.deleted') {
        embed.title = `${emoji} Message Deleted`
        embed.description = 'A message was deleted from the conversation.'
        embed.color = 0xEF4444 // Red for delete
    } else if (event === 'comment.added') {
        embed.title = `${emoji} New Comment`
        embed.description = payload.content ? `> ${payload.content.substring(0, 300)}` : 'A new comment was added.'
        embed.color = 0x8B5CF6 // Purple for comments

        if (payload.taskTitle) {
            embed.fields = [{ name: '📝 On Task', value: payload.taskTitle, inline: true }]
        }
    } else if (event === 'file.uploaded') {
        embed.title = `${emoji} File Uploaded`
        embed.description = payload.fileName ? `**${payload.fileName}**` : 'A new file was uploaded.'
        embed.color = 0x10B981 // Green for files
    } else if (event.startsWith('member.')) {
        const action = event.split('.')[1]
        embed.title = `${emoji} Member ${action === 'added' ? 'Joined' : 'Left'}`
        embed.description = payload.userName ? `**${payload.userName}** has ${action === 'added' ? 'joined' : 'left'} the workspace.` : `A member has ${action === 'added' ? 'joined' : 'left'}.`
        embed.color = action === 'added' ? 0x22C55E : 0xEF4444
    } else {
        // Generic event
        embed.title = `${emoji} ${event.replace(/\./g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`
        embed.description = 'New activity on TaskDashboard'
    }

    // Debug: Log silentMode value
    console.log(`[Discord Adapter] Event: ${event}, silentMode: ${config.silentMode}`)

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
