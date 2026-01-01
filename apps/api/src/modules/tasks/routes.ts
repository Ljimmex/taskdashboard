import { Hono } from 'hono'
import { db } from '../../db'
import {
    tasks, subtasks, taskActivityLog, taskComments,
    type NewTask, type NewSubtask, type NewTaskComment
} from '../../db/schema/tasks'
import { projects, projectMembers } from '../../db/schema/projects'
import { eq, desc } from 'drizzle-orm'
import {
    canCreateTasks,
    canUpdateTasks,
    canDeleteTasks,
    canAssignTasks,
    type TeamLevel
} from '../../lib/permissions'

export const tasksRoutes = new Hono()

// Helper: Get user's team level for a project's team
async function getUserTeamLevel(userId: string, teamId: string): Promise<TeamLevel | null> {
    const member = await db.query.teamMembers.findFirst({
        where: (tm, { eq, and }) => and(eq(tm.userId, userId), eq(tm.teamId, teamId))
    })
    return (member?.teamLevel as TeamLevel) || null
}

// Helper: Get teamId from projectId
async function getTeamIdFromProject(projectId: string): Promise<string | null> {
    const [project] = await db.select({ teamId: projects.teamId }).from(projects).where(eq(projects.id, projectId)).limit(1)
    return project?.teamId || null
}

// =============================================================================
// TASKS CRUD (3.11)
// =============================================================================

// GET /api/tasks - List tasks (filtered by project membership)
tasksRoutes.get('/', async (c) => {
    try {
        const { projectId, status, priority, assigneeId, isArchived, type, workspaceSlug } = c.req.query()

        let effectiveProjectId = projectId
        if (workspaceSlug && !projectId) {
            // Find projects for this workspace
            const ws = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug)
            })
            if (ws) {
                const workspaceTeams = await db.query.teams.findMany({
                    where: (t, { eq }) => eq(t.workspaceId, ws.id)
                })
                const teamIds = workspaceTeams.map(t => t.id)
                if (teamIds.length > 0) {
                    const workspaceProjects = await db.query.projects.findMany({
                        where: (p, { inArray }) => inArray(p.teamId, teamIds)
                    })
                    const projectIds = workspaceProjects.map(p => p.id)
                    if (projectIds.length > 0) {
                        effectiveProjectId = projectIds as any // We'll handle this in the 'where' clause
                    } else {
                        return c.json({ success: true, data: [] })
                    }
                } else {
                    return c.json({ success: true, data: [] })
                }
            } else {
                return c.json({ success: true, data: [] })
            }
        }

        // Use findMany to get relations and counts
        const result = await db.query.tasks.findMany({
            where: (t, { eq, and, inArray }) => {
                const wheres: any[] = []
                if (Array.isArray(effectiveProjectId)) {
                    wheres.push(inArray(t.projectId, effectiveProjectId))
                } else if (effectiveProjectId) {
                    wheres.push(eq(t.projectId, effectiveProjectId))
                }
                if (status) wheres.push(eq(t.status, status as any))
                if (priority) wheres.push(eq(t.priority, priority as any))
                if (assigneeId) wheres.push(eq(t.assigneeId, assigneeId))
                if (type) wheres.push(eq(t.type, type as any))
                if (isArchived !== undefined) wheres.push(eq(t.isArchived, isArchived === 'true'))

                return wheres.length > 0 ? and(...wheres) : undefined
            },
            with: {
                assignee: {
                    columns: { id: true, name: true, image: true }
                },
                subtasks: true,
                comments: true,
            },
            orderBy: (t, { desc }) => [desc(t.createdAt)]
        })

        // Map data to include counts for frontend
        const dataWithCounts = result.map(task => ({
            ...task,
            subtasksCount: task.subtasks?.length || 0,
            subtasksCompleted: task.subtasks?.filter(c => c.isCompleted || c.status === 'done').length || 0,
            commentsCount: task.comments?.length || 0,
            assignee: task.assignee || null
        }))

        return c.json({ success: true, data: dataWithCounts })
    } catch (error) {
        console.error('Error fetching tasks:', error)
        return c.json({ success: false, error: 'Failed to fetch tasks' }, 500)
    }
})

