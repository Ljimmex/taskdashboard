import { Hono } from 'hono'
import { db } from '../../db'
import { type Auth } from '../../lib/auth'
import { eq, asc } from 'drizzle-orm'
import { projects, projectMembers, projectTeams, industryTemplateStages, projectStages, type NewProject } from '../../db/schema'
import {
    canCreateProjects,
    canUpdateProjects,
    canDeleteProjects,
    type WorkspaceRole,
    type TeamLevel
} from '../../lib/permissions'
import { triggerWebhook } from '../webhooks/trigger'
import { teams } from '../../db/schema'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}



import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString, zSanitizedStringOptional } from '../../lib/zod-extensions'

const createProjectSchema = z.object({
    teamId: z.string().optional(), // Keep for backward compatibility or primary team
    teamIds: z.array(z.string()).optional(), // New multi-team support
    workspaceId: z.string().optional(),
    name: zSanitizedString(),
    description: zSanitizedStringOptional(),
    color: zSanitizedString().optional(),
    industryTemplateId: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    deadline: z.string().optional().nullable(),
})

const updateProjectSchema = z.object({
    name: zSanitizedString().optional(),
    description: zSanitizedStringOptional(),
    status: z.enum(['pending', 'active', 'on_hold', 'completed', 'archived']).optional(),
    deadline: z.string().optional().nullable(),
})

export const projectsRoutes = new Hono<Env>()

// Helper: Get user's workspace role
async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const member = await db.query.workspaceMembers.findFirst({
        where: (wm, { eq, and }) => and(
            eq(wm.userId, userId),
            eq(wm.workspaceId, workspaceId),
            eq(wm.status, 'active')
        )
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
        const user = c.get('user')
        const userId = user.id
        const { workspaceSlug } = c.req.query()

        let workspaceId: string | null = null
        let userWorkspaceRole: WorkspaceRole | null = null



        if (workspaceSlug) {
            const ws = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug)
            })
            if (!ws) return c.json({ success: true, data: [] })
            workspaceId = ws.id
            userWorkspaceRole = await getUserWorkspaceRole(userId, workspaceId)

            if (!userWorkspaceRole) {
                return c.json({ success: false, error: 'Forbidden: You are not a member of this workspace' }, 403)
            }
        }

        let teamIds: string[] = []
        if (workspaceId) {
            const workspaceTeams = await db.query.teams.findMany({
                where: (t, { eq }) => eq(t.workspaceId, workspaceId)
            })
            teamIds = workspaceTeams.map(t => t.id)
            if (teamIds.length === 0) return c.json({ success: true, data: [] })
        }

        const isProjectManagerOrHigher = userWorkspaceRole && ['owner', 'admin', 'project_manager'].includes(userWorkspaceRole)

        const result = await db.query.projects.findMany({
            where: (p, { inArray, and, exists, eq }) => {
                const wheres: any[] = []

                if (teamIds.length > 0) {
                    wheres.push(inArray(p.teamId, teamIds))
                }

                // Filter by membership if not manager
                if (!isProjectManagerOrHigher) {
                    wheres.push(
                        exists(
                            db.select()
                                .from(projectMembers)
                                .where(and(
                                    eq(projectMembers.projectId, p.id),
                                    eq(projectMembers.userId, userId)
                                ))
                        )
                    )
                }

                return wheres.length > 0 ? and(...wheres) : undefined
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
        const user = c.get('user') as any
        const userId = user.id

        const project = await db.query.projects.findFirst({
            where: (p, { eq }) => eq(p.id, id),
            with: {
                stages: {
                    orderBy: (s, { asc }) => [asc(s.position)]
                }
            }
        })

        if (!project) return c.json({ success: false, error: 'Project not found' }, 404)

        // Check Access
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, project.teamId)
        })

        let workspaceRole: WorkspaceRole | null = null
        if (team) {
            workspaceRole = await getUserWorkspaceRole(userId, team.workspaceId)
        }

        const isProjectManagerOrHigher = workspaceRole && ['owner', 'admin', 'project_manager'].includes(workspaceRole)

        if (!isProjectManagerOrHigher) {
            const isMember = await db.query.projectMembers.findFirst({
                where: (pm, { eq, and }) => and(eq(pm.projectId, id), eq(pm.userId, userId))
            })
            if (!isMember) {
                return c.json({ success: false, error: 'Access denied' }, 403)
            }
        }

        return c.json({ success: true, data: project })
    } catch (error) {
        console.error('Error fetching project:', error)
        return c.json({ success: false, error: 'Failed to fetch project' }, 500)
    }
})

