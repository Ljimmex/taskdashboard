import { Hono } from 'hono'
import { eq, or, like, and } from 'drizzle-orm'
import { db } from '../../db'
import { workspaces, workspaceMembers } from '../../db/schema/workspaces'
import { users } from '../../db/schema/users'
import { auth } from '../../lib/auth'
import {
    canManageWorkspaceSettings,
    canManageWorkspaceMembers,
    canDeleteWorkspace,
    type WorkspaceRole
} from '../../lib/permissions'
import { encryptionKeys } from '../../db/schema/encryption'
import { decryptPrivateKey } from '../../lib/server-encryption'

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

// GET /api/workspaces/slug/:slug - Get workspace by slug
workspacesRoutes.get('/slug/:slug', async (c) => {
    const slug = c.req.param('slug')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const workspace = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.slug, slug)
        })

        if (!workspace) {
            return c.json({ error: 'Workspace not found' }, 404)
        }

        // Check if user is a member
        const member = await db.query.workspaceMembers.findFirst({
            where: (wm, { eq, and }) => and(
                eq(wm.userId, session.user.id),
                eq(wm.workspaceId, workspace.id)
            )
        })

        if (!member) {
            return c.json({ error: 'Access denied' }, 403)
        }

        return c.json(workspace)
    } catch (error) {
        return c.json({ error: 'Failed to fetch workspace', details: String(error) }, 500)
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

// GET /api/workspaces/:id/members - List members of workspace (with search)
workspacesRoutes.get('/:id/members', async (c) => {
    const workspaceId = c.req.param('id')
    const query = c.req.query('q')?.toLowerCase()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        // 1. Verify membership
        const workspaceRole = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!workspaceRole) {
            return c.json({ error: 'Access denied' }, 403)
        }

        // 2. Fetch members
        const members = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            position: users.position
        })
            .from(workspaceMembers)
            .innerJoin(users, eq(users.id, workspaceMembers.userId))
            .where(
                and(
                    eq(workspaceMembers.workspaceId, workspaceId),
                    query ? or(
                        like(users.name, `%${query}%`),
                        like(users.email, `%${query}%`)
                    ) : undefined
                )
            )

        return c.json({ data: members })
    } catch (error) {
        console.error('Fetch members error:', error)
        return c.json({ error: 'Failed to fetch members', details: String(error) }, 500)
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

// GET /api/workspaces/:id/keys - Get encryption keys (member access)
workspacesRoutes.get('/:id/keys', async (c) => {
    const workspaceId = c.req.param('id')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const userId = session.user.id

    try {
        // Check if user is a member
        const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)
        if (!workspaceRole) {
            return c.json({ error: 'Access denied' }, 403)
        }

        // Fetch keys from DB
        const keys = await db.select()
            .from(encryptionKeys)
            .where(eq(encryptionKeys.workspaceId, workspaceId))
            .limit(1)

        if (keys.length === 0) {
            return c.json({ error: 'Encryption keys not found for this workspace' }, 404)
        }

        const keyRecord = keys[0]

        // Decrypt the private key
        let decryptedPrivateKey: string
        try {
            decryptedPrivateKey = decryptPrivateKey(keyRecord.encryptedPrivateKey)
        } catch (decError) {
            console.error('Failed to decrypt private key for workspace', workspaceId, decError)
            return c.json({ error: 'Server error: keys corrupted' }, 500)
        }

        return c.json({
            data: {
                workspaceId: workspaceId,
                publicKey: keyRecord.publicKey,
                privateKey: decryptedPrivateKey,
                expiresAt: keyRecord.expiresAt
            }
        })
    } catch (error) {
        return c.json({ error: 'Failed to fetch encryption keys', details: String(error) }, 500)
    }
})

// POST /api/workspaces/:id/rotate-keys - Rotate workspace encryption keys (owner only)
workspacesRoutes.post('/:id/rotate-keys', async (c) => {
    const workspaceId = c.req.param('id')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }
    const userId = session.user.id

    try {
        // Only workspace owner can rotate keys
        const workspace = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.id, workspaceId)
        })

        if (!workspace || workspace.ownerId !== userId) {
            return c.json({ error: 'Only workspace owner can rotate keys' }, 403)
        }

        // Get old keys
        const oldKeys = await db.select()
            .from(encryptionKeys)
            .where(eq(encryptionKeys.workspaceId, workspaceId))
            .limit(1)

        if (oldKeys.length === 0) {
            return c.json({ error: 'No existing keys to rotate' }, 404)
        }

        const oldKeyRecord = oldKeys[0]
        const oldPrivateKey = decryptPrivateKey(oldKeyRecord.encryptedPrivateKey)

        // Generate new RSA key pair
        const { generateKeyPairSync, randomBytes, createCipheriv, scryptSync } = await import('node:crypto')

        const { publicKey: newPublicKey, privateKey: newPrivateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        })

        // Encrypt new private key
        const SECRET = process.env.BETTER_AUTH_SECRET || 'default-secret'
        const masterKey = scryptSync(SECRET, 'salt', 32)
        const iv = randomBytes(16)
        const cipher = createCipheriv('aes-256-gcm', masterKey, iv)

        let encrypted = cipher.update(newPrivateKey, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        const authTag = cipher.getAuthTag().toString('hex')
        const encryptedNewPrivateKey = `${iv.toString('hex')}:${authTag}:${encrypted}`

        // Calculate new expiration (90 days from now)
        const newExpiresAt = new Date()
        newExpiresAt.setDate(newExpiresAt.getDate() + 90)

        // Update encryption_keys table
        await db.update(encryptionKeys)
            .set({
                publicKey: newPublicKey,
                encryptedPrivateKey: encryptedNewPrivateKey,
                rotatedAt: new Date(),
                expiresAt: newExpiresAt
            })
            .where(eq(encryptionKeys.id, oldKeyRecord.id))

        console.log(`✅ Keys rotated for workspace ${workspaceId}`)

        // Return old private key (for re-encryption) + new keys
        return c.json({
            data: {
                oldPrivateKey: oldPrivateKey,
                oldPublicKey: oldKeyRecord.publicKey,
                newPublicKey: newPublicKey,
                newPrivateKey: newPrivateKey, // Frontend needs this to save to IndexedDB
                expiresAt: newExpiresAt
            }
        })
    } catch (error) {
        console.error('Key rotation error:', error)
        return c.json({ error: 'Failed to rotate keys', details: String(error) }, 500)
    }
})
