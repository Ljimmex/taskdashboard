import { Hono } from 'hono'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../../db'
import { teams, teamMembers } from '../../db/schema/teams'
import { projects, projectMembers } from '../../db/schema/projects'
import { users } from '../../db/schema/users'
import {
    canManageTeamMembers,
    type WorkspaceRole,
    type TeamLevel
} from '../../lib/permissions'

export const teamsRoutes = new Hono()

// Helper: Get user's workspace role
async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const member = await db.query.workspaceMembers.findFirst({
        where: (wm, { eq, and }) => and(eq(wm.userId, userId), eq(wm.workspaceId, workspaceId))
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

        // If slug provided, find workspaceId
        if (!workspaceId && workspaceSlugQuery) {
            const ws = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlugQuery)
            })
            if (ws) {
                workspaceId = ws.id
            } else {
                return c.json({
                    success: false,
                    error: `Workspace with slug '${workspaceSlugQuery}' not found`,
                    debug: { workspaceSlugQuery, userId }
                }, 404)
            }
        }

        if (workspaceId) {
            console.log(`🔍 Fetching teams for workspaceId: ${workspaceId}`)
            // Fetch all teams in the workspace with members
            result = await db.query.teams.findMany({
                where: (table, { eq }) => eq(table.workspaceId, workspaceId as string),
                with: {
                    members: {
                        with: {
                            user: true
                        }
                    },
                    projects: true
                }
            })
            console.log(`✅ Found ${result.length} teams`)
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
                .where(inArray(projectMembers.userId, userIds))

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

        // Add to team_members
        const [newMember] = await db.insert(teamMembers).values({
            teamId,
            userId: targetUserId,
            teamLevel: newMemberLevel,
        }).returning()

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
    const { firstName, lastName, position, city, country, teamLevel: newTeamLevel, projects: projectNames } = await c.req.json()

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

        // Update Projects
        if (projectNames && Array.isArray(projectNames)) {
            console.log('Updating user projects', projectNames)

            // 1. Get all projects belonging to this team
            const teamProjects = await db.select().from(projects).where(eq(projects.teamId, teamId))
            const teamProjectIds = teamProjects.map(p => p.id)

            if (teamProjectIds.length > 0) {
                // 2. Resolve requested names to IDs (must belong to this team)
                const targetProjectIds = teamProjects
                    .filter(p => projectNames.includes(p.name))
                    .map(p => p.id)

                // 3. Remove user from ALL team projects first
                // (Safest way to ensure "sync" behavior without complex diffs)
                await db.delete(projectMembers)
                    .where(and(
                        eq(projectMembers.userId, memberId),
                        inArray(projectMembers.projectId, teamProjectIds)
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
        }

        return c.json({ message: 'Member updated' })
    } catch (error) {
        console.error('PATCH member error:', error)
        return c.json({ error: 'Failed to update member', details: String(error) }, 500)
    }
})
