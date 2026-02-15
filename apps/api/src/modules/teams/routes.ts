import { Hono } from 'hono'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'
import { type Auth } from '../../lib/auth'
import { teams, teamMembers } from '../../db/schema/teams'
import { workspaceMembers } from '../../db/schema/workspaces'
import { projects, projectMembers, projectTeams } from '../../db/schema/projects'
import { users } from '../../db/schema/users'
import {
    canManageTeamMembers,
    type WorkspaceRole,
    type TeamLevel
} from '../../lib/permissions'
import { triggerWebhook } from '../webhooks/trigger'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString, zSanitizedStringOptional } from '../../lib/zod-extensions'

const joinTeamSchema = z.object({
    workspaceSlug: zSanitizedString(),
    teamName: zSanitizedStringOptional(),
    teamSlug: zSanitizedStringOptional(),
}).refine(data => data.teamName || data.teamSlug, {
    message: "teamName or teamSlug is required"
})

const createTeamSchema = z.object({
    name: zSanitizedString(),
    workspaceId: z.string().uuid().optional(),
    workspaceSlug: zSanitizedStringOptional(),
    description: zSanitizedStringOptional(),
    color: zSanitizedStringOptional(),
    members: z.array(z.any()).optional()
})

const updateTeamSchema = z.object({
    name: zSanitizedStringOptional(),
    description: zSanitizedStringOptional(),
    color: zSanitizedStringOptional(),
})

const teamsQuerySchema = z.object({
    workspaceId: z.string().optional(),
    workspaceSlug: zSanitizedString().optional(),
})

const addTeamMemberSchema = z.object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    teamLevel: z.enum(['team_lead', 'senior', 'mid', 'junior', 'intern']).optional()
}).refine(data => data.userId || data.email, {
    message: "userId or email is required"
})

const updateTeamMemberSchema = z.object({
    firstName: zSanitizedStringOptional(),
    lastName: zSanitizedStringOptional(),
    position: zSanitizedStringOptional(),
    city: zSanitizedStringOptional(),
    country: zSanitizedStringOptional(),
    teamLevel: z.enum(['team_lead', 'senior', 'mid', 'junior', 'intern']).optional(),
    teams: z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
})

export const teamsRoutes = new Hono<Env>()

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

// Helper: Get user's team level
async function getUserTeamLevel(userId: string, teamId: string): Promise<TeamLevel | null> {
    const member = await db.query.teamMembers.findFirst({
        where: (tm, { eq, and }) => and(eq(tm.userId, userId), eq(tm.teamId, teamId))
    })
    return (member?.teamLevel as TeamLevel) || null
}

