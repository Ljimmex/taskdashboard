import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { workspaces, workspaceMembers } from '../../db/schema/workspaces'
import { auth } from '../../lib/auth'
import {
    canManageWorkspaceSettings,
    canManageWorkspaceMembers,
    canDeleteWorkspace,
    type WorkspaceRole
} from '../../lib/permissions'

export const workspacesRoutes = new Hono()

// Helper: Get user's workspace role
async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const member = await db.query.workspaceMembers.findFirst({
        where: (wm, { eq, and }) => and(eq(wm.userId, userId), eq(wm.workspaceId, workspaceId))
    })
    return (member?.role as WorkspaceRole) || null
}

// GET /api/workspaces - Get user's workspaces
workspacesRoutes.get('/', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = session.user.id

    try {
        const userWorkspaces = await db
            .select({
                workspace: workspaces,
                role: workspaceMembers.role,
            })
            .from(workspaceMembers)
            .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
            .where(eq(workspaceMembers.userId, userId))

        return c.json({
            data: userWorkspaces.map(w => ({
                ...w.workspace,
                userRole: w.role
            }))
        })
    } catch (error) {
        return c.json({ error: 'Failed to fetch workspaces', details: String(error) }, 500)
    }
})

// POST /api/workspaces - Create new workspace
workspacesRoutes.post('/', async (c) => {
    // Get Session using Better Auth
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = session.user.id

    const body = await c.req.json()
    const { name, slug, teamSize, industry } = body

    if (!name || !slug) {
        return c.json({ error: 'Name and slug are required' }, 400)
    }

    try {
        // Transaction: Create workspace AND add user as owner
        const result = await db.transaction(async (tx) => {
            const [newWorkspace] = await tx.insert(workspaces).values({
                name,
                slug,
                teamSize,
                industry,
                ownerId: userId,
                // Default settings applied by DB
            }).returning()

            await tx.insert(workspaceMembers).values({
                workspaceId: newWorkspace.id,
                userId: userId,
                role: 'owner',
            })

            return newWorkspace
        })

        return c.json({ data: result }, 201)
    } catch (error) {
        return c.json({ error: 'Failed to create workspace', details: String(error) }, 500)
    }
})

// GET /api/workspaces/:id - Get workspace details (member access)
workspacesRoutes.get('/:id', async (c) => {
    const id = c.req.param('id')
    const userId = c.req.header('x-user-id') || 'temp-user-id'

    try {
        // Check membership
        const workspaceRole = await getUserWorkspaceRole(userId, id)

        if (!workspaceRole) {
            return c.json({ error: 'Workspace not found or access denied' }, 404)
        }

        const workspace = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.id, id)
        })

        return c.json({ data: workspace })
    } catch (error) {
        return c.json({ error: 'Failed to fetch workspace', details: String(error) }, 500)
    }
})

// PATCH /api/workspaces/:id - Update workspace (requires workspace.manageSettings)
workspacesRoutes.patch('/:id', async (c) => {
    const id = c.req.param('id')
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()

    try {
        // Get user's workspace role
        const workspaceRole = await getUserWorkspaceRole(userId, id)

        if (!canManageWorkspaceSettings(workspaceRole)) {
            return c.json({ error: 'Unauthorized to update workspace' }, 403)
        }

        const [updated] = await db.update(workspaces)
            .set({ ...body, updatedAt: new Date() })
            .where(eq(workspaces.id, id))
            .returning()

        return c.json({ data: updated })
    } catch (error) {
        return c.json({ error: 'Failed to update workspace', details: String(error) }, 500)
    }
})

// DELETE /api/workspaces/:id - Delete workspace (requires workspace.deleteWorkspace - only owner)
workspacesRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const userId = c.req.header('x-user-id') || 'temp-user-id'

    try {
        // Get user's workspace role
        const workspaceRole = await getUserWorkspaceRole(userId, id)

        if (!canDeleteWorkspace(workspaceRole)) {
            return c.json({ error: 'Only owner can delete workspace' }, 403)
        }

        await db.delete(workspaces).where(eq(workspaces.id, id))

        return c.json({ message: 'Workspace deleted successfully' })
    } catch (error) {
        return c.json({ error: 'Failed to delete workspace', details: String(error) }, 500)
    }
})

// POST /api/workspaces/:id/members - Add member to workspace (requires workspace.manageMembers)
workspacesRoutes.post('/:id/members', async (c) => {
    const workspaceId = c.req.param('id')
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { userId: newMemberId, role = 'member' } = body

    try {
        // Get user's workspace role
        const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)

        if (!canManageWorkspaceMembers(workspaceRole)) {
            return c.json({ error: 'Unauthorized to manage workspace members' }, 403)
        }

        const [member] = await db.insert(workspaceMembers).values({
            workspaceId,
            userId: newMemberId,
            role,
            invitedBy: userId,
        }).returning()

        return c.json({ data: member }, 201)
    } catch (error) {
        return c.json({ error: 'Failed to add member', details: String(error) }, 500)
    }
})

// DELETE /api/workspaces/:id/members/:memberId - Remove member from workspace
workspacesRoutes.delete('/:id/members/:memberId', async (c) => {
    const workspaceId = c.req.param('id')
    const memberId = c.req.param('memberId')
    const userId = c.req.header('x-user-id') || 'temp-user-id'

    try {
        // Get user's workspace role
        const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)

        // Can remove if: is the member themselves OR has manageMembers permission
        const isSelf = memberId === userId
        if (!isSelf && !canManageWorkspaceMembers(workspaceRole)) {
            return c.json({ error: 'Unauthorized to remove workspace members' }, 403)
        }

        await db.delete(workspaceMembers)
            .where(eq(workspaceMembers.id, memberId))

        return c.json({ message: 'Member removed from workspace' })
    } catch (error) {
        return c.json({ error: 'Failed to remove member', details: String(error) }, 500)
    }
})
