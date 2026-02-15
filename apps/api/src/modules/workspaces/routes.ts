import { Hono } from 'hono'
import { eq, or, like, and, sql, inArray } from 'drizzle-orm'
import { db } from '../../db'
import { workspaces, workspaceMembers } from '../../db/schema/workspaces'
import { users } from '../../db/schema/users'
import { teams, teamMembers } from '../../db/schema/teams'
import { projects } from '../../db/schema/projects'
import { tasks } from '../../db/schema/tasks'
import { auth, type Auth } from '../../lib/auth'
import {
    canManageWorkspaceSettings,
    canManageWorkspaceMembers,
    canDeleteWorkspace,
    type WorkspaceRole
} from '../../lib/permissions'
import { encryptionKeys } from '../../db/schema/encryption'
import { decryptPrivateKey, encryptPrivateKey } from '../../lib/server-encryption'
import { triggerWebhook } from '../webhooks/trigger'
import { workspaceInvitesRoutes } from './invites'
import { workspaceDefaultsRoutes } from './defaults'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString, zSanitizedStringOptional } from '../../lib/zod-extensions'

const createWorkspaceSchema = z.object({
    name: zSanitizedString(),
    slug: zSanitizedString(),
    teamSize: zSanitizedStringOptional(),
    industry: zSanitizedStringOptional(),
})

const updateWorkspaceSchema = z.object({
    name: zSanitizedStringOptional(),
    slug: zSanitizedStringOptional(),
    description: zSanitizedStringOptional(),
    logo: zSanitizedStringOptional(),
    settings: z.any().optional()
})

const addMemberSchema = z.object({
    userId: z.string(),
    role: z.enum(['owner', 'admin', 'member', 'guest', 'project_manager']).optional()
})

const workspaceMembersQuerySchema = z.object({
    q: z.string().optional(),
})

const updateWorkspaceMemberSchema = z.object({
    role: z.enum(['owner', 'admin', 'member', 'guest', 'project_manager']).optional(),
    status: z.enum(['active', 'suspended', 'invited']).optional(),
})

export const workspacesRoutes = new Hono<Env>()

// Mount sub-routes
workspacesRoutes.route('/', workspaceInvitesRoutes)
workspacesRoutes.route('/', workspaceDefaultsRoutes)

// Helper: Get user's workspace role (blocks suspended members)
export async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    // First try with 'active' status
    const [member] = await db.select({
        role: workspaceMembers.role,
        status: workspaceMembers.status
    })
        .from(workspaceMembers)
        .where(
            and(
                eq(workspaceMembers.userId, userId),
                eq(workspaceMembers.workspaceId, workspaceId)
            )
        )
        .limit(1)

    if (!member) {
        console.log(`[getUserWorkspaceRole] No membership found for user=${userId} workspace=${workspaceId}`)
        return null
    }

    // Only block suspended members
    if (member.status === 'suspended') {
        console.log(`[getUserWorkspaceRole] User ${userId} is suspended in workspace ${workspaceId}`)
        return null
    }

    console.log(`[getUserWorkspaceRole] Found role=${member.role} status=${member.status} for user=${userId}`)
    return (member.role as WorkspaceRole) || null
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
            .where(
                and(
                    eq(workspaceMembers.userId, userId),
                    sql`${workspaceMembers.status} IS DISTINCT FROM 'suspended'`
                )
            )

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

        return c.json({
            ...workspace,
            userRole: member.role
        })
    } catch (error) {
        return c.json({ error: 'Failed to fetch workspace', details: String(error) }, 500)
    }
})

