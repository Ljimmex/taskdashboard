export async function prepareDiscordRequest(job: any, config: any) {
    const { event, payload } = job

    // Brand color - amber/gold to match TaskDashboard theme
    const BRAND_COLOR = 0xF59E0B

    // Helper to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
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
        'subtask.created': '🔨',
        'subtask.updated': '🛠️',
        'subtask.completed': '✅',
        'comment.added': '💬',
        'file.uploaded': '📎',
        'file.deleted': '🗑️',
        'member.added': '👋',
        'member.removed': '👋',
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
    } else if (event === 'task.created') {
        embed.title = `${emoji} Task Created`
        embed.description = `**${payload.title}**`
        embed.url = `${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.id}`

        // Use priority color from payload if available (strip # and parse hex)
        if (payload.priorityColor) {
            embed.color = parseInt(payload.priorityColor.replace('#', ''), 16)
        }

        embed.fields = [
            { name: 'Status', value: payload.statusName || payload.status, inline: true },
            { name: 'Priority', value: payload.priorityName || payload.priority, inline: true }
        ]

        if (payload.assigneeId) {
            embed.fields.push({ name: 'Assignee', value: payload.assigneeName || 'Unassigned', inline: true })
        }
    } else if (event === 'task.priority_changed') {
        embed.title = `${emoji} Priority Changed`
        embed.description = `Priority for **${payload.title}** was updated.`
        embed.url = `${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}`

        if (payload.newPriorityColor) {
            embed.color = parseInt(payload.newPriorityColor.replace('#', ''), 16)
        }

        embed.fields = [
            { name: 'Old Priority', value: payload.oldPriorityName || payload.oldPriority, inline: true },
            { name: 'New Priority', value: payload.newPriorityName || payload.newPriority, inline: true }
        ]
    } else if (event === 'task.status_changed') {
        embed.title = `${emoji} Status Changed`
        embed.description = `Status for **${payload.title}** was updated.`
        embed.url = `${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}`

        embed.fields = [
            { name: 'From', value: payload.oldStatus, inline: true },
            { name: 'To', value: payload.newStatus, inline: true }
        ]
    } else if (event === 'task.updated') {
        embed.title = `${emoji} Task Updated`
        embed.description = `**${payload.title}** was updated.`
        embed.url = `${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}`

        const changes = []
        if (payload.updatedFields?.includes('title')) changes.push('Title')
        if (payload.updatedFields?.includes('description')) changes.push('Description')
        if (payload.updatedFields?.includes('status')) changes.push('Status')

        embed.fields = [{ name: 'Changed Fields', value: changes.join(', ') || 'Details updated', inline: true }]
        if (payload.statusName) {
            embed.fields.push({ name: 'Current Status', value: payload.statusName, inline: true })
        }
    } else if (event === 'task.assigned') {
        embed.title = `${emoji} Assignee Changed`
        embed.description = `Assignee for **${payload.title}** was updated.`
        embed.url = `${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}`
        embed.fields = [{ name: 'Change', value: `${payload.oldAssignee} ➡️ ${payload.newAssignee}`, inline: true }]
    } else if (event === 'task.due_date_changed') {
        embed.title = `${emoji} Due Date Changed`
        embed.description = `Due date for **${payload.title}** was updated.`
        embed.url = `${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}`
        const oldDate = payload.oldDueDate ? new Date(payload.oldDueDate).toLocaleDateString('pl-PL') : 'None'
        const newDate = payload.newDueDate ? new Date(payload.newDueDate).toLocaleDateString('pl-PL') : 'None'
        embed.fields = [{ name: 'Change', value: `${oldDate} ➡️ ${newDate}`, inline: true }]
    } else if (event === 'subtask.created') {
        embed.title = `${emoji} Subtask Created`
        embed.description = `**${payload.title}** added to **${payload.taskTitle}**`
        embed.color = BRAND_COLOR
        embed.fields = [
            { name: 'Status', value: payload.status, inline: true },
            { name: 'Priority', value: payload.priorityName || payload.priority, inline: true }
        ]
    } else if (event === 'subtask.updated') {
        embed.title = `${emoji} Subtask Updated`
        embed.description = `Subtask **${payload.title}** in **${payload.taskTitle}** was updated.`
        if (payload.changes?.from && payload.changes?.to) {
            embed.fields = [{ name: 'Change', value: `${payload.changes.from} ➡️ ${payload.changes.to}`, inline: false }]
        }
    } else if (event === 'subtask.completed') {
        embed.title = `${emoji} Subtask Completed`
        embed.description = `✅ **${payload.title}** in **${payload.taskTitle}** was completed.`
        embed.color = 0x22C55E
    } else if (event === 'comment.added') {
        embed.title = `${emoji} New Comment`
        embed.description = payload.content ? `> ${payload.content.substring(0, 300)}` : 'A new comment was added.'
        embed.color = 0x8B5CF6 // Purple for comments

        if (payload.taskTitle) {
            embed.fields = [{ name: '📝 On Task', value: payload.taskTitle, inline: true }]
        }
    } else if (event === 'file.uploaded') {
        const fileName = payload.name || payload.fileName || 'Unknown file'
        embed.title = `${emoji} File Uploaded`
        embed.description = `**${fileName}**`
        embed.color = 0x10B981 // Green for files
        if (payload.size) {
            embed.fields = [{ name: '📦 Size', value: formatFileSize(payload.size), inline: true }]
        }
    } else if (event === 'file.deleted') {
        const fileName = payload.name || payload.fileName || 'Unknown file'
        embed.title = `${emoji} File Deleted`
        embed.description = `**${fileName}** was deleted.`
        embed.color = 0xEF4444 // Red for delete
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
