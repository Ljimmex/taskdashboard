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
        'calendar.created': '📅',
        'calendar.updated': '✏️',
        'calendar.deleted': '🗑️',
        'member.added': '👋',
        'member.removed': '👋',
        'webhook.test': '🧪'
    }

    // Helper to safely parse color
    const parseColor = (colorStr?: string): string => {
        if (!colorStr) return '#F59E0B' // Default brand color
        // Validate hex
        return /^#[0-9A-F]{6}$/i.test(colorStr) ? colorStr : '#F59E0B'
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
        text = `${emoji} Task Created: ${payload.title || 'Unknown Task'}`
        attachmentColor = parseColor(payload.priorityColor)

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Task Created`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.id}|${payload.title || 'Unknown Task'}>*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Status:*\n${payload.statusName || payload.status || 'None'}` },
                    { type: 'mrkdwn', text: `*Priority:*\n${payload.priorityName || payload.priority || 'None'}` }
                ]
            }
        ]

        if (payload.assigneeId) {
            blocks[2].fields?.push({ type: 'mrkdwn', text: `*Assignee:*\n${payload.assigneeName || 'Unassigned'}` })
        }
    } else if (event === 'task.status_changed') {
        text = `${emoji} Status Changed: ${payload.title || 'Unknown Task'}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Status Changed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title || 'Unknown Task'}>*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*From:*\n${payload.oldStatus || 'None'}` },
                    { type: 'mrkdwn', text: `*To:*\n${payload.newStatus || 'None'}` }
                ]
            }
        ]
    } else if (event === 'task.priority_changed') {
        text = `${emoji} Priority Changed: ${payload.title || 'Unknown Task'}`
        attachmentColor = parseColor(payload.newPriorityColor)
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Priority Changed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title || 'Unknown Task'}>*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Old:*\n${payload.oldPriorityName || payload.oldPriority || 'None'}` },
                    { type: 'mrkdwn', text: `*New:*\n${payload.newPriorityName || payload.newPriority || 'None'}` }
                ]
            }
        ]
    } else if (event === 'task.updated') {
        text = `${emoji} Task Updated: ${payload.title || 'Unknown Task'}`
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
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title || 'Unknown Task'}>*` }
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
        text = `${emoji} Assignee Changed: ${payload.title || 'Unknown Task'}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Assignee Changed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title || 'Unknown Task'}>*` }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Change:* ${payload.oldAssignees || 'Unassigned'} ➡️ ${payload.newAssignees || 'Unassigned'}` }
            }
        ]
    } else if (event === 'task.due_date_changed') {
        text = `${emoji} Due Date Updated: ${payload.title || 'Unknown Task'}`
        const oldDate = payload.oldDueDate ? new Date(payload.oldDueDate).toLocaleDateString('pl-PL') : 'None'
        const newDate = payload.newDueDate ? new Date(payload.newDueDate).toLocaleDateString('pl-PL') : 'None'
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Due Date Updated`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*<${config.appUrl}/workspaces/${job.workspaceId}/tasks/${payload.taskId}|${payload.title || 'Unknown Task'}>*` }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Change:* ${oldDate} ➡️ ${newDate}` }
            }
        ]
    } else if (event === 'subtask.created') {
        text = `${emoji} Subtask Created: ${payload.title || 'Unknown Subtask'}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Subtask Created`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${payload.title || 'Unknown Subtask'}* in *${payload.taskTitle || 'Unknown Task'}*` }
            }
        ]
    } else if (event === 'subtask.updated') {
        text = `${emoji} Subtask Updated: ${payload.title || 'Unknown Subtask'}`
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Subtask Updated`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${payload.title || 'Unknown Subtask'}* in *${payload.taskTitle || 'Unknown Task'}*` }
            }
        ]
        if (payload.changes?.from) {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `*Change:* ${payload.changes.from} ➡️ ${payload.changes.to}` }
            })
        } else {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `*Details updated*` }
            })
        }
    } else if (event === 'subtask.completed') {
        text = `${emoji} Subtask Completed: ${payload.title || 'Unknown Subtask'}`
        attachmentColor = '#10B981'
        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Subtask Completed`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `✅ *${payload.title || 'Unknown Subtask'}* in *${payload.taskTitle || 'Unknown Task'}* was completed.` }
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
                elements: [{ type: 'mrkdwn', text: `*On Task:* ${payload.taskTitle || 'Unknown Task'}` }]
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
    } else if (event.startsWith('calendar.')) {
        const action = event.split('.')[1]
        text = `${emoji} Event ${action === 'created' ? 'Created' : action === 'updated' ? 'Updated' : 'Deleted'}: ${payload.title}`
        attachmentColor = action === 'deleted' ? '#EF4444' : '#3B82F6'

        const formatTime = (iso: string) => {
            if (!iso) return '?'
            return new Date(iso).toLocaleString('pl-PL', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })
        }

        blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Event ${action === 'created' ? 'Created' : action === 'updated' ? 'Updated' : 'Deleted'}`, emoji: true }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*${payload.title}*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Start:*\n${formatTime(payload.startAt)}` },
                    { type: 'mrkdwn', text: `*End:*\n${formatTime(payload.endAt)}` }
                ]
            }
        ]

        if (action !== 'deleted') {
            // Add Link button accessory potentially, or just link in title
            // Slack doesn't support links in header
        }

        if (payload.location) {
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `*📍 Location:* ${payload.location}` }
            })
        }
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
