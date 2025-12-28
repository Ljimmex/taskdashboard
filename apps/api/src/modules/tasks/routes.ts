import { Hono } from 'hono'
import { db } from '../../db'
import {
    tasks, subtasks, taskLabels, labels, taskActivityLog,
    type NewTask, type NewSubtask
} from '../../db/schema/tasks'
import { projects } from '../../db/schema/projects'
import { eq, desc, and } from 'drizzle-orm'
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
        const { projectId, status, priority, assigneeId, isArchived } = c.req.query()
        let result = await db.select().from(tasks).orderBy(desc(tasks.createdAt))
        if (projectId) result = result.filter(t => t.projectId === projectId)
        if (status) result = result.filter(t => t.status === status)
        if (priority) result = result.filter(t => t.priority === priority)
        if (assigneeId) result = result.filter(t => t.assigneeId === assigneeId)
        if (isArchived !== undefined) result = result.filter(t => t.isArchived === (isArchived === 'true'))
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching tasks:', error)
        return c.json({ success: false, error: 'Failed to fetch tasks' }, 500)
    }
})

// GET /api/tasks/:id - Get single task with subitems and labels
tasksRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Fetch subitems (full tasks with parentId = id)
        const taskSubitems = await db.select().from(tasks).where(eq(tasks.parentId, id)).orderBy(tasks.position)

        const taskLabelRelations = await db.select({ label: labels }).from(taskLabels)
            .innerJoin(labels, eq(taskLabels.labelId, labels.id)).where(eq(taskLabels.taskId, id))

        return c.json({ success: true, data: { ...task, subitems: taskSubitems, labels: taskLabelRelations.map(r => r.label) } })
    } catch (error) {
        console.error('Error fetching task:', error)
        return c.json({ success: false, error: 'Failed to fetch task' }, 500)
    }
})

// POST /api/tasks - Create task (requires tasks.create permission)
tasksRoutes.post('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get teamId from project
        const teamId = await getTeamIdFromProject(body.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateTasks(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create tasks' }, 403)
        }

        const newTask: NewTask = {
            projectId: body.projectId, title: body.title, description: body.description || null,
            status: body.status || 'todo', priority: body.priority || 'medium',
            assigneeId: body.assigneeId || null, reporterId: body.reporterId || userId,
            parentId: body.parentId || null,
            dueDate: body.dueDate ? new Date(body.dueDate) : null, estimatedHours: body.estimatedHours || null,
        }
        const [created] = await db.insert(tasks).values(newTask).returning()
        await db.insert(taskActivityLog).values({ taskId: created.id, userId: body.reporterId || userId, activityType: 'created', newValue: created.title })
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating task:', error)
        return c.json({ success: false, error: 'Failed to create task' }, 500)
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
        if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours
        if (body.progress !== undefined) updateData.progress = body.progress
        if (body.isArchived !== undefined) updateData.isArchived = body.isArchived

        const [updated] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Task not found' }, 404)
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
        const body = await c.req.json()
        const [created] = await db.insert(subtasks).values({ taskId: id, title: body.title } as NewSubtask).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating subtask:', error)
        return c.json({ success: false, error: 'Failed to create subtask' }, 500)
    }
})

tasksRoutes.patch('/:taskId/subtasks/:subtaskId', async (c) => {
    try {
        const subtaskId = c.req.param('subtaskId')
        const body = await c.req.json()
        const updateData: any = {}
        if (body.title !== undefined) updateData.title = body.title
        if (body.isCompleted !== undefined) { updateData.isCompleted = body.isCompleted; updateData.completedAt = body.isCompleted ? new Date() : null }
        if (body.position !== undefined) updateData.position = body.position
        const [updated] = await db.update(subtasks).set(updateData).where(eq(subtasks.id, subtaskId)).returning()
        if (!updated) return c.json({ success: false, error: 'Subtask not found' }, 404)
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating subtask:', error)
        return c.json({ success: false, error: 'Failed to update subtask' }, 500)
    }
})

tasksRoutes.delete('/:taskId/subtasks/:subtaskId', async (c) => {
    try {
        const subtaskId = c.req.param('subtaskId')
        const [deleted] = await db.delete(subtasks).where(eq(subtasks.id, subtaskId)).returning()
        if (!deleted) return c.json({ success: false, error: 'Subtask not found' }, 404)
        return c.json({ success: true, message: 'Subtask deleted' })
    } catch (error) {
        console.error('Error deleting subtask:', error)
        return c.json({ success: false, error: 'Failed to delete subtask' }, 500)
    }
})

// =============================================================================
// TASK LABELS (3.15)
// =============================================================================

tasksRoutes.post('/:id/labels', async (c) => {
    try {
        const id = c.req.param('id')
        const { labelId } = await c.req.json()
        await db.insert(taskLabels).values({ taskId: id, labelId })
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
        await db.delete(taskLabels).where(and(eq(taskLabels.taskId, id), eq(taskLabels.labelId, labelId)))
        return c.json({ success: true, message: 'Label removed from task' })
    } catch (error) {
        console.error('Error removing label:', error)
        return c.json({ success: false, error: 'Failed to remove label' }, 500)
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
