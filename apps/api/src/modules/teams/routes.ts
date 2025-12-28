import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import { teams, teamMembers } from '../../db/schema/teams'
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

// GET /api/teams - List teams (optionally filtered by workspaceId)
teamsRoutes.get('/', async (c) => {
    const workspaceId = c.req.query('workspaceId')
    const userId = c.req.header('x-user-id') || 'temp-user-id'

    try {
        let result: any[] = []

        if (workspaceId) {
            // Fetch all teams in the workspace with members
            result = await db.query.teams.findMany({
                where: (teams, { eq }) => eq(teams.workspaceId, workspaceId),
                with: {
                    members: {
                        with: {
                            user: true
                        }
                    }
                }
            })
        } else {
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

        return c.json({ data: result })
    } catch (error) {
        return c.json({ error: 'Failed to fetch teams', details: String(error) }, 500)
    }
})

// POST /api/teams - Create new team
teamsRoutes.post('/', async (c) => {
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { name, workspaceId, description, color, members } = body

    if (!name || !workspaceId) {
        return c.json({ error: 'Name and workspaceId are required' }, 400)
    }

    try {
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
    const { firstName, lastName, position, city, country, teamLevel: newTeamLevel } = await c.req.json()

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

        return c.json({ message: 'Member updated' })
    } catch (error) {
        console.error('PATCH member error:', error)
        return c.json({ error: 'Failed to update member', details: String(error) }, 500)
    }
})