// POST /api/workspaces - Create new workspace
workspacesRoutes.post('/', zValidator('json', createWorkspaceSchema), async (c) => {
    // Get Session using Better Auth
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = session.user.id

    const body = c.req.valid('json')
    const { name, slug, teamSize, industry } = body

    // if (!name || !slug) { ... } -> schema handles this

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

            // TRIGGER WEBHOOK for owner joining
            triggerWebhook('member.joined', { userId, role: 'owner', workspaceId: newWorkspace.id }, newWorkspace.id)

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
    const user = c.get('user') as any
    const userId = user.id

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
workspacesRoutes.patch('/:id', zValidator('json', updateWorkspaceSchema), async (c) => {
    const id = c.req.param('id')
    const user = c.get('user') as any
    const userId = user.id
    const body = c.req.valid('json')

    try {
        // Get user's workspace role
        const workspaceRole = await getUserWorkspaceRole(userId, id)

        if (!canManageWorkspaceSettings(workspaceRole)) {
            return c.json({ error: 'Unauthorized to update workspace' }, 403)
        }

        // Fetch current workspace to merge settings
        const currentWorkspace = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.id, id)
        })

        if (!currentWorkspace) {
            return c.json({ error: 'Workspace not found' }, 404)
        }

        // Prepare update data
        const updateData: any = {
            updatedAt: new Date()
        }

        if (body.name) updateData.name = body.name
        if (body.slug) updateData.slug = body.slug
        if (body.description) updateData.description = body.description
        if (body.logo) updateData.logo = body.logo
        if (body.settings) {
            updateData.settings = {
                ...currentWorkspace.settings,
                ...body.settings
            }
        }

        const [updated] = await db.update(workspaces)
            .set(updateData)
            .where(eq(workspaces.id, id))
            .returning()

        // TRIGGER WEBHOOK
        if (updated) {
            triggerWebhook('workspace.updated', updated, updated.id)
        }

        return c.json({ data: updated })
    } catch (error) {
        return c.json({ error: 'Failed to update workspace', details: String(error) }, 500)
    }
})

// DELETE /api/workspaces/:id - Delete workspace (requires workspace.deleteWorkspace - only owner)
workspacesRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user') as any
    const userId = user.id

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
workspacesRoutes.post('/:id/members', zValidator('json', addMemberSchema), async (c) => {
    const workspaceId = c.req.param('id')
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const userId = session.user.id
    const body = c.req.valid('json')
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

        // TRIGGER WEBHOOK
        if (member) {
            triggerWebhook('member.joined', member, workspaceId)
        }

        return c.json({ data: member }, 201)
    } catch (error) {
        return c.json({ error: 'Failed to add member', details: String(error) }, 500)
    }
})

// GET /api/workspaces/:id/members - List members of workspace (with search)
workspacesRoutes.get('/:id/members', zValidator('query', workspaceMembersQuerySchema), async (c) => {
    let workspaceId = c.req.param('id')
    console.log(`[DEBUG] GET /api/workspaces/${workspaceId}/members called`)
    const { q } = c.req.valid('query')
    const query = q?.toLowerCase()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        // Resolve slug to ID if needed (slugs don't look like UUIDs)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)
        if (!isUUID) {
            const ws = await db.query.workspaces.findFirst({
                where: (w, { eq }) => eq(w.slug, workspaceId)
            })
            if (!ws) return c.json({ error: 'Workspace not found' }, 404)
            workspaceId = ws.id
        }

        // 1. Verify membership
        const workspaceRole = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!workspaceRole) {
            return c.json({ error: 'Access denied' }, 403)
        }

        // 2. Fetch members - Use explicit column selection
        const rows = await db.select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            userImage: users.image,
            userPosition: users.position,
            memberRole: workspaceMembers.role,
            memberStatus: workspaceMembers.status,
            memberJoinedAt: workspaceMembers.joinedAt,
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

        // Debug first row structure
        if (rows.length > 0) {
            console.log('=== MEMBER QUERY DEBUG ===')
            console.log('Row Keys:', Object.keys(rows[0]))
            console.log('First Row:', rows[0])
            console.log('Member Role:', rows[0].memberRole)
            console.log('Joined At:', rows[0].memberJoinedAt)
        }

        const members = rows.map(row => ({
            user: {
                id: row.userId,
                name: row.userName,
                email: row.userEmail,
                image: row.userImage,
                position: row.userPosition,
            },
            role: row.memberRole,
            status: row.memberStatus,
            joinedAt: row.memberJoinedAt,
        }))

        console.log('Final Members:', JSON.stringify(members, null, 2))

        return c.json({ data: members })
    } catch (error) {
        console.error('Fetch members error:', error)
        return c.json({ error: 'Failed to fetch members', details: String(error) }, 500)
    }
})