// GET /api/tasks/:id - Get single task with subitems, labels, assignee, and activity
tasksRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')

        // Use query with relations to get assignee
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            with: {
                assignee: {
                    columns: { id: true, name: true, image: true }
                }
            }
        })

        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Fetch subitems (from dedicated subtasks table)
        const taskSubitems = await db.select().from(subtasks).where(eq(subtasks.taskId, id)).orderBy(subtasks.position)

        // Labels are now stored directly on task.labels as text[]

        // Fetch activity log from database
        const activities = await db.query.taskActivityLog.findMany({
            where: (a, { eq }) => eq(a.taskId, id),
            with: {
                user: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (a, { desc }) => [desc(a.createdAt)],
            limit: 20
        })

        // Map activities to frontend format
        const mappedActivities = activities.map(a => ({
            id: a.id,
            user: { id: a.user?.id || '', name: a.user?.name || 'Unknown', avatar: a.user?.image },
            type: a.activityType,
            details: a.newValue || '',
            oldValue: a.oldValue,
            timestamp: formatTimeAgo(a.createdAt)
        }))

        // Build assignees array for frontend
        const assignees = task.assignee ? [{
            id: task.assignee.id,
            name: task.assignee.name || 'Unknown',
            avatar: task.assignee.image
        }] : []

        // Fetch comments from database
        const comments = await db.query.taskComments.findMany({
            where: (c, { eq }) => eq(c.taskId, id),
            with: {
                user: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (c, { desc }) => [desc(c.createdAt)]
        })

        // Map comments to frontend format
        const mappedComments = comments.map(c => ({
            id: c.id,
            author: { id: c.user?.id || '', name: c.user?.name || 'Unknown', avatar: c.user?.image },
            content: c.content,
            likes: JSON.parse(c.likes || '[]'),
            parentId: c.parentId,
            replies: [], // Will be built into tree on frontend
            createdAt: formatTimeAgo(c.createdAt)
        }))

        return c.json({
            success: true,
            data: {
                ...task,
                subtasks: taskSubitems,
                labels: task.labels || [], // Labels are now stored directly on task as text[]
                assignees,
                activities: mappedActivities,
                comments: mappedComments
            }
        })
    } catch (error) {
        console.error('Error fetching task:', error)
        return c.json({ success: false, error: 'Failed to fetch task' }, 500)
    }
})

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'przed chwilą'
    if (minutes < 60) return `${minutes} min temu`
    if (hours < 24) return `${hours} godz. temu`
    if (days < 7) return `${days} dni temu`
    return date.toLocaleDateString('pl-PL')
}

// POST /api/tasks - Create task (requires tasks.create permission)
tasksRoutes.post('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        console.log('📝 Creating task:', { userId, title: body.title, projectId: body.projectId })

        // Get teamId from project
        const teamId = await getTeamIdFromProject(body.projectId)
        if (!teamId) {
            console.error('❌ Project not found:', body.projectId)
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)
        console.log('👤 User team level:', teamLevel)

        if (!canCreateTasks(null, teamLevel) && userId !== 'temp-user-id') {
            console.warn('🚫 Unauthorized to create tasks:', { userId, teamLevel })
            return c.json({ success: false, error: 'Unauthorized to create tasks' }, 403)
        }

        const assigneeId = body.assigneeId || (body.assignees && body.assignees.length > 0 ? body.assignees[0] : null)

        // For reporterId, if temp-user-id, try to find the first member of the team to use as reporter
        let reporterId = body.reporterId || userId
        if (reporterId === 'temp-user-id' || reporterId === '') {
            const firstMember = await db.query.teamMembers.findFirst({
                where: (tm, { eq }) => eq(tm.teamId, teamId)
            })
            if (firstMember) {
                reporterId = firstMember.userId
                console.log('ℹ️ Using fallback reporterId:', reporterId)
            }
        }

        const newTask: NewTask = {
            projectId: body.projectId,
            type: body.type || 'task',
            title: body.title,
            description: body.description || null,
            status: body.type === 'meeting' ? 'scheduled' : (body.status || 'todo'),
            priority: body.priority || 'medium',
            assigneeId,
            reporterId,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            startDate: body.startDate ? new Date(body.startDate) : null,
            meetingLink: body.meetingLink || null,
            estimatedHours: body.estimatedHours || null,
        }

        const [created] = await db.insert(tasks).values(newTask).returning()
        console.log('✅ Task created:', created.id)

        // Ensure assignee is a member of the project
        if (assigneeId) {
            const isMember = await db.query.projectMembers.findFirst({
                where: (pm, { eq, and }) => and(eq(pm.projectId, created.projectId), eq(pm.userId, assigneeId))
            })

            if (!isMember) {
                console.log('➕ Adding assignee to project members:', assigneeId)
                await db.insert(projectMembers).values({
                    projectId: created.projectId,
                    userId: assigneeId,
                    role: 'member'
                })
            }
        }

        // Handle Subtasks (using the dedicated subtasks table)
        if (body.subtasks && Array.isArray(body.subtasks)) {
            console.log('🌿 Creating subtasks:', body.subtasks.length)
            for (const sub of body.subtasks) {
                await db.insert(subtasks).values({
                    taskId: created.id,
                    title: sub.title,
                    description: sub.description || null,
                    status: sub.status || 'todo',
                    priority: sub.priority || 'medium',
                    isCompleted: sub.status === 'done' || sub.status === 'completed'
                })
            }
        }

        // Handle Labels (if provided) - update the task's labels array directly
        if (body.labels && Array.isArray(body.labels)) {
            const labelIds = body.labels.map((label: string | { id: string }) =>
                typeof label === 'string' ? label : label.id
            ).filter(Boolean)

            if (labelIds.length > 0) {
                await db.update(tasks).set({ labels: labelIds }).where(eq(tasks.id, created.id))
            }
        }

        await db.insert(taskActivityLog).values({ taskId: created.id, userId: reporterId, activityType: 'created', newValue: created.title })
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('💥 Error creating task:', error)
        return c.json({ success: false, error: 'Failed to create task', details: error instanceof Error ? error.message : String(error) }, 500)
    }
})

