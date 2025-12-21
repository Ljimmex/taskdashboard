import { Hono } from 'hono'
import { db } from '../../db'
import { projects, type NewProject } from '../../db/schema/projects'
import { eq, desc } from 'drizzle-orm'

export const projectsRoutes = new Hono()

// GET /api/projects
projectsRoutes.get('/', async (c) => {
    try {
        const result = await db.select().from(projects).orderBy(desc(projects.createdAt))
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return c.json({ success: false, error: 'Failed to fetch projects' }, 500)
    }
})

// GET /api/projects/:id
projectsRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
        if (!project) return c.json({ success: false, error: 'Project not found' }, 404)
        return c.json({ success: true, data: project })
    } catch (error) {
        console.error('Error fetching project:', error)
        return c.json({ success: false, error: 'Failed to fetch project' }, 500)
    }
})

// POST /api/projects
projectsRoutes.post('/', async (c) => {
    try {
        const body = await c.req.json()
        const newProject: NewProject = {
            teamId: body.teamId,
            name: body.name,
            description: body.description || null,
            deadline: body.deadline ? new Date(body.deadline) : null,
        }
        const [created] = await db.insert(projects).values(newProject).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating project:', error)
        return c.json({ success: false, error: 'Failed to create project' }, 500)
    }
})

// PATCH /api/projects/:id
projectsRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
        const updateData: Partial<NewProject> = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description
        if (body.status !== undefined) updateData.status = body.status
        if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null
        const [updated] = await db.update(projects).set(updateData).where(eq(projects.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Project not found' }, 404)
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating project:', error)
        return c.json({ success: false, error: 'Failed to update project' }, 500)
    }
})

// DELETE /api/projects/:id
projectsRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Project not found' }, 404)
        return c.json({ success: true, message: `Project "${deleted.name}" deleted` })
    } catch (error) {
        console.error('Error deleting project:', error)
        return c.json({ success: false, error: 'Failed to delete project' }, 500)
    }
})