// GET /api/teams - List teams (optionally filtered by workspaceId or workspaceSlug)
teamsRoutes.get('/', zValidator('query', teamsQuerySchema), async (c) => {
    const { workspaceId: workspaceIdQuery, workspaceSlug: workspaceSlugQuery } = c.req.valid('query')
    const user = c.get('user') as any
    const userId = user.id

    try {
        let result: any[] = []
        let workspaceId = workspaceIdQuery

        // Message for debugging if needed, but logic proceeds
        // console.log("Reachable check passed");

        // If slug provided, find workspaceId
        if (!workspaceId && workspaceSlugQuery) {
            const slug = workspaceSlugQuery as string
            const ws = await db.query.workspaces.findFirst({
                where: (table, { eq }) => eq(table.slug, slug)
            })

            if (ws) {
                workspaceId = ws.id
            } else {
                return c.json({
                    success: false,
                    error: `Workspace with slug '${slug}' not found`,
                    debug: { workspaceSlugQuery, userId }
                }, 404)
            }
        }

        if (workspaceId) {
            console.log(`[DEBUG] Fetching teams for workspaceId: ${workspaceId}`)
            console.log('[DEBUG] DB Query Object:', !!db, !!db.query, !!db.query.teams)

            try {
                // Fetch basic team info first to rule out relation crashes
                // Explicitly NOT using a where clause first to see if findMany works at all
                // result = await db.query.teams.findMany({
                //     where: (table, { eq }) => eq(table.workspaceId, workspaceId as string),
                // })

                // Let's try raw SQL query via Drizzle just to test connectivity
                // Or a simple select
                const start = Date.now()
                console.log('[DEBUG] Executing db.query.teams.findMany...')

                result = await db.query.teams.findMany({
                    where: (table, { eq }) => eq(table.workspaceId, workspaceId as string),
                    with: {
                        members: {
                            with: {
                                user: true
                            }
                        }
                    }
                })

                console.log(`[DEBUG] Query completed in ${Date.now() - start}ms`)
                console.log(`[DEBUG] Found ${result.length} teams`)
            } catch (queryError) {
                console.error('[DEBUG] CRITICAL QUERY ERROR:', queryError)
                throw queryError // Re-throw to be caught by outer catch
            }
        } else if (!workspaceIdQuery && !workspaceSlugQuery) {
            // Fetch only teams the user is part of
            const memberships = await db.query.teamMembers.findMany({
                where: (tm, { eq }) => eq(tm.userId, userId),
                columns: { teamId: true }
            })

            const teamIds = memberships.map(m => m.teamId)

            if (teamIds.length > 0) {
                result = await db.query.teams.findMany({
                    where: (teams, { inArray }) => inArray(teams.id, teamIds),
                    with: {
                        members: {
                            with: {
                                user: true
                            }
                        }
                    }
                })
            }
        }

        // Fetch users' project memberships for these teams
        const allMembers = result.flatMap(t => t.members || [])
        if (allMembers.length > 0) {
            const userIds = allMembers.map((m: any) => m.userId)
            // Get all projects for these users (scoped to these teams ideally, but global is fine for display)
            const userProjects = await db.select({
                userId: projectMembers.userId,
                projectName: projects.name
            })
                .from(projectMembers)
                .innerJoin(projects, eq(projectMembers.projectId, projects.id))
                .innerJoin(teams, eq(projects.teamId, teams.id))
                .where(and(
                    inArray(projectMembers.userId, userIds),
                    workspaceId ? eq(teams.workspaceId, workspaceId as string) : undefined
                ))

            // Attach to members
            result.forEach(team => {
                team.members?.forEach((member: any) => {
                    if (member.user) {
                        member.user.projects = userProjects
                            .filter(up => up.userId === member.userId)
                            .map(up => up.projectName)
                    }
                })
            })
        }

        return c.json({
            success: true,
            data: result,
            debug: {
                workspaceId,
                workspaceSlugQuery,
                userId,
                resultCount: result.length
            }
        })
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch teams', details: String(error) }, 500)
    }
})

// POST /api/teams/join - Join a team and workspace via invite params
teamsRoutes.post('/join', zValidator('json', joinTeamSchema), async (c) => {
    const user = c.get('user') as any
    const userId = user.id

    const body = c.req.valid('json')
    const { workspaceSlug, teamName, teamSlug } = body

    // Validation handled by schema
    // if (!workspaceSlug || (!teamName && !teamSlug)) { ... } 

    try {
        const result = await db.transaction(async (tx) => {
            // ... existing logic ...
            // 1. Resolve workspace
            const ws = await tx.query.workspaces.findFirst({
                where: (table, { eq }) => eq(table.slug, workspaceSlug)
            })

            if (!ws) throw new Error(`Workspace ${workspaceSlug} not found`)

            // 2. Resolve team
            const resolvedTeamName = teamName || (teamSlug ? teamSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null)

            if (!resolvedTeamName) throw new Error('Could not resolve team name')

            const team = await tx.query.teams.findFirst({
                where: (table, { eq, and }) => and(
                    eq(table.workspaceId, ws.id),
                    eq(table.name, resolvedTeamName)
                )
            })

            if (!team) throw new Error(`Team ${resolvedTeamName} not found in workspace ${workspaceSlug}`)

            // 3. Add to workspace if not already a member
            const existingWsMember = await tx.query.workspaceMembers.findFirst({
                where: (wm, { eq, and }) => and(
                    eq(wm.userId, userId),
                    eq(wm.workspaceId, ws.id)
                )
            })

            if (!existingWsMember) {
                await tx.insert(workspaceMembers).values({
                    workspaceId: ws.id,
                    userId,
                    role: 'member'
                })
            }

            // 4. Add to team if not already a member
            const existingTeamMember = await tx.query.teamMembers.findFirst({
                where: (tm, { eq, and }) => and(
                    eq(tm.teamId, team.id),
                    eq(tm.userId, userId)
                )
            })

            if (!existingTeamMember) {
                await tx.insert(teamMembers).values({
                    teamId: team.id,
                    userId,
                    teamLevel: 'mid'
                })
            }

            return { workspaceId: ws.id, teamId: team.id, workspaceSlug: ws.slug }
        })

        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Join error:', error)
        return c.json({ error: 'Failed to join team', details: String(error) }, 500)
    }
})

