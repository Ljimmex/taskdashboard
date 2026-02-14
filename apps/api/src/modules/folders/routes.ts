import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../../db'
import { folders } from '../../db/schema/folders'
import { workspaceMembers } from '../../db/schema/workspaces'
import { authMiddleware } from '@/middleware/auth'

import { type Auth } from '../../lib/auth'
import { triggerWebhook } from '../webhooks/trigger'
import type { WorkspaceRole } from '../../lib/permissions'

// type Env removed

const app = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

const foldersQuerySchema = z.object({
    workspaceId: z.string(),
    parentId: z.string().optional(),
})

// Helper: Get user's workspace role (blocks suspended members)
async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const [member] = await db.select()
        .from(workspaceMembers)
        .where(
            and(
                eq(workspaceMembers.userId, userId),
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.status, 'active')
            )
        )
        .limit(1)
    return (member?.role as WorkspaceRole) || null
}

app.use('*', authMiddleware)

// -----------------------------------------------------------------------------
// GET /folders - List folders
// -----------------------------------------------------------------------------
app.get('/', zValidator('query', foldersQuerySchema), async (c) => {
    const user = c.get('user')
    const { workspaceId, parentId } = c.req.valid('query')

    if (!workspaceId) {
        return c.json({ error: 'Workspace ID is required' }, 400)
    }

    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, workspaceId)
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

    const conditions = [
        eq(folders.workspaceId, workspaceId)
    ]

    if (parentId) {
        if (parentId === 'root') {
            conditions.push(sql`${folders.parentId} IS NULL`)
        } else {
            conditions.push(eq(folders.parentId, parentId))
        }
    }

    const results = await db.select().from(folders)
        .where(and(...conditions))
        .orderBy(desc(folders.createdAt))

    // Calculate folder sizes by summing file sizes
    const { files } = await import('../../db/schema/files')
    const foldersWithSizes = await Promise.all(results.map(async (folder) => {
        const sizeResult = await db
            .select({ totalSize: sql<number>`COALESCE(SUM(${files.size}), 0)` })
            .from(files)
            .where(eq(files.folderId, folder.id))

        return {
            ...folder,
            size: Number(sizeResult[0]?.totalSize || 0)
        }
    }))

    return c.json({ data: foldersWithSizes })
})

// -----------------------------------------------------------------------------
// POST /folders - Create folder
// -----------------------------------------------------------------------------
import { zSanitizedString } from '../../lib/zod-extensions'

// ...

const createSchema = z.object({
    name: zSanitizedString(),
    workspaceId: z.string(),
    parentId: z.string().optional().nullable(),
})

app.post('/', zValidator('json', createSchema), async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, body.workspaceId)
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

    const [newFolder] = await db.insert(folders).values({
        name: body.name,
        workspaceId: body.workspaceId,
        parentId: body.parentId || null,
        createdById: user?.id,
    }).returning()

    // TRIGGER WEBHOOK
    if (newFolder) {
        triggerWebhook('folder.created', newFolder, body.workspaceId)
    }

    return c.json(newFolder)
})

// -----------------------------------------------------------------------------
// PATCH /folders/:id - Rename / Move
// -----------------------------------------------------------------------------
const updateSchema = z.object({
    name: zSanitizedString().optional(),
    parentId: z.string().nullable().optional(),
})

app.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')
    const body = c.req.valid('json')

    const folder = await db.query.folders.findFirst({
        where: eq(folders.id, id)
    })

    if (!folder) return c.json({ error: 'Folder not found' }, 404)

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, folder.workspaceId)
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

    const [updated] = await db.update(folders)
        .set({
            ...body,
            updatedAt: new Date()
        })
        .where(eq(folders.id, id))
        .returning()

    // TRIGGER WEBHOOK
    if (updated) {
        triggerWebhook('folder.updated', updated, updated.workspaceId)
    }

    return c.json(updated)
})

// -----------------------------------------------------------------------------
// DELETE /folders/:id - Delete folder
// -----------------------------------------------------------------------------
app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')

    // Get folder for workspaceId before delete
    const [folder] = await db.select().from(folders).where(eq(folders.id, id)).limit(1)

    if (!folder) return c.json({ success: true })

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, folder.workspaceId)
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

    await db.delete(folders).where(eq(folders.id, id))

    // TRIGGER WEBHOOK
    if (folder) {
        triggerWebhook('folder.deleted', folder, folder.workspaceId)
    }

    return c.json({ success: true })
})

export default app
