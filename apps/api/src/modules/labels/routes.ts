import { Hono } from 'hono'
import { db } from '../../db'
import { labels, type NewLabel } from '../../db/schema/tasks'
import { eq } from 'drizzle-orm'

export const labelsRoutes = new Hono()

// GET /api/labels
labelsRoutes.get('/', async (c) => {
    try {
        const projectId = c.req.query('projectId')
        if (!projectId) return c.json({ success: false, error: 'projectId is required' }, 400)
        const result = await db.select().from(labels).where(eq(labels.projectId, projectId)).orderBy(labels.name)
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching labels:', error)
        return c.json({ success: false, error: 'Failed to fetch labels' }, 500)
    }
})

// POST /api/labels
labelsRoutes.post('/', async (c) => {
    try {
        const body = await c.req.json()
        const newLabel: NewLabel = {
            projectId: body.projectId,
            name: body.name,
            color: body.color || '#6B7280',
        }
        const [created] = await db.insert(labels).values(newLabel).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating label:', error)
        return c.json({ success: false, error: 'Failed to create label' }, 500)
    }
})

// PATCH /api/labels/:id
labelsRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
        const updateData: Partial<NewLabel> = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.color !== undefined) updateData.color = body.color
        const [updated] = await db.update(labels).set(updateData).where(eq(labels.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Label not found' }, 404)
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating label:', error)
        return c.json({ success: false, error: 'Failed to update label' }, 500)
    }
})

// DELETE /api/labels/:id
labelsRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const [deleted] = await db.delete(labels).where(eq(labels.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Label not found' }, 404)
        return c.json({ success: true, message: `Label "${deleted.name}" deleted` })
    } catch (error) {
        console.error('Error deleting label:', error)
        return c.json({ success: false, error: 'Failed to delete label' }, 500)
    }
})
