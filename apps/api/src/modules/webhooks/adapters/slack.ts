export async function prepareSlackRequest(job: any, config: any) {
    const { event, payload } = job

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

    // Priority colors for Slack (hex format for attachment)
    const PRIORITY_COLORS: Record<string, string> = {
        urgent: '#EF4444',
        high: '#F97316',
        medium: '#F59E0B',
        low: '#22C55E',
        none: '#6B7280'
    }

    const emoji = EVENT_EMOJIS[event] || '📢'
    let text = ''
    let blocks: any[] = []
    let attachmentColor = '#F59E0B' // Default brand color

    // Format based on event type
    if (event === 'webhook.test') {
        text = `${emoji} Test Webhook - Connection successful!`
        attachmentColor = '#8B5CF6'
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Test Webhook`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: payload.message || 'This is a test notification from TaskDashboard.' }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: '*Status:*\n✅ Connection successful' },
                    { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toLocaleString('pl-PL')}` }
                ]
            }
        ]
    } else if (event.startsWith('task.')) {
        const action = event.split('.')[1]
        const actionText = action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')

        text = `${emoji} Task ${actionText}: ${payload.title || 'Untitled'}`
        attachmentColor = PRIORITY_COLORS[payload.priority] || '#F59E0B'

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Task ${actionText}`, emoji: true }
            }
        ]

        if (payload.title) {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `*${payload.title}*` }
            })
        }

        const fields = []
        if (payload.status) {
            fields.push({ type: 'mrkdwn', text: `*📊 Status:*\n\`${payload.status}\`` })
        }
        if (payload.priority) {
            const priorityEmoji = payload.priority === 'urgent' ? '🔴' :
                payload.priority === 'high' ? '🟠' :
                    payload.priority === 'medium' ? '🟡' : '🟢'
            fields.push({ type: 'mrkdwn', text: `*⚡ Priority:*\n${priorityEmoji} ${payload.priority}` })
        }
        if (payload.assignee) {
            fields.push({ type: 'mrkdwn', text: `*👤 Assignee:*\n${payload.assignee}` })
        }
        if (payload.dueDate) {
            fields.push({ type: 'mrkdwn', text: `*📅 Due Date:*\n${new Date(payload.dueDate).toLocaleDateString('pl-PL')}` })
        }

        if (fields.length > 0) {
            blocks.push({ type: 'section', fields })
        }

        if (payload.description) {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `*📝 Description:*\n${payload.description.substring(0, 200)}${payload.description.length > 200 ? '...' : ''}` }
            })
        }
    } else if (event === 'message.sent' || event === 'message.updated') {
        const content = typeof payload.message === 'string' ? payload.message : (payload.message?.content || payload.content || 'New message')
        text = `${emoji} ${event === 'message.sent' ? 'New Message' : 'Message Updated'}`
        attachmentColor = '#3B82F6'

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} ${event === 'message.sent' ? 'New Message' : 'Message Updated'}`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `> ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}` }
            }
        ]

        if (payload.sender || payload.userName) {
            blocks.splice(1, 0, {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: `*From:* ${payload.sender || payload.userName}` }]
            })
        }
    } else if (event === 'comment.added') {
        text = `${emoji} New Comment`
        attachmentColor = '#8B5CF6'

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} New Comment`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: payload.content ? `> ${payload.content.substring(0, 300)}` : 'A new comment was added.' }
            }
        ]

        if (payload.taskTitle) {
            blocks.push({
                type: 'context',
                elements: [{ type: 'mrkdwn', text: `*On Task:* ${payload.taskTitle}` }]
            })
        }
    } else if (event.startsWith('member.')) {
        const action = event.split('.')[1]
        text = `${emoji} Member ${action === 'added' ? 'Joined' : 'Left'}`
        attachmentColor = action === 'added' ? '#22C55E' : '#EF4444'

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Member ${action === 'added' ? 'Joined' : 'Left'}`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: payload.userName ? `*${payload.userName}* has ${action === 'added' ? 'joined' : 'left'} the workspace.` : `A member has ${action === 'added' ? 'joined' : 'left'}.` }
            }
        ]
    } else {
        // Generic event
        text = `${emoji} ${event.replace(/\./g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: text, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: 'New activity on TaskDashboard' }
            }
        ]
    }

    // Add footer divider and branding
    blocks.push({ type: 'divider' })
    blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: '📊 _Sent from TaskDashboard_' }]
    })

    return {
        url: config.url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TaskDashboard-Webhook-Worker/1.0'
        },
        body: JSON.stringify({
            text,
            attachments: [{
                color: attachmentColor,
                blocks
            }]
        })
    }
}
