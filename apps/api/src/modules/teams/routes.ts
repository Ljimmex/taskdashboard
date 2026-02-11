import { Hono } from 'hono'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'
import { auth } from '../../lib/auth'
import { teams, teamMembers } from '../../db/schema/teams'
import { workspaceMembers } from '../../db/schema/workspaces'
import { projects, projectMembers } from '../../db/schema/projects'
import { users } from '../../db/schema/users'
import {
    canManageTeamMembers,
    type WorkspaceRole,
    type TeamLevel
} from '../../lib/permissions'
import { triggerWebhook } from '../webhooks/trigger'

export const teamsRoutes = new Hono()

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
teamsRoutes.get('/', async (c) => {
    const workspaceIdQuery = c.req.query('workspaceId')
    const workspaceSlugQuery = c.req.query('workspaceSlug')
    const userId = c.req.header('x-user-id') || 'temp-user-id'

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
teamsRoutes.post('/join', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    let userId = session?.user?.id

    // Fallback to x-user-id header (common in this app's existing routes)
    if (!userId) {
        userId = c.req.header('x-user-id')
    }

    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const { workspaceSlug, teamName, teamSlug } = await c.req.json()

    if (!workspaceSlug || (!teamName && !teamSlug)) {
        return c.json({ error: 'workspaceSlug and teamName or teamSlug are required' }, 400)
    }

    try {
        const result = await db.transaction(async (tx) => {
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
teamsRoutes.post('/', async (c) => {
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { name, workspaceId: workspaceIdReq, workspaceSlug, description, color, members } = body

    if (!name || (!workspaceIdReq && !workspaceSlug)) {
        return c.json({ error: 'Name and workspaceId or workspaceSlug are required' }, 400)
    }

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
    const userId = c.req.header('x-user-id') || 'temp-user-id'

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
teamsRoutes.patch('/:id', async (c) => {
    const id = c.req.param('id')
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()

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

        const [updated] = await db.update(teams)
            .set({ ...body })
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
    const userId = c.req.header('x-user-id') || 'temp-user-id'

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
teamsRoutes.post('/:id/members', async (c) => {
    const teamId = c.req.param('id')
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const { userId: memberIdToAdd, email, teamLevel: newMemberLevel = 'junior' } = await c.req.json()

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
        const [newMember] = await db.insert(teamMembers).values({
            teamId,
            userId: targetUserId,
            teamLevel: newMemberLevel,
        }).returning()

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
    const userId = c.req.header('x-user-id') || 'temp-user-id'

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
teamsRoutes.patch('/:id/members/:memberId', async (c) => {
    const teamId = c.req.param('id')
    const memberId = c.req.param('memberId')
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
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
