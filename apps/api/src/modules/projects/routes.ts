import { Hono } from 'hono'
import { db } from '../../db'
import { eq, asc } from 'drizzle-orm'
import { projects, projectMembers, industryTemplateStages, projectStages, type NewProject } from '../../db/schema'
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
        const { workspaceSlug } = c.req.query()

        let workspaceId: string | null = null
        if (workspaceSlug) {
            const ws = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug)
            })
            if (!ws) return c.json({ success: true, data: [] })
            workspaceId = ws.id
        }

        let teamIds: string[] = []
        if (workspaceId) {
            const workspaceTeams = await db.query.teams.findMany({
                where: (t, { eq }) => eq(t.workspaceId, workspaceId)
            })
            teamIds = workspaceTeams.map(t => t.id)
            if (teamIds.length === 0) return c.json({ success: true, data: [] })
        }

        const result = await db.query.projects.findMany({
            where: (p, { inArray }) => {
                if (teamIds.length > 0) return inArray(p.teamId, teamIds)
                return undefined
            },
            with: {
                stages: {
                    orderBy: (s, { asc }) => [asc(s.position)]
                },
                members: {
                    with: {
                        user: {
                            columns: { id: true, name: true, image: true }
                        }
                    }
                },
                team: {
                    with: {
                        members: {
                            with: {
                                user: {
                                    columns: { id: true, name: true, image: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: (p, { desc }) => [desc(p.createdAt)]
        })
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
        const project = await db.query.projects.findFirst({
            where: (p, { eq }) => eq(p.id, id),
            with: {
                stages: {
                    orderBy: (s, { asc }) => [asc(s.position)]
                }
            }
        })
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
            color: body.color || undefined,
            industryTemplateId: body.industryTemplateId || null,
            startDate: body.startDate ? new Date(body.startDate) : null,
            deadline: body.deadline ? new Date(body.deadline) : null,
        }
        const [created] = await db.insert(projects).values(newProject).returning()

        // Initialize stages if template is selected
        if (body.industryTemplateId) {
            const templateStages = await db
                .select()
                .from(industryTemplateStages)
                .where(eq(industryTemplateStages.templateId, body.industryTemplateId))
                .orderBy(asc(industryTemplateStages.position))

            if (templateStages.length > 0) {
                await Promise.all(
                    templateStages.map((ts) =>
                        db.insert(projectStages).values({
                            projectId: created.id,
                            name: ts.name,
                            color: ts.color,
                            position: ts.position,
                            isFinal: ts.isFinal,
                        })
                    )
                )
            }
        }

        // Auto-add team members to the project
        const teamMems = await db.query.teamMembers.findMany({
            where: (tm, { eq }) => eq(tm.teamId, teamId)
        })

        if (teamMems.length > 0) {
            await db.insert(projectMembers).values(
                teamMems.map(tm => ({
                    projectId: created.id,
                    userId: tm.userId,
                    role: 'member'
                }))
            )
        }

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