// PATCH /api/workspaces/:id/members/:memberId - Update member role (requires workspace.manageMembers)
workspacesRoutes.patch('/:id/members/:memberId', zValidator('json', updateWorkspaceMemberSchema), async (c) => {
    const workspaceId = c.req.param('id')
    const memberId = c.req.param('memberId')
    const user = c.get('user') as any
    const userId = user.id
    const { role, status } = c.req.valid('json')

    if (!role && !status) {
        return c.json({ error: 'Role or status is required' }, 400)
    }

    try {
        // Get user's workspace role
        const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)

        if (!canManageWorkspaceMembers(workspaceRole)) {
            return c.json({ error: 'Unauthorized to manage workspace members' }, 403)
        }

        // Update the membership record
        const [updated] = await db.update(workspaceMembers)
            .set({
                ...(role && { role }),
                ...(status && { status })
            })
            .where(
                and(
                    eq(workspaceMembers.workspaceId, workspaceId),
                    eq(workspaceMembers.userId, memberId)
                )
            )
            .returning()

        if (!updated) {
            return c.json({ error: 'Member not found in workspace' }, 404)
        }

        // TRIGGER WEBHOOK
        triggerWebhook('member.updated', updated, workspaceId)

        return c.json({ data: updated })
    } catch (error) {
        return c.json({ error: 'Failed to update member role', details: String(error) }, 500)
    }
})