// POST /api/teams - Create new team
teamsRoutes.post('/', zValidator('json', createTeamSchema), async (c) => {
    const user = c.get('user') as any
    const userId = user.id
    const body = c.req.valid('json')
    const { name, workspaceId: workspaceIdReq, workspaceSlug, description, color, members } = body

    // if (!name || (!workspaceIdReq && !workspaceSlug)) { ... } // schema handles this

    try {
        let workspaceId = workspaceIdReq

        if (!workspaceId && workspaceSlug) {
            const ws = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug)
            })
            if (!ws) return c.json({ error: 'Workspace not found' }, 404)
            workspaceId = ws.id
        }

        if (!workspaceId) return c.json({ error: 'Workspace ID resolved to null' }, 400)

        // Check if user is member of workspace
        const wsMember = await db.query.workspaceMembers.findFirst({
            where: (m, { eq, and }) => and(eq(m.workspaceId, workspaceId), eq(m.userId, userId))
        })

        if (!wsMember) {
            return c.json({ error: 'You must be a member of the workspace to create a team' }, 403)
        }

        // Transaction: Create team and add initial members (creator NOT auto-added)
        const result = await db.transaction(async (tx) => {
            const [newTeam] = await tx.insert(teams).values({
                name,
                description,
                workspaceId,
                color: color || '#3B82F6',
                ownerId: userId, // Legacy field - still tracks who created it
            }).returning()

            // Add invited members (if any)
            if (members && Array.isArray(members) && members.length > 0) {
                const membersToInsert = members.map((m: any) => ({
                    teamId: newTeam.id,
                    userId: m.id,
                    teamLevel: m.teamLevel || 'junior'
                }))

                if (membersToInsert.length > 0) {
                    await tx.insert(teamMembers).values(membersToInsert)
                }
            }

            return newTeam
        })

        // TRIGGER WEBHOOK
        if (result) {
            triggerWebhook('team.created', result, workspaceId)
        }

        return c.json({ data: result }, 201)
    } catch (error) {
        return c.json({ error: 'Failed to create team', details: String(error) }, 500)
    }
})

// GET /api/teams/:id - Get team details
teamsRoutes.get('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user') as any
    const userId = user.id

    try {
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            with: {
                members: {
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        }
                    }
                }
            }
        })

        if (!team) return c.json({ error: 'Team not found' }, 404)

        // Check access: must be member of team OR admin of workspace
        const isMember = team.members.some((m: any) => m.userId === userId)

        if (!isMember) {
            // allow workspace admins to see all teams? For now, stricter:
            // Actually, let's allow basic view if in same workspace
            const inWorkspace = await db.query.workspaceMembers.findFirst({
                where: (m, { eq, and }) => and(eq(m.workspaceId, team.workspaceId), eq(m.userId, userId))
            })
            if (!inWorkspace) return c.json({ error: 'Access denied' }, 403)
        }

        return c.json({ data: team })
    } catch (error) {
        return c.json({ error: 'Failed to fetch team', details: String(error) }, 500)
    }
})

