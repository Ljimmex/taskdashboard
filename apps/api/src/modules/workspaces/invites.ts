import { Hono } from 'hono'
import { db } from '../../db'
import { workspaceInvites, workspaceMembers } from '../../db/schema/workspaces'
import { eq, and } from 'drizzle-orm'
import { auth } from '../../lib/auth'
import { canManageInvitations, type WorkspaceRole } from '../../lib/permissions'
import { triggerWebhook } from '../webhooks/trigger'

export const workspaceInvitesRoutes = new Hono()

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

// =============================================================================
// POST /api/workspaces/:workspaceId/invites - Create invite
// = =============================================================================
workspaceInvitesRoutes.post('/:workspaceId/invites', async (c) => {
    const workspaceId = c.req.param('workspaceId')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const { email, role = 'member', expiresDays = 7, allowedDomains = [] } = await c.req.json()

    try {
        // Resolve workspaceId if it's a slug
        let internalWorkspaceId = workspaceId
        if (!workspaceId.includes('-')) { // Assuming UUIDs contain dashes, slugs don't
            const ws = await db.query.workspaces.findFirst({
                where: (w, { eq }) => eq(w.slug, workspaceId)
            })
            if (ws) internalWorkspaceId = ws.id
        }

        const workspaceRole = await getUserWorkspaceRole(session.user.id, internalWorkspaceId)
        if (!canManageInvitations(workspaceRole, null)) {
            return c.json({ error: 'Forbidden: No permission to manage invitations' }, 403)
        }

        // Generate a random token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + Number(expiresDays))

        const [invite] = await db.insert(workspaceInvites).values({
            workspaceId: internalWorkspaceId,
            email: email?.toLowerCase() || null,
            token,
            role: role as WorkspaceRole,
            invitedBy: session.user.id,
            expiresAt,
            allowedDomains: allowedDomains || [],
        }).returning()

        return c.json({ success: true, data: invite }, 201)
    } catch (error) {
        console.error('Error creating invite:', error)
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack)
        }
        // Log the inputs to help debug
        console.error('Invite Inputs:', { workspaceId, email, role, expiresDays })
        return c.json({ error: 'Failed to create invitation', details: String(error) }, 500)
    }
})

// =============================================================================
// GET /api/workspaces/:workspaceId/invites - List invites
// =============================================================================
workspaceInvitesRoutes.get('/:workspaceId/invites', async (c) => {
    const workspaceId = c.req.param('workspaceId')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const workspaceRole = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!canManageInvitations(workspaceRole, null)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const invites = await db.query.workspaceInvites.findMany({
            where: (wi, { eq, and }) => and(
                eq(wi.workspaceId, workspaceId),
                eq(wi.status, 'pending')
            ),
            orderBy: (wi, { desc }) => [desc(wi.createdAt)]
        })

        return c.json({ success: true, data: invites })
    } catch (error) {
        console.error('Error fetching invites:', error)
        return c.json({ error: 'Failed to fetch invitations' }, 500)
    }
})

// =============================================================================
// DELETE /api/workspaces/:workspaceId/invites/:id - Revoke invite
// =============================================================================
workspaceInvitesRoutes.delete('/:workspaceId/invites/:id', async (c) => {
    const { workspaceId, id } = c.req.param()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const workspaceRole = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!canManageInvitations(workspaceRole, null)) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        const [revoked] = await db.update(workspaceInvites)
            .set({ status: 'revoked' })
            .where(and(
                eq(workspaceInvites.id, id),
                eq(workspaceInvites.workspaceId, workspaceId)
            ))
            .returning()

        if (!revoked) {
            return c.json({ error: 'Invite not found' }, 404)
        }

        return c.json({ success: true, data: revoked })
    } catch (error) {
        console.error('Error revoking invite:', error)
        return c.json({ error: 'Failed to revoke invitation' }, 500)
    }
})

// =============================================================================
// GET /api/workspaces/invites/resolve/:token - Public resolve
// =============================================================================
workspaceInvitesRoutes.get('/invites/resolve/:token', async (c) => {
    const token = c.req.param('token')

    try {
        const invite = await db.query.workspaceInvites.findFirst({
            where: (wi, { eq }) => eq(wi.token, token),
            with: {
                // We'll need to define relations in schema if we want workspace name
            }
        })

        if (!invite) {
            return c.json({ error: 'Invite not found' }, 404)
        }

        if (invite.status !== 'pending') {
            return c.json({ error: `Invite is already ${invite.status}` }, 400)
        }

        if (new Date() > invite.expiresAt) {
            return c.json({ error: 'Invite expired' }, 400)
        }

        // Get workspace info manually if relations aren't set up
        const workspace = await db.query.workspaces.findFirst({
            where: (w, { eq }) => eq(w.id, invite.workspaceId),
            columns: { name: true, slug: true, logo: true }
        })

        return c.json({
            success: true,
            data: {
                ...invite,
                workspace
            }
        })
    } catch (error) {
        console.error('Error resolving invite:', error)
        return c.json({ error: 'Failed to resolve token' }, 500)
    }
})

// =============================================================================
// POST /api/workspaces/invites/accept/:token - Accept invite
// =============================================================================
workspaceInvitesRoutes.post('/invites/accept/:token', async (c) => {
    const token = c.req.param('token')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized: Please log in to accept invite' }, 401)
    }

    try {
        const invite = await db.query.workspaceInvites.findFirst({
            where: (wi, { eq }) => eq(wi.token, token)
        })

        if (!invite || invite.status !== 'pending' || new Date() > invite.expiresAt) {
            return c.json({ error: 'Invite invalid or expired' }, 400)
        }

        // Domain restriction check
        if (invite.allowedDomains && invite.allowedDomains.length > 0) {
            const userDomain = session.user.email.split('@')[1]
            if (!invite.allowedDomains.includes(userDomain)) {
                return c.json({ error: `This invite is restricted to domains: ${invite.allowedDomains.join(', ')}` }, 403)
            }
        }

        // Email restriction check
        if (invite.email && invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
            return c.json({ error: 'This invite was sent to a different email address' }, 403)
        }

        // Join workspace
        await db.transaction(async (tx) => {
            // Check if already a member (even if suspended)
            const existing = await tx.query.workspaceMembers.findFirst({
                where: (wm, { eq, and }) => and(
                    eq(wm.userId, session.user.id),
                    eq(wm.workspaceId, invite.workspaceId)
                )
            })

            if (existing) {
                if (existing.status === 'active') {
                    // Already active, just accept invite record
                } else {
                    // Update to active
                    await tx.update(workspaceMembers)
                        .set({ status: 'active', role: invite.role, joinedAt: new Date() })
                        .where(eq(workspaceMembers.id, existing.id))
                }
            } else {
                // Create new membership
                await tx.insert(workspaceMembers).values({
                    workspaceId: invite.workspaceId,
                    userId: session.user.id,
                    role: invite.role,
                    invitedBy: invite.invitedBy,
                    status: 'active'
                })
            }

            // Mark invite as accepted
            await tx.update(workspaceInvites)
                .set({ status: 'accepted', acceptedAt: new Date() })
                .where(eq(workspaceInvites.id, invite.id))
        })

        // TRIGGER WEBHOOK
        triggerWebhook('member.joined', { userId: session.user.id, role: invite.role, workspaceId: invite.workspaceId }, invite.workspaceId)

        return c.json({ success: true, message: 'Joined workspace successfully' })
    } catch (error) {
        console.error('Error accepting invite:', error)
        return c.json({ error: 'Failed to join workspace' }, 500)
    }
})