// POST /api/projects - Create project (requires projects.create permission)
projectsRoutes.post('/', zValidator('json', createProjectSchema), async (c) => {
    try {
        const user = c.get('user') as any
        const userId = user.id
        const body = c.req.valid('json')
        const { teamId, workspaceId } = body

        // Create project
        const projectTeamIds = body.teamIds || (teamId ? [teamId] : [])
        if (projectTeamIds.length === 0) {
            return c.json({ success: false, error: 'At least one teamId is required' }, 400)
        }

        // 1. Get permissions and check
        // Check for the first team (primary) or all? Usually primary team manage projects.
        const workspaceRole = workspaceId ? await getUserWorkspaceRole(userId, workspaceId) : null
        const teamLevel = await getUserTeamLevel(userId, projectTeamIds[0])

        if (!canCreateProjects(workspaceRole, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create projects' }, 403)
        }

        const newProject: NewProject = {
            teamId: projectTeamIds[0], // Set first team as primary for legacy compatibility
            name: body.name,
            description: body.description,
            color: body.color,
            industryTemplateId: body.industryTemplateId || null,
            startDate: body.startDate ? new Date(body.startDate) : null,
            deadline: body.deadline ? new Date(body.deadline) : null,
        }

        const result = await db.transaction(async (tx) => {
            const [created] = await tx.insert(projects).values(newProject).returning()

            // 1. Link multiple teams
            await tx.insert(projectTeams).values(
                projectTeamIds.map(tid => ({
                    projectId: created.id,
                    teamId: tid
                }))
            )

            // 2. Initialize stages if template is selected
            if (body.industryTemplateId) {
                const templateStages = await tx
                    .select()
                    .from(industryTemplateStages)
                    .where(eq(industryTemplateStages.templateId, body.industryTemplateId))
                    .orderBy(asc(industryTemplateStages.position))

                if (templateStages.length > 0) {
                    await tx.insert(projectStages).values(
                        templateStages.map((ts) => ({
                            projectId: created.id,
                            name: ts.name,
                            color: ts.color,
                            position: ts.position,
                            isFinal: ts.isFinal,
                        }))
                    )
                }
            }

            // 3. Auto-add team members from ALL selected teams
            const teamMems = await tx.query.teamMembers.findMany({
                where: (tm, { inArray }) => inArray(tm.teamId, projectTeamIds)
            })

            if (teamMems.length > 0) {
                // Use a Map to ensure unique user IDs
                const uniqueUserIds = Array.from(new Set(teamMems.map(tm => tm.userId)))
                await tx.insert(projectMembers).values(
                    uniqueUserIds.map(uid => ({
                        projectId: created.id,
                        userId: uid,
                        role: 'member'
                    }))
                )
            }

            return created
        })

        // TRIGGER WEBHOOK
        let finalWorkspaceId = workspaceId
        if (!finalWorkspaceId) {
            const [team] = await db.select({ workspaceId: teams.workspaceId }).from(teams).where(eq(teams.id, projectTeamIds[0])).limit(1)
            if (team?.workspaceId) {
                finalWorkspaceId = team.workspaceId
            }
        }

        if (finalWorkspaceId) {
            triggerWebhook('project.created', result, finalWorkspaceId)
        }

        return c.json({ success: true, data: result }, 201)
    } catch (error) {
        console.error('Error creating project:', error)
        return c.json({ success: false, error: 'Failed to create project' }, 500)
    }
})

// PATCH /api/projects/:id - Update project (requires projects.update permission)
projectsRoutes.patch('/:id', zValidator('json', updateProjectSchema), async (c) => {
    try {
        const id = c.req.param('id')
        const user = c.get('user')
        const userId = user.id
        const body = c.req.valid('json')

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

        // TRIGGER WEBHOOK
        const [team] = await db.select({ workspaceId: teams.workspaceId }).from(teams).where(eq(teams.id, updated.teamId)).limit(1)
        if (team?.workspaceId) {
            triggerWebhook('project.updated', updated, team.workspaceId)
        }

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
        const user = c.get('user')
        const userId = user.id

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

        // TRIGGER WEBHOOK
        const [team] = await db.select({ workspaceId: teams.workspaceId }).from(teams).where(eq(teams.id, project.teamId)).limit(1)
        if (team?.workspaceId) {
            triggerWebhook('project.deleted', deleted, team.workspaceId)
        }

        return c.json({ success: true, message: `Project "${deleted.name}" deleted` })
    } catch (error) {
        console.error('Error deleting project:', error)
        return c.json({ success: false, error: 'Failed to delete project' }, 500)
    }
})
