import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import { teams, teamMembers } from '../../db/schema/teams'
import { users } from '../../db/schema/users'

export const teamsRoutes = new Hono()

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

        // Transaction: Create team, add creator as owner, AND add initial members
        const result = await db.transaction(async (tx) => {
            const [newTeam] = await tx.insert(teams).values({
                name,
                description,
                workspaceId,
                color: color || '#3B82F6',
                ownerId: userId, // Legacy
            }).returning()

            // 1. Add creator as owner
            await tx.insert(teamMembers).values({
                teamId: newTeam.id,
                userId: userId,
                role: 'owner',
            })

            // 2. Add other invited members
            if (members && Array.isArray(members) && members.length > 0) {
                const membersToInsert = members.map((m: any) => ({
                    teamId: newTeam.id,
                    userId: m.id, // Frontend sends { id: userId, role: ... }
                    role: m.role || 'member'
                }))

                // Filter out creator if they added themselves? 
                // DB unique constraint should handle duplicates if (teamId, userId) allows only one.
                // Or safekeeping:
                const validMembers = membersToInsert.filter((m: any) => m.userId !== userId)

                if (validMembers.length > 0) {
                    await tx.insert(teamMembers).values(validMembers)
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
        const member = await db.query.teamMembers.findFirst({
            where: (tm, { eq, and }) => and(eq(tm.teamId, id), eq(tm.userId, userId))
        })

        if (!member || !['owner', 'admin'].includes(member.role)) {
            // Also check workspace admin?
            return c.json({ error: 'Unauthorized to update team' }, 403)
        }

        const [updated] = await db.update(teams)
            .set({ ...body }) // removed updatedAt since it's not in schema yet
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
        const member = await db.query.teamMembers.findFirst({
            where: (tm, { eq, and }) => and(eq(tm.teamId, id), eq(tm.userId, userId))
        })

        // Only owner can delete
        if (!member || member.role !== 'owner') {
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
    const { userId: memberIdToAdd, email, role = 'member' } = await c.req.json()

    try {
        // Validation: Requestor must be owner/admin of team
        const requestor = await db.query.teamMembers.findFirst({
            where: (tm, { eq, and }) => and(eq(tm.teamId, teamId), eq(tm.userId, userId))
        })
        if (!requestor || !['owner', 'admin'].includes(requestor.role)) {
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
            role,
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
        const requestor = await db.query.teamMembers.findFirst({
            where: (tm, { eq, and }) => and(eq(tm.teamId, teamId), eq(tm.userId, userId))
        })

        // Can remove if: I am owner/admin OR I am removing myself
        if (memberId !== userId && (!requestor || !['owner', 'admin'].includes(requestor.role))) {
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
    const { role, firstName, lastName, position } = await c.req.json()

    console.log('PATCH member', { teamId, memberId, role, firstName, lastName, position })

    try {
        // Validation: Requestor must be owner/admin of team
        const requestor = await db.query.teamMembers.findFirst({
            where: (tm, { eq, and }) => and(eq(tm.teamId, teamId), eq(tm.userId, userId))
        })

        if (!requestor || !['owner', 'admin'].includes(requestor.role)) {
            console.log('Unauthorized requestor', requestor)
            return c.json({ error: 'Unauthorized to update members' }, 403)
        }

        // Update team_members role if provided
        if (role) {
            console.log('Updating role', role)
            await db.update(teamMembers)
                .set({ role })
                .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId)))
        }

        // Update user details (Global Profile)
        // Note: Ideally this should be in /api/users, but facilitating here for "Edit Member" flow
        if (firstName !== undefined || lastName !== undefined || position !== undefined) {
            const updates: any = {}
            if (firstName !== undefined) updates.firstName = firstName
            if (lastName !== undefined) updates.lastName = lastName
            if (position !== undefined) updates.position = position

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
            // Update user
            // Assuming 'users' table is imported or accessible via db.query.users.schema
            // If 'users' is not directly imported, you might need to import it or use db.schema.users
            // For this example, I'll assume `users` is available from a schema import.
            // If not, you'd need to add `import { users } from '../../db/schema';` or similar.
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