// PATCH /api/tasks/:id - Update task (requires tasks.update OR is assignee)
tasksRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get task
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(task.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: has update permission OR is assignee
        const isAssignee = task.assigneeId === userId
        if (!canUpdateTasks(null, teamLevel) && !isAssignee) {
            return c.json({ success: false, error: 'Unauthorized to update task' }, 403)
        }

        // Check if trying to assign - requires assign permission
        if (body.assigneeId !== undefined && body.assigneeId !== task.assigneeId) {
            if (!canAssignTasks(null, teamLevel)) {
                return c.json({ success: false, error: 'Unauthorized to assign tasks' }, 403)
            }
        }

        const updateData: any = { updatedAt: new Date() }
        if (body.title !== undefined) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.status !== undefined) updateData.status = body.status
        if (body.priority !== undefined) updateData.priority = body.priority
        if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId
        if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
        if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
        if (body.meetingLink !== undefined) updateData.meetingLink = body.meetingLink
        if (body.type !== undefined) updateData.type = body.type
        if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours
        if (body.progress !== undefined) updateData.progress = body.progress
        if (body.isArchived !== undefined) updateData.isArchived = body.isArchived
        if (body.labels !== undefined) updateData.labels = body.labels

        const [updated] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Task not found' }, 404)

        // Ensure new assignee is a member of the project
        if (body.assigneeId && body.assigneeId !== task.assigneeId) {
            const isMember = await db.query.projectMembers.findFirst({
                where: (pm, { eq, and }) => and(eq(pm.projectId, updated.projectId), eq(pm.userId, body.assigneeId))
            })

            if (!isMember) {
                console.log('➕ Adding new assignee to project members:', body.assigneeId)
                await db.insert(projectMembers).values({
                    projectId: updated.projectId,
                    userId: body.assigneeId,
                    role: 'member'
                })
            }
        }

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating task:', error)
        return c.json({ success: false, error: 'Failed to update task' }, 500)
    }
})

// DELETE /api/tasks/:id - Delete task (requires tasks.delete permission)
tasksRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'

        // Get task
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(task.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canDeleteTasks(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete task' }, 403)
        }

        const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Task not found' }, 404)
        return c.json({ success: true, message: `Task "${deleted.title}" deleted` })
    } catch (error) {
        console.error('Error deleting task:', error)
        return c.json({ success: false, error: 'Failed to delete task' }, 500)
    }
})

// =============================================================================
// TASK MOVE (3.12)
// =============================================================================

tasksRoutes.patch('/:id/move', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get task
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(task.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow move if can update tasks or is assignee
        const isAssignee = task.assigneeId === userId
        if (!canUpdateTasks(null, teamLevel) && !isAssignee) {
            return c.json({ success: false, error: 'Unauthorized to move task' }, 403)
        }

        const updateData: any = { updatedAt: new Date() }
        if (body.status) updateData.status = body.status
        if (body.position !== undefined) updateData.position = body.position

        const [updated] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Task not found' }, 404)
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error moving task:', error)
        return c.json({ success: false, error: 'Failed to move task' }, 500)
    }
})

