import { Hono } from 'hono'
import { db } from '../../db'
import { projects, type NewProject } from '../../db/schema/projects'
import { eq, desc } from 'drizzle-orm'
import {
    canCreateProjects,
    canUpdateProjects,
    canDeleteProjects,
    type WorkspaceRole,
    type TeamLevel
} from '../../lib/permissions'

export const projectsRoutes = new Hono()

// Helper: Get user's workspace role
async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const member = await db.query.workspaceMembers.findFirst({
        where: (wm, { eq, and }) => and(eq(wm.userId, userId), eq(wm.workspaceId, workspaceId))
    })
    return (member?.role as WorkspaceRole) || null
}

// Helper: Get user's team level for a project's team
async function getUserTeamLevel(userId: string, teamId: string): Promise<TeamLevel | null> {
    const member = await db.query.teamMembers.findFirst({
        where: (tm, { eq, and }) => and(eq(tm.userId, userId), eq(tm.teamId, teamId))
    })
    return (member?.teamLevel as TeamLevel) || null
}

// GET /api/projects - List projects (anyone logged in can see projects they have access to)
projectsRoutes.get('/', async (c) => {
    try {
        const result = await db.select().from(projects).orderBy(desc(projects.createdAt))
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return c.json({ success: false, error: 'Failed to fetch projects' }, 500)
    }
})

// GET /api/projects/:id - Get single project
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

// POST /api/projects - Create project (requires projects.create permission)
projectsRoutes.post('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()
        const { teamId, workspaceId } = body

        if (!teamId) {
            return c.json({ success: false, error: 'teamId is required' }, 400)
        }

        // Get permissions
        const workspaceRole = workspaceId ? await getUserWorkspaceRole(userId, workspaceId) : null
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Check permission
        if (!canCreateProjects(workspaceRole, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create projects' }, 403)
        }

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

// PATCH /api/projects/:id - Update project (requires projects.update permission)
projectsRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get project to find teamId
        const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
        if (!project) return c.json({ success: false, error: 'Project not found' }, 404)

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, project.teamId)
        // Note: We would need workspaceId from team to check workspace role
        // For now, check team level only

        if (!canUpdateProjects(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to update project' }, 403)
        }

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

// DELETE /api/projects/:id - Delete project (requires projects.delete permission)
projectsRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'

        // Get project to find teamId
        const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
        if (!project) return c.json({ success: false, error: 'Project not found' }, 404)

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, project.teamId)

        if (!canDeleteProjects(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete project' }, 403)
        }

        const [deleted] = await db.delete(projects).where(eq(projects.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Project not found' }, 404)
        return c.json({ success: true, message: `Project "${deleted.name}" deleted` })
    } catch (error) {
        console.error('Error deleting project:', error)
        return c.json({ success: false, error: 'Failed to delete project' }, 500)
    }
})
