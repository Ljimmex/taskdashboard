import { Hono } from 'hono'
import { db } from '../../db'
import { timeEntries, type NewTimeEntry } from '../../db/schema/tasks'
import { eq, desc } from 'drizzle-orm'

export const timeRoutes = new Hono()

// GET /api/time
timeRoutes.get('/', async (c) => {
    try {
        const { taskId, userId, startDate, endDate } = c.req.query()
        let result = await db.select().from(timeEntries).orderBy(desc(timeEntries.startedAt))
        if (taskId) result = result.filter(e => e.taskId === taskId)
        if (userId) result = result.filter(e => e.userId === userId)
        if (startDate) result = result.filter(e => new Date(e.startedAt) >= new Date(startDate))
        if (endDate) result = result.filter(e => new Date(e.startedAt) <= new Date(endDate))
        const totalMinutes = result.reduce((sum, e) => sum + e.durationMinutes, 0)
        return c.json({ success: true, data: result, totalMinutes })
    } catch (error) {
        console.error('Error fetching time entries:', error)
        return c.json({ success: false, error: 'Failed to fetch time entries' }, 500)
    }
})

// GET /api/time/summary
timeRoutes.get('/summary', async (c) => {
    try {
        const { userId, startDate, endDate } = c.req.query()
        let result = await db.select().from(timeEntries)
        if (userId) result = result.filter(e => e.userId === userId)
        if (startDate) result = result.filter(e => new Date(e.startedAt) >= new Date(startDate))
        if (endDate) result = result.filter(e => new Date(e.startedAt) <= new Date(endDate))
        const totalMinutes = result.reduce((sum, e) => sum + e.durationMinutes, 0)
        return c.json({ success: true, totalMinutes, totalHours: Math.round(totalMinutes / 60 * 100) / 100 })
    } catch (error) {
        console.error('Error fetching time summary:', error)
        return c.json({ success: false, error: 'Failed to fetch summary' }, 500)
    }
})

// POST /api/time
timeRoutes.post('/', async (c) => {
    try {
        const body = await c.req.json()
        const newEntry: NewTimeEntry = {
            taskId: body.taskId,
            userId: body.userId,
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

// POST /api/time/start
timeRoutes.post('/start', async (c) => {
    try {
        const body = await c.req.json()
        const newEntry: NewTimeEntry = {
            taskId: body.taskId,
            userId: body.userId,
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

// PATCH /api/time/:id/stop
timeRoutes.patch('/:id/stop', async (c) => {
    try {
        const id = c.req.param('id')
        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)
        const endedAt = new Date()
        const durationMinutes = Math.round((endedAt.getTime() - new Date(entry.startedAt).getTime()) / 60000)
        const [updated] = await db.update(timeEntries).set({ endedAt, durationMinutes }).where(eq(timeEntries.id, id)).returning()
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error stopping timer:', error)
        return c.json({ success: false, error: 'Failed to stop timer' }, 500)
    }
})

// PATCH /api/time/:id
timeRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
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

// DELETE /api/time/:id
timeRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const [deleted] = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Time entry not found' }, 404)
        return c.json({ success: true, message: 'Time entry deleted' })
    } catch (error) {
        console.error('Error deleting time entry:', error)
        return c.json({ success: false, error: 'Failed to delete time entry' }, 500)
    }
})