// =============================================================================
// SUBTASKS CRUD (3.13) - Inherit permissions from parent task
// =============================================================================

tasksRoutes.get('/:id/subtasks', async (c) => {
    try {
        const id = c.req.param('id')
        const result = await db.select().from(subtasks).where(eq(subtasks.taskId, id)).orderBy(subtasks.position)
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching subtasks:', error)
        return c.json({ success: false, error: 'Failed to fetch subtasks' }, 500)
    }
})

tasksRoutes.post('/:id/subtasks', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()
        const [created] = await db.insert(subtasks).values({
            taskId: id,
            title: body.title,
            description: body.description || null,
            status: body.status || 'todo',
            priority: body.priority || 'medium',
            isCompleted: body.status === 'done' || body.status === 'completed' || body.isCompleted || false
        } as NewSubtask).returning()

        // Log activity
        await db.insert(taskActivityLog).values({
            taskId: id,
            userId: userId === 'temp-user-id' ? (await db.query.users.findFirst())?.id || 'temp-id' : userId,
            activityType: 'subtask_created',
            newValue: created.title
        })

        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating subtask:', error)
        return c.json({ success: false, error: 'Failed to create subtask' }, 500)
    }
})

tasksRoutes.patch('/:taskId/subtasks/:subtaskId', async (c) => {
    try {
        const taskId = c.req.param('taskId')
        const subtaskId = c.req.param('subtaskId')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get old version for logging
        const [oldSubtask] = await db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1)
        if (!oldSubtask) return c.json({ success: false, error: 'Subtask not found' }, 404)

        const updateData: any = { updatedAt: new Date() }
        if (body.title !== undefined) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.status !== undefined) updateData.status = body.status
        if (body.priority !== undefined) updateData.priority = body.priority
        if (body.isCompleted !== undefined) {
            updateData.isCompleted = body.isCompleted
            updateData.completedAt = body.isCompleted ? new Date() : null
            if (body.isCompleted && !body.status) updateData.status = 'done'
        }
        if (body.position !== undefined) updateData.position = body.position

        const [updated] = await db.update(subtasks).set(updateData).where(eq(subtasks.id, subtaskId)).returning()
        if (!updated) return c.json({ success: false, error: 'Subtask not found' }, 404)

        // Log activity based on what changed
        let details = ''
        const metadata: any = { subtask_id: subtaskId }

        if (body.isCompleted !== undefined && body.isCompleted !== oldSubtask.isCompleted) {
            details = body.isCompleted ? `ukończył(a) podzadanie: ${updated.title}` : `przywrócił(a) podzadanie: ${updated.title}`
        } else if (body.status !== undefined && body.status !== oldSubtask.status) {
            details = `zmienił(a) status podzadania "${updated.title}" na: ${body.status}`
            metadata.from = oldSubtask.status
            metadata.to = body.status
        } else if (body.priority !== undefined && body.priority !== oldSubtask.priority) {
            details = `zmienił(a) priorytet podzadania "${updated.title}" na: ${body.priority}`
            metadata.from = oldSubtask.priority
            metadata.to = body.priority
        } else if (body.title !== undefined && body.title !== oldSubtask.title) {
            details = `zmienił(a) nazwę podzadania z "${oldSubtask.title}" na "${updated.title}"`
        }

        if (details) {
            await db.insert(taskActivityLog).values({
                taskId: taskId,
                userId: userId === 'temp-user-id' ? (await db.query.users.findFirst())?.id || 'temp-id' : userId,
                activityType: 'subtask_updated',
                newValue: details,
                oldValue: oldSubtask.title,
                metadata: JSON.stringify(metadata)
            })
        }

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating subtask:', error)
        return c.json({ success: false, error: 'Failed to update subtask' }, 500)
    }
})