// PATCH /api/teams/:id - Update team
teamsRoutes.patch('/:id', zValidator('json', updateTeamSchema), async (c) => {
    const id = c.req.param('id')
    const user = c.get('user') as any
    const userId = user.id
    const body = c.req.valid('json')

    try {
        // Get team to find workspaceId
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, id)
        })
        if (!team) return c.json({ error: 'Team not found' }, 404)

        // Get user's workspace role and team level
        const workspaceRole = await getUserWorkspaceRole(userId, team.workspaceId)
        const teamLevel = await getUserTeamLevel(userId, id)

        // Check permission: can manage teams
        if (!canManageTeamMembers(workspaceRole, teamLevel)) {
            return c.json({ error: 'Unauthorized to update team' }, 403)
        }

        const updateData: any = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.description !== undefined) updateData.description = body.description || null
        if (body.color !== undefined) updateData.color = body.color || null

        const [updated] = await db.update(teams)
            .set(updateData)
            .where(eq(teams.id, id))
            .returning()

        // TRIGGER WEBHOOK
        if (updated) {
            triggerWebhook('team.updated', updated, team.workspaceId)
        }

        return c.json({ data: updated })
    } catch (error) {
        return c.json({ error: 'Failed to update team', details: String(error) }, 500)
    }
})

// DELETE /api/teams/:id - Delete team
teamsRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user') as any
    const userId = user.id

    try {
        // Get team to find workspaceId
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, id)
        })
        if (!team) return c.json({ error: 'Team not found' }, 404)

        // Get user's workspace role and team level
        const workspaceRole = await getUserWorkspaceRole(userId, team.workspaceId)
        const teamLevel = await getUserTeamLevel(userId, id)

        // Only owner/admin at workspace level OR team_lead can delete
        const canDelete = workspaceRole === 'owner' || workspaceRole === 'admin' || teamLevel === 'team_lead'
        if (!canDelete) {
            return c.json({ error: 'Unauthorized to delete team' }, 403)
        }

        await db.delete(teams).where(eq(teams.id, id))

        // TRIGGER WEBHOOK
        triggerWebhook('team.deleted', team, team.workspaceId)

        return c.json({ message: 'Team deleted' })
    } catch (error) {
        return c.json({ error: 'Failed to delete team', details: String(error) }, 500)
    }
})

// POST /api/teams/:id/members - Add member to team
teamsRoutes.post('/:id/members', zValidator('json', addTeamMemberSchema), async (c) => {
    const teamId = c.req.param('id')
    const user = c.get('user') as any
    const userId = user.id
    const { userId: memberIdToAdd, email, teamLevel: newMemberLevel = 'junior' } = c.req.valid('json')

    try {
        // Get team to find workspaceId
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, teamId)
        })
        if (!team) return c.json({ error: 'Team not found' }, 404)

        // Get user's permissions
        const workspaceRole = await getUserWorkspaceRole(userId, team.workspaceId)
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Check permission to manage team members
        if (!canManageTeamMembers(workspaceRole, teamLevel)) {
            return c.json({ error: 'Unauthorized to add members' }, 403)
        }

        let targetUserId = memberIdToAdd

        // If email provided, find user
        if (!targetUserId && email) {
            const user = await db.query.users.findFirst({
                where: (u, { eq }) => eq(u.email, email)
            })
            if (!user) return c.json({ error: 'User with this email not found' }, 404)
            targetUserId = user.id
        }

        if (!targetUserId) return c.json({ error: 'userId or email required' }, 400)

        // Verify that the user is a member of the workspace
        const isWsMember = await db.query.workspaceMembers.findFirst({
            where: (wm, { eq, and }) => and(
                eq(wm.workspaceId, team.workspaceId),
                eq(wm.userId, targetUserId)
            )
        })

        if (!isWsMember) {
            return c.json({ error: 'User must be a member of the workspace to join this team' }, 400)
        }

        // Add to team_members
        const newMember = await db.transaction(async (tx) => {
            const [inserted] = await tx.insert(teamMembers).values({
                teamId,
                userId: targetUserId,
                teamLevel: newMemberLevel,
            }).returning()

            // AUTO-ADD TO PROJECTS
            // Find all projects associated with this team
            const teamProjects = await tx.select({ id: projects.id })
                .from(projects)
                .where(eq(projects.teamId, teamId))

            // Also check projectTeams join table
            const linkedProjects = await tx.select({ id: projects.id })
                .from(projects)
                .innerJoin(projectTeams, eq(projects.id, projectTeams.projectId))
                .where(eq(projectTeams.teamId, teamId))

            const allProjectIds = Array.from(new Set([
                ...teamProjects.map(p => p.id),
                ...linkedProjects.map(p => p.id)
            ]))

            if (allProjectIds.length > 0) {
                // Check existing memberships to avoid duplicates
                const existingProjectMems = await tx.select({ projectId: projectMembers.projectId })
                    .from(projectMembers)
                    .where(and(
                        eq(projectMembers.userId, targetUserId),
                        inArray(projectMembers.projectId, allProjectIds)
                    ))

                const existingIds = existingProjectMems.map(m => m.projectId)
                const idsToAdd = allProjectIds.filter(id => !existingIds.includes(id))

                if (idsToAdd.length > 0) {
                    await tx.insert(projectMembers).values(
                        idsToAdd.map(pid => ({
                            projectId: pid,
                            userId: targetUserId,
                            role: 'member'
                        }))
                    )
                }
            }

            return inserted
        })

        // TRIGGER WEBHOOK
        if (newMember) {
            triggerWebhook('team.member_joined', newMember, team.workspaceId)
        }

        return c.json({ data: newMember }, 201)
    } catch (error) {
        return c.json({ error: 'Failed to add member', details: String(error) }, 500)
    }
})