// DELETE /api/workspaces/:id/members/:memberId - Remove member from workspace (Comprehensive cleanup)
workspacesRoutes.delete('/:id/members/:memberId', async (c) => {
    const workspaceId = c.req.param('id')
    const memberId = c.req.param('memberId')
    const user = c.get('user') as any
    const userId = user.id

    try {
        // Get user's workspace role
        const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)

        // Can remove if: is the member themselves OR has manageMembers permission
        const isSelf = memberId === userId
        if (!isSelf && !canManageWorkspaceMembers(workspaceRole)) {
            return c.json({ error: 'Unauthorized to remove workspace members' }, 403)
        }

        // 1. Fetch member details BEFORE deletion to get the name for the webhook
        const memberUser = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, memberId),
            columns: { name: true, email: true }
        })

        // 2. Perform comprehensive cleanup in a transaction
        await db.transaction(async (tx) => {
            // A. Remove from Team Memberships
            const workspaceTeams = await tx.select({ id: teams.id }).from(teams).where(eq(teams.workspaceId, workspaceId))
            const teamIds = workspaceTeams.map(t => t.id)

            if (teamIds.length > 0) {
                await tx.delete(teamMembers)
                    .where(and(
                        eq(teamMembers.userId, memberId),
                        inArray(teamMembers.teamId, teamIds)
                    ))
            }

            // B. Unassign from Tasks
            let projectIds: string[] = []
            if (teamIds.length > 0) {
                const teamProjects = await tx.select({ id: projects.id })
                    .from(projects)
                    .where(inArray(projects.teamId, teamIds))
                projectIds = teamProjects.map(p => p.id)
            }

            if (projectIds.length > 0) {
                await tx.update(tasks)
                    .set({ assigneeId: null })
                    .where(and(
                        eq(tasks.assigneeId, memberId),
                        inArray(tasks.projectId, projectIds)
                    ))
            }

            // C. Remove from Conversations (update JSONB)
            // JSONB operations still best done with raw SQL
            const scopeCondition = teamIds.length > 0
                ? sql`(workspace_id = ${workspaceId} OR team_id IN (${sql.join(teamIds.map(id => sql`${id}`))}))`
                : sql`workspace_id = ${workspaceId}`

            // Postgres array removal: participants - 'userId'
            // We use standard SQL interpolation for values
            await tx.execute(sql`
                UPDATE conversations
                SET 
                    participants = participants - ${memberId},
                    participant_states = participant_states - ${memberId}
                WHERE ${scopeCondition}
                AND participants @> ${JSON.stringify([memberId])}::jsonb
            `)

            // D. Remove from Workspace Members (The main action)
            await tx.delete(workspaceMembers)
                .where(
                    and(
                        eq(workspaceMembers.workspaceId, workspaceId),
                        eq(workspaceMembers.userId, memberId)
                    )
                )
        })

        // 3. Trigger Webhook with user name
        triggerWebhook('member.removed', {
            userId: memberId,
            workspaceId,
            userName: memberUser?.name || 'Unknown',
            userEmail: memberUser?.email || '',
            removedAt: new Date().toISOString()
        }, workspaceId)

        return c.json({ message: 'Member removed from workspace and all related entities' })
    } catch (error) {
        console.error('Remove member error:', error)
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

        // Helper to generate keys
        const generateAndSaveKeys = async (updateId?: string) => {
            const { generateKeyPairSync } = await import('node:crypto')
            const { publicKey, privateKey } = generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            })

            const encryptedPrivateKey = encryptPrivateKey(privateKey)

            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 90)

            if (updateId) {
                // Update existing corrupted record
                await db.update(encryptionKeys)
                    .set({
                        publicKey,
                        encryptedPrivateKey,
                        expiresAt,
                        rotatedAt: new Date()
                    })
                    .where(eq(encryptionKeys.id, updateId))
            } else {
                // Insert new record
                await db.insert(encryptionKeys).values({
                    workspaceId,
                    publicKey,
                    encryptedPrivateKey,
                    expiresAt
                })
            }

            return { publicKey, privateKey, expiresAt, history: [] as any[] }
        }

        // Fetch keys from DB
        const keys = await db.select()
            .from(encryptionKeys)
            .where(eq(encryptionKeys.workspaceId, workspaceId))
            .limit(1)

        let keyData: { publicKey: string; privateKey: string; expiresAt: Date | null; history: any[] }

        if (keys.length === 0) {
            console.log(`Keys missing for workspace ${workspaceId}, generating new ones...`)
            keyData = await generateAndSaveKeys()
        } else {
            const keyRecord = keys[0]
            try {
                const decrypted = decryptPrivateKey(keyRecord.encryptedPrivateKey)

                // Decrypt history too
                const decryptedHistory = (keyRecord.history || []).map(h => {
                    try {
                        return {
                            publicKey: h.publicKey,
                            privateKey: decryptPrivateKey(h.encryptedPrivateKey),
                            rotatedAt: h.rotatedAt
                        }
                    } catch (e) {
                        console.error('Failed to decrypt historical key', e)
                        return null
                    }
                }).filter(Boolean)

                keyData = {
                    publicKey: keyRecord.publicKey,
                    privateKey: decrypted,
                    expiresAt: keyRecord.expiresAt,
                    history: decryptedHistory
                }
            } catch (decError) {
                console.error('Keys corrupted for workspace', workspaceId)
                // STOP: No more self-healing regeneration. This causes permanent data loss if secret changed.
                return c.json({
                    error: 'Decryption failed for workspace keys',
                    message: 'Workspace keys are corrupted or server secret is misconfigured. Cannot proceed to avoid data loss.',
                    code: 'DECRYPTION_FAILED'
                }, 500)
            }
        }

        return c.json({
            data: {
                workspaceId: workspaceId,
                publicKey: keyData.publicKey,
                privateKey: keyData.privateKey,
                expiresAt: keyData.expiresAt,
                history: (keyData as any).history || []
            }
        })
    } catch (error) {
        console.error('Error fetching/generating keys:', error)
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
        const { generateKeyPairSync } = await import('node:crypto')

        const { publicKey: newPublicKey, privateKey: newPrivateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        })

        // Encrypt new private key
        const encryptedNewPrivateKey = encryptPrivateKey(newPrivateKey)

        // Calculate new expiration (90 days from now)
        const newExpiresAt = new Date()
        newExpiresAt.setDate(newExpiresAt.getDate() + 90)

        // Update encryption_keys table: Push current to history and set new
        const updatedHistory = [
            ...(oldKeyRecord.history || []),
            {
                publicKey: oldKeyRecord.publicKey,
                encryptedPrivateKey: oldKeyRecord.encryptedPrivateKey,
                rotatedAt: new Date().toISOString()
            }
        ]

        await db.update(encryptionKeys)
            .set({
                publicKey: newPublicKey,
                encryptedPrivateKey: encryptedNewPrivateKey,
                history: updatedHistory,
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