tasksRoutes.delete('/:taskId/subtasks/:subtaskId', async (c) => {
    try {
        const taskId = c.req.param('taskId')
        const subtaskId = c.req.param('subtaskId')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const [deleted] = await db.delete(subtasks).where(eq(subtasks.id, subtaskId)).returning()
        if (!deleted) return c.json({ success: false, error: 'Subtask not found' }, 404)

        // Log activity
        await db.insert(taskActivityLog).values({
            taskId: taskId,
            userId: userId === 'temp-user-id' ? (await db.query.users.findFirst())?.id || 'temp-id' : userId,
            activityType: 'subtask_deleted',
            newValue: deleted.title
        })

        return c.json({ success: true, message: 'Subtask deleted' })
    } catch (error) {
        console.error('Error deleting subtask:', error)
        return c.json({ success: false, error: 'Failed to delete subtask' }, 500)
    }
})

// =============================================================================
// TASK LABELS (3.15) - Labels are now stored directly on tasks.labels text[]
// =============================================================================

tasksRoutes.post('/:id/labels', async (c) => {
    try {
        const id = c.req.param('id')
        const { labelId } = await c.req.json()

        // Get current task and its labels
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            columns: { id: true, labels: true }
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Add label to the array if not already present
        const currentLabels = task.labels || []
        if (!currentLabels.includes(labelId)) {
            await db.update(tasks).set({ labels: [...currentLabels, labelId] }).where(eq(tasks.id, id))
        }

        return c.json({ success: true, message: 'Label added to task' }, 201)
    } catch (error) {
        console.error('Error adding label:', error)
        return c.json({ success: false, error: 'Failed to add label' }, 500)
    }
})

tasksRoutes.delete('/:id/labels/:labelId', async (c) => {
    try {
        const id = c.req.param('id')
        const labelId = c.req.param('labelId')

        // Get current task and its labels
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            columns: { id: true, labels: true }
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Remove label from the array
        const currentLabels = task.labels || []
        const newLabels = currentLabels.filter(l => l !== labelId)
        await db.update(tasks).set({ labels: newLabels }).where(eq(tasks.id, id))

        return c.json({ success: true, message: 'Label removed from task' })
    } catch (error) {
        console.error('Error removing label:', error)
        return c.json({ success: false, error: 'Failed to remove label' }, 500)
    }
})

// =============================================================================
// TASK COMMENTS (3.16)
// =============================================================================

tasksRoutes.get('/:id/comments', async (c) => {
    try {
        const id = c.req.param('id')
        const result = await db.query.taskComments.findMany({
            where: (tc, { eq }) => eq(tc.taskId, id),
            with: {
                user: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (tc, { desc }) => [desc(tc.createdAt)]
        })

        const mappedComments = result.map(c => ({
            id: c.id,
            author: { id: c.user?.id || '', name: c.user?.name || 'Unknown', avatar: c.user?.image },
            content: c.content,
            likes: JSON.parse(c.likes || '[]'),
            parentId: c.parentId,
            replies: [],
            createdAt: formatTimeAgo(c.createdAt)
        }))

        return c.json({ success: true, data: mappedComments })
    } catch (error) {
        console.error('Error fetching comments:', error)
        return c.json({ success: false, error: 'Failed to fetch comments' }, 500)
    }
})

tasksRoutes.post('/:id/comments', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const { content, parentId } = await c.req.json()

        if (!content) return c.json({ success: false, error: 'Content is required' }, 400)

        // For demo purposes, we'll try to get a valid user ID if "temp-user-id" is provided
        let effectiveUserId = userId
        if (effectiveUserId === 'temp-user-id') {
            const firstUser = await db.query.users.findFirst()
            if (firstUser) effectiveUserId = firstUser.id
        }

        const [created] = await db.insert(taskComments).values({
            taskId: id,
            userId: effectiveUserId,
            content,
            parentId: parentId || null,
            likes: '[]'
        } as NewTaskComment).returning()

        // Log activity
        await db.insert(taskActivityLog).values({
            taskId: id,
            userId: effectiveUserId,
            activityType: 'commented',
            newValue: content.slice(0, 50) + (content.length > 50 ? '...' : '')
        })

        // Fetch user for response
        const user = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, effectiveUserId),
            columns: { id: true, name: true, image: true }
        })

        const mappedComment = {
            id: created.id,
            author: { id: user?.id || '', name: user?.name || 'Unknown', avatar: user?.image },
            content: created.content,
            likes: [],
            parentId: created.parentId,
            replies: [],
            createdAt: formatTimeAgo(created.createdAt)
        }

        return c.json({ success: true, data: mappedComment }, 201)
    } catch (error) {
        console.error('Error creating comment:', error)
        return c.json({ success: false, error: 'Failed to create comment' }, 500)
    }
})

