import { Hono } from 'hono'
import { db } from '../../db'
import { labels, type NewLabel } from '../../db/schema/tasks'
import { projects } from '../../db/schema/projects'
import { eq } from 'drizzle-orm'
import {
    canCreateLabels,
    canUpdateLabels,
    canDeleteLabels,
    type TeamLevel
} from '../../lib/permissions'

export const labelsRoutes = new Hono()

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

// GET /api/labels - List labels for a project (anyone with project access can view)
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

// POST /api/labels - Create label (requires labels.create permission)
labelsRoutes.post('/', async (c) => {
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

        if (!canCreateLabels(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create labels' }, 403)
        }

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

// PATCH /api/labels/:id - Update label (requires labels.update permission)
labelsRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get label to find projectId
        const [label] = await db.select().from(labels).where(eq(labels.id, id)).limit(1)
        if (!label) return c.json({ success: false, error: 'Label not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(label.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canUpdateLabels(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to update labels' }, 403)
        }

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

// DELETE /api/labels/:id - Delete label (requires labels.delete permission)
labelsRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'

        // Get label to find projectId
        const [label] = await db.select().from(labels).where(eq(labels.id, id)).limit(1)
        if (!label) return c.json({ success: false, error: 'Label not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(label.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canDeleteLabels(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete labels' }, 403)
        }

        const [deleted] = await db.delete(labels).where(eq(labels.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Label not found' }, 404)
        return c.json({ success: true, message: `Label "${deleted.name}" deleted` })
    } catch (error) {
        console.error('Error deleting label:', error)
        return c.json({ success: false, error: 'Failed to delete label' }, 500)
    }
})