// DELETE /api/teams/:id/members/:userId - Remove member
teamsRoutes.delete('/:id/members/:memberId', async (c) => {
    const teamId = c.req.param('id')
    const memberId = c.req.param('memberId')
    const user = c.get('user') as any
    const userId = user.id

    try {
        // Get team to find workspaceId
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, teamId)
        })
        if (!team) return c.json({ error: 'Team not found' }, 404)

        // Get user's permissions
        const workspaceRole = await getUserWorkspaceRole(userId, team.workspaceId)
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Can remove if: has manageMembers permission OR removing self
        const canRemove = memberId === userId || canManageTeamMembers(workspaceRole, teamLevel)
        if (!canRemove) {
            return c.json({ error: 'Unauthorized to remove members' }, 403)
        }

        await db.delete(teamMembers)
            .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId)))

        // TRIGGER WEBHOOK
        triggerWebhook('team.member_removed', { teamId, userId: memberId }, team.workspaceId)

        return c.json({ message: 'Member removed' })
    } catch (error) {
        return c.json({ error: 'Failed to remove member', details: String(error) }, 500)
    }
})


// PATCH /api/teams/:id/members/:memberId - Update member role and user details
teamsRoutes.patch('/:id/members/:memberId', zValidator('json', updateTeamMemberSchema), async (c) => {
    const teamId = c.req.param('id')
    const memberId = c.req.param('memberId')
    const user = c.get('user') as any
    const userId = user.id
    const body = c.req.valid('json')
    const { firstName, lastName, position, city, country, teamLevel: newTeamLevel, projects: projectNames } = body

    console.log('PATCH member', { teamId, memberId, firstName, lastName, position, city, country, newTeamLevel })

    try {
        // Get team to find workspaceId
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, teamId)
        })
        if (!team) return c.json({ error: 'Team not found' }, 404)

        // Get user's permissions
        const workspaceRole = await getUserWorkspaceRole(userId, team.workspaceId)
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Check permission to manage team members
        if (!canManageTeamMembers(workspaceRole, teamLevel)) {
            console.log('Unauthorized - workspaceRole:', workspaceRole, 'teamLevel:', teamLevel)
            return c.json({ error: 'Unauthorized to update members' }, 403)
        }

        // Update team_members teamLevel if provided AND valid
        const validTeamLevels = ['team_lead', 'senior', 'mid', 'junior', 'intern']
        if (newTeamLevel && validTeamLevels.includes(newTeamLevel)) {
            console.log('Updating teamLevel', newTeamLevel)
            await db.update(teamMembers)
                .set({ teamLevel: newTeamLevel })
                .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId)))
        } else if (newTeamLevel) {
            console.log('Invalid teamLevel value ignored:', newTeamLevel)
        }

        // Update user details (Global Profile)
        // Note: Ideally this should be in /api/users, but facilitating here for "Edit Member" flow
        if (firstName !== undefined || lastName !== undefined || position !== undefined || city !== undefined || country !== undefined) {
            const updates: any = {}
            if (firstName !== undefined) updates.firstName = firstName
            if (lastName !== undefined) updates.lastName = lastName
            if (position !== undefined) updates.position = position
            if (city !== undefined) updates.city = city
            if (country !== undefined) updates.country = country

            // Consolidate full name
            if (firstName !== undefined || lastName !== undefined) {
                // Fetch current values if only one provided
                const currentUser = await db.query.users.findFirst({
                    where: (u, { eq }) => eq(u.id, memberId),
                    columns: { firstName: true, lastName: true, name: true }
                })

                const newFirst = firstName !== undefined ? firstName : (currentUser?.firstName || '')
                const newLast = lastName !== undefined ? lastName : (currentUser?.lastName || '')
                updates.name = `${newFirst} ${newLast}`.trim() || currentUser?.name
            }

            console.log('Updating user', updates)
            await db.update(users)
                .set(updates)
                .where(eq(users.id, memberId))
        }

        // Update Teams (Workspace-wide sync)
        if (Array.isArray(body.teams)) {
            const requestedTeamNames = body.teams as string[]
            console.log('Syncing user teams across workspace', requestedTeamNames)

            // 1. Get all teams in this workspace
            const workspaceTeams = await db.select().from(teams).where(eq(teams.workspaceId, team.workspaceId))
            const workspaceTeamIds = workspaceTeams.map(t => t.id)

            // 2. Resolve requested names to IDs
            const targetTeamIds = workspaceTeams
                .filter(t => requestedTeamNames.includes(t.name))
                .map(t => t.id)

            // 3. Remove from workspace teams not in target list
            await db.delete(teamMembers).where(and(
                eq(teamMembers.userId, memberId),
                inArray(teamMembers.teamId, workspaceTeamIds),
                targetTeamIds.length > 0 ? sql`team_id NOT IN (${sql.join(targetTeamIds.map(t => sql`${t}`), sql`, `)})` : sql`true`
            ))

            // 4. Add to teams not currently in
            const currentMemberships = await db.select().from(teamMembers).where(and(
                eq(teamMembers.userId, memberId),
                inArray(teamMembers.teamId, targetTeamIds)
            ))
            const currentTeamIds = currentMemberships.map(m => m.teamId)
            const teamsToAdd = targetTeamIds.filter(tid => !currentTeamIds.includes(tid))

            if (teamsToAdd.length > 0) {
                await db.insert(teamMembers).values(
                    teamsToAdd.map(tid => ({
                        teamId: tid,
                        userId: memberId,
                        teamLevel: newTeamLevel || 'mid'
                    }))
                )
            }
        }

        // Update Projects (Workspace-wide sync)
        if (projectNames && Array.isArray(projectNames)) {
            console.log('Syncing user projects across workspace', projectNames)

            // 1. Get all project IDs in this workspace (by joining with teams)
            const workspaceProjectData = await db.select({ id: projects.id, name: projects.name })
                .from(projects)
                .innerJoin(teams, eq(projects.teamId, teams.id))
                .where(eq(teams.workspaceId, team.workspaceId))

            const workspaceProjectIds = workspaceProjectData.map(p => p.id)

            // 2. Resolve requested names to IDs
            const targetProjectIds = workspaceProjectData
                .filter(p => projectNames.includes(p.name))
                .map(p => p.id)

            // 3. Remove user from all workspace projects first (or filter like teams)
            await db.delete(projectMembers).where(and(
                eq(projectMembers.userId, memberId),
                inArray(projectMembers.projectId, workspaceProjectIds)
            ))

            // 4. Insert new memberships
            if (targetProjectIds.length > 0) {
                await db.insert(projectMembers).values(
                    targetProjectIds.map(pid => ({
                        projectId: pid,
                        userId: memberId
                    }))
                )
            }
        }

        return c.json({ message: 'Member updated' })
    } catch (error) {
        console.error('PATCH member error:', error)
        return c.json({ error: 'Failed to update member', details: String(error) }, 500)
    }
})
