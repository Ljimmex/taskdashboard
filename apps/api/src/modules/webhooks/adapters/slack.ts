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
    } else if (event === 'task.created') {
        text = `${emoji} Task Created: ${payload.title}`
        attachmentColor = payload.priorityColor || '#F59E0B'

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Task Created`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.id}|${payload.title}>*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Status:*\n${payload.statusName || payload.status}` },
                    { type: 'mrkdwn', text: `*Priority:*\n${payload.priorityName || payload.priority}` }
                ]
            }
        ]

        if (payload.assigneeId) {
            blocks[2].fields?.push({ type: 'mrkdwn', text: `*Assignee:*\n${payload.assigneeName || 'Unassigned'}` })
        }
    } else if (event === 'task.status_changed') {
        text = `${emoji} Status Changed: ${payload.title}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Status Changed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title}>*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*From:*\n${payload.oldStatus}` },
                    { type: 'mrkdwn', text: `*To:*\n${payload.newStatus}` }
                ]
            }
        ]
    } else if (event === 'task.priority_changed') {
        text = `${emoji} Priority Changed: ${payload.title}`
        attachmentColor = payload.newPriorityColor || '#F59E0B'
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Priority Changed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title}>*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Old:*\n${payload.oldPriorityName || payload.oldPriority}` },
                    { type: 'mrkdwn', text: `*New:*\n${payload.newPriorityName || payload.newPriority}` }
                ]
            }
        ]
    } else if (event === 'task.updated') {
        text = `${emoji} Task Updated: ${payload.title}`
        const changes = []
        if (payload.updatedFields?.includes('title')) changes.push('Title')
        if (payload.updatedFields?.includes('description')) changes.push('Description')
        if (payload.updatedFields?.includes('status')) changes.push('Status')

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Task Updated`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title}>*` }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Changed Fields:* ${changes.join(', ') || 'Details'}` }
            }
        ]
        if (payload.statusName) {
            blocks.push({
                type: 'section',
                fields: [{ type: 'mrkdwn', text: `*Current Status:*\n${payload.statusName}` }]
            })
        }
    } else if (event === 'task.assigned') {
        text = `${emoji} Assignee Changed: ${payload.title}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Assignee Changed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title}>*` }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Change:* ${payload.oldAssignee} ➡️ ${payload.newAssignee}` }
            }
        ]
    } else if (event === 'task.due_date_changed') {
        text = `${emoji} Due Date Updated: ${payload.title}`
        const oldDate = payload.oldDueDate ? new Date(payload.oldDueDate).toLocaleDateString('pl-PL') : 'None'
        const newDate = payload.newDueDate ? new Date(payload.newDueDate).toLocaleDateString('pl-PL') : 'None'
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Due Date Updated`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title}>*` }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Change:* ${oldDate} ➡️ ${newDate}` }
            }
        ]
    } else if (event === 'subtask.created') {
        text = `${emoji} Subtask Created: ${payload.title}`
        attachmentColor = '#10B981'
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Subtask Created`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${payload.title}* in *${payload.taskTitle}*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Status:*\n${payload.status}` },
                    { type: 'mrkdwn', text: `*Priority:*\n${payload.priorityName || payload.priority}` }
                ]
            }
        ]
    } else if (event === 'subtask.updated') {
        text = `${emoji} Subtask Updated: ${payload.title}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Subtask Updated`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${payload.title}* in *${payload.taskTitle}*` }
            }
        ]
        if (payload.changes?.from) {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `*Change:* ${payload.changes.from} ➡️ ${payload.changes.to}` }
            })
        }
    } else if (event === 'subtask.completed') {
        text = `${emoji} Subtask Completed: ${payload.title}`
        attachmentColor = '#10B981'
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Subtask Completed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `✅ *${payload.title}* in *${payload.taskTitle}* was completed.` }
            }
        ]
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
