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

        if (event === 'task.status_changed') {
            fields.push({ type: 'mrkdwn', text: `*🔄 Status Change:*\n\`${payload.oldStatus}\` ➡️ \`${payload.newStatus}\`` })
        } else if (event === 'task.priority_changed') {
            fields.push({ type: 'mrkdwn', text: `*⚡ Priority Change:*\n\`${payload.oldPriority}\` ➡️ \`${payload.newPriority}\`` })
        } else if (event === 'task.due_date_changed') {
            const oldDate = payload.oldDueDate ? new Date(payload.oldDueDate).toLocaleDateString('pl-PL') : 'None'
            const newDate = payload.newDueDate ? new Date(payload.newDueDate).toLocaleDateString('pl-PL') : 'None'
            fields.push({ type: 'mrkdwn', text: `*📅 Due Date Change:*\n${oldDate} ➡️ ${newDate}` })
        } else if (event === 'task.assigned') {
            const oldName = payload.oldAssignee || 'Unassigned'
            const newName = payload.newAssignee || 'Unassigned'
            fields.push({ type: 'mrkdwn', text: `*👤 Assignee Change:*\n${oldName} ➡️ ${newName}` })
        } else if (event === 'task.updated' && payload.updatedFields) {
            const changed = payload.updatedFields.map((f: string) => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')
            fields.push({ type: 'mrkdwn', text: `*✏️ Fields Updated:*\n${changed}` })

            if (payload.updatedFields.includes('title')) {
                fields.push({ type: 'mrkdwn', text: `*Old Title:*\n${payload.oldTitle}` })
                fields.push({ type: 'mrkdwn', text: `*New Title:*\n${payload.title}` })
            }
        }

        if (payload.status && event !== 'task.status_changed') {
            fields.push({ type: 'mrkdwn', text: `*📊 Status:*\n\`${payload.status}\`` })
        }
        if (payload.priority && event !== 'task.priority_changed') {
            const priorityEmoji = payload.priority === 'urgent' ? '🔴' :
                payload.priority === 'high' ? '🟠' :
                    payload.priority === 'medium' ? '🟡' : '🟢'
            fields.push({ type: 'mrkdwn', text: `*⚡ Priority:*\n${priorityEmoji} ${payload.priority}` })
        }
        if (payload.assignee && event !== 'task.assigned') {
            fields.push({ type: 'mrkdwn', text: `*👤 Assignee:*\n${payload.assignee}` })
        }
        if (payload.dueDate && event !== 'task.due_date_changed') {
            fields.push({ type: 'mrkdwn', text: `*📅 Due Date:*\n${new Date(payload.dueDate).toLocaleDateString('pl-PL')}` })
        }

        if (fields.length > 0) {
            blocks.push({ type: 'section', fields })
        }

        if (payload.description && event === 'task.created') {
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
    } else if (event === 'file.uploaded') {
        const fileName = payload.name || payload.fileName || 'Unknown file'
        text = `${emoji} File Uploaded`
        attachmentColor = '#10B981'

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} File Uploaded`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${fileName}*` }
            }
        ]
    } else if (event === 'file.deleted') {
        const fileName = payload.name || payload.fileName || 'Unknown file'
        text = `${emoji} File Deleted`
        attachmentColor = '#EF4444'

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} File Deleted`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${fileName}* was deleted.` }
            }
        ]
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
