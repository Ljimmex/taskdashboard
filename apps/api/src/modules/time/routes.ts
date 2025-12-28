import { Hono } from 'hono'
import { db } from '../../db'
import { timeEntries, type NewTimeEntry, tasks } from '../../db/schema/tasks'
import { projects } from '../../db/schema/projects'
import { eq, desc } from 'drizzle-orm'
import {
    canCreateTimeEntries,
    canViewAllTimeEntries,
    canManageTimeEntries,
    type TeamLevel
} from '../../lib/permissions'

export const timeRoutes = new Hono()

// Helper: Get user's team level for a project's team
async function getUserTeamLevel(userId: string, teamId: string): Promise<TeamLevel | null> {
    const member = await db.query.teamMembers.findFirst({
        where: (tm, { eq, and }) => and(eq(tm.userId, userId), eq(tm.teamId, teamId))
    })
    return (member?.teamLevel as TeamLevel) || null
}

// Helper: Get teamId from taskId
async function getTeamIdFromTask(taskId: string): Promise<string | null> {
    const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (!task) return null
    const [project] = await db.select({ teamId: projects.teamId }).from(projects).where(eq(projects.id, task.projectId)).limit(1)
    return project?.teamId || null
}

// GET /api/time - List time entries (own entries OR viewAll permission)
timeRoutes.get('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const { taskId, startDate, endDate } = c.req.query()
        const filterUserId = c.req.query('userId')

        let result = await db.select().from(timeEntries).orderBy(desc(timeEntries.startedAt))

        // Check if viewing all or filtering by specific user
        if (filterUserId && filterUserId !== userId) {
            // Need viewAll permission to see others' entries
            // For now, we'll check task-level permissions (simplified)
            if (taskId) {
                const teamId = await getTeamIdFromTask(taskId)
                if (teamId) {
                    const teamLevel = await getUserTeamLevel(userId, teamId)
                    if (!canViewAllTimeEntries(null, teamLevel)) {
                        return c.json({ success: false, error: 'Unauthorized to view all time entries' }, 403)
                    }
                }
            }
        }

        if (taskId) result = result.filter(e => e.taskId === taskId)
        if (filterUserId) result = result.filter(e => e.userId === filterUserId)
        else result = result.filter(e => e.userId === userId) // Default: own entries only
        if (startDate) result = result.filter(e => new Date(e.startedAt) >= new Date(startDate))
        if (endDate) result = result.filter(e => new Date(e.startedAt) <= new Date(endDate))

        const totalMinutes = result.reduce((sum, e) => sum + e.durationMinutes, 0)
        return c.json({ success: true, data: result, totalMinutes })
    } catch (error) {
        console.error('Error fetching time entries:', error)
        return c.json({ success: false, error: 'Failed to fetch time entries' }, 500)
    }
})

// GET /api/time/summary - Get time summary
timeRoutes.get('/summary', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const { startDate, endDate } = c.req.query()
        const filterUserId = c.req.query('userId')

        let result = await db.select().from(timeEntries)

        if (filterUserId) result = result.filter(e => e.userId === filterUserId)
        else result = result.filter(e => e.userId === userId)

        if (startDate) result = result.filter(e => new Date(e.startedAt) >= new Date(startDate))
        if (endDate) result = result.filter(e => new Date(e.startedAt) <= new Date(endDate))

        const totalMinutes = result.reduce((sum, e) => sum + e.durationMinutes, 0)
        return c.json({ success: true, totalMinutes, totalHours: Math.round(totalMinutes / 60 * 100) / 100 })
    } catch (error) {
        console.error('Error fetching time summary:', error)
        return c.json({ success: false, error: 'Failed to fetch summary' }, 500)
    }
})

// POST /api/time - Create time entry (requires timeTracking.create permission)
timeRoutes.post('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get teamId from task
        const teamId = await getTeamIdFromTask(body.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateTimeEntries(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create time entries' }, 403)
        }

        const newEntry: NewTimeEntry = {
            taskId: body.taskId,
            userId: body.userId || userId,
            description: body.description || null,
            durationMinutes: body.durationMinutes,
            startedAt: new Date(body.startedAt),
            endedAt: body.endedAt ? new Date(body.endedAt) : null,
        }
        const [created] = await db.insert(timeEntries).values(newEntry).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating time entry:', error)
        return c.json({ success: false, error: 'Failed to create time entry' }, 500)
    }
})

// POST /api/time/start - Start timer
timeRoutes.post('/start', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get teamId from task
        const teamId = await getTeamIdFromTask(body.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateTimeEntries(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to track time' }, 403)
        }

        const newEntry: NewTimeEntry = {
            taskId: body.taskId,
            userId: body.userId || userId,
            description: body.description || null,
            durationMinutes: 0,
            startedAt: new Date(),
        }
        const [created] = await db.insert(timeEntries).values(newEntry).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error starting timer:', error)
        return c.json({ success: false, error: 'Failed to start timer' }, 500)
    }
})

// PATCH /api/time/:id/stop - Stop timer
timeRoutes.patch('/:id/stop', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        // Only owner can stop their timer
        if (entry.userId !== userId) {
            return c.json({ success: false, error: 'Unauthorized to stop this timer' }, 403)
        }

        const endedAt = new Date()
        const durationMinutes = Math.round((endedAt.getTime() - new Date(entry.startedAt).getTime()) / 60000)
        const [updated] = await db.update(timeEntries).set({ endedAt, durationMinutes }).where(eq(timeEntries.id, id)).returning()
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error stopping timer:', error)
        return c.json({ success: false, error: 'Failed to stop timer' }, 500)
    }
})

// PATCH /api/time/:id - Update time entry (owner OR manage permission)
timeRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        const isOwner = entry.userId === userId

        // Get teamId from task
        const teamId = await getTeamIdFromTask(entry.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: is owner OR has manage permission
        if (!isOwner && !canManageTimeEntries(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to update time entry' }, 403)
        }

        const updateData: Partial<NewTimeEntry> = {}
        if (body.description !== undefined) updateData.description = body.description
        if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes

        const [updated] = await db.update(timeEntries).set(updateData).where(eq(timeEntries.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Time entry not found' }, 404)
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating time entry:', error)
        return c.json({ success: false, error: 'Failed to update time entry' }, 500)
    }
})

// DELETE /api/time/:id - Delete time entry (owner OR manage permission)
timeRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        const isOwner = entry.userId === userId

        // Get teamId from task
        const teamId = await getTeamIdFromTask(entry.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: is owner OR has manage permission
        if (!isOwner && !canManageTimeEntries(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete time entry' }, 403)
        }

        const [deleted] = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Time entry not found' }, 404)
        return c.json({ success: true, message: 'Time entry deleted' })
    } catch (error) {
        console.error('Error deleting time entry:', error)
        return c.json({ success: false, error: 'Failed to delete time entry' }, 500)
    }
})