tasksRoutes.patch('/:taskId/comments/:commentId/like', async (c) => {
    try {
        const commentId = c.req.param('commentId')
        const userId = c.req.header('x-user-id') || 'temp-user-id'

        // For demo, use real user if temp
        let effectiveUserId = userId
        if (effectiveUserId === 'temp-user-id') {
            const firstUser = await db.query.users.findFirst()
            if (firstUser) effectiveUserId = firstUser.id
        }

        const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, commentId)).limit(1)
        if (!comment) return c.json({ success: false, error: 'Comment not found' }, 404)

        let likes: string[] = []
        try {
            likes = JSON.parse(comment.likes || '[]')
        } catch (e) {
            likes = []
        }

        const isLiked = likes.includes(effectiveUserId)
        const newLikes = isLiked
            ? likes.filter(id => id !== effectiveUserId)
            : [...likes, effectiveUserId]

        await db.update(taskComments)
            .set({ likes: JSON.stringify(newLikes) })
            .where(eq(taskComments.id, commentId))

        return c.json({ success: true, likes: newLikes })
    } catch (error) {
        console.error('Error liking comment:', error)
        return c.json({ success: false, error: 'Failed to like comment' }, 500)
    }
})

// =============================================================================
// TASK ACTIVITY (3.18)
// =============================================================================

tasksRoutes.get('/:id/activity', async (c) => {
    try {
        const id = c.req.param('id')
        const result = await db.select().from(taskActivityLog).where(eq(taskActivityLog.taskId, id)).orderBy(desc(taskActivityLog.createdAt))
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching activity:', error)
        return c.json({ success: false, error: 'Failed to fetch activity' }, 500)
    }
})

// =============================================================================
// BULK OPERATIONS
// =============================================================================

// POST /api/tasks/bulk/delete - Delete multiple tasks
tasksRoutes.post('/bulk/delete', async (c) => {
    try {
        const { taskIds } = await c.req.json()

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return c.json({ success: false, error: 'taskIds array is required' }, 400)
        }

        // Delete tasks one by one
        const deleted: string[] = []
        for (const taskId of taskIds) {
            try {
                await db.delete(tasks).where(eq(tasks.id, taskId))
                deleted.push(taskId)
            } catch {
                // Skip failed deletes
            }
        }

        return c.json({
            success: true,
            data: { deleted, count: deleted.length },
            message: `${deleted.length} task(s) deleted`
        })
    } catch (error) {
        console.error('Error bulk deleting tasks:', error)
        return c.json({ success: false, error: 'Failed to delete tasks' }, 500)
    }
})

// POST /api/tasks/bulk/move - Move multiple tasks to a different status/column
tasksRoutes.post('/bulk/move', async (c) => {
    try {
        const { taskIds, status } = await c.req.json()

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return c.json({ success: false, error: 'taskIds array is required' }, 400)
        }
        if (!status) {
            return c.json({ success: false, error: 'status is required' }, 400)
        }

        // Update tasks one by one
        const updated: string[] = []
        for (const taskId of taskIds) {
            try {
                await db.update(tasks).set({ status }).where(eq(tasks.id, taskId))
                updated.push(taskId)
            } catch {
                // Skip failed updates
            }
        }

        return c.json({
            success: true,
            data: { updated, count: updated.length },
            message: `${updated.length} task(s) moved to ${status}`
        })
    } catch (error) {
        console.error('Error bulk moving tasks:', error)
        return c.json({ success: false, error: 'Failed to move tasks' }, 500)
    }
})

// POST /api/tasks/bulk/archive - Archive multiple tasks
tasksRoutes.post('/bulk/archive', async (c) => {
    try {
        const { taskIds } = await c.req.json()

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return c.json({ success: false, error: 'taskIds array is required' }, 400)
        }

        // Archive tasks one by one
        const archived: string[] = []
        for (const taskId of taskIds) {
            try {
                await db.update(tasks).set({ isArchived: true }).where(eq(tasks.id, taskId))
                archived.push(taskId)
            } catch {
                // Skip failed archives
            }
        }

        return c.json({
            success: true,
            data: { archived, count: archived.length },
            message: `${archived.length} task(s) archived`
        })
    } catch (error) {
        console.error('Error bulk archiving tasks:', error)
        return c.json({ success: false, error: 'Failed to archive tasks' }, 500)
    }
})
