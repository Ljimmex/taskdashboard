import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../../db'
import { folders } from '../../db/schema/folders'
import { authMiddleware } from '@/middleware/auth'

import { auth } from '../../lib/auth'
import { triggerWebhook } from '../webhooks/trigger'

type Env = {
    Variables: {
        user: typeof auth.$Infer.Session.user
        session: typeof auth.$Infer.Session.session
    }
}

const app = new Hono<Env>()

app.use('*', authMiddleware)

// -----------------------------------------------------------------------------
// GET /folders - List folders
// -----------------------------------------------------------------------------
app.get('/', async (c) => {
    const workspaceId = c.req.query('workspaceId')
    const parentId = c.req.query('parentId')

    if (!workspaceId) {
        return c.json({ error: 'Workspace ID is required' }, 400)
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
const createSchema = z.object({
    name: z.string().min(1),
    workspaceId: z.string(),
    parentId: z.string().optional().nullable(),
})

app.post('/', zValidator('json', createSchema), async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')

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
    name: z.string().optional(),
    parentId: z.string().nullable().optional(),
})

app.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

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

    // Database cascade should handle subfolders and files if configured, 
    // BUT files.r2Key deletion needs handling.
    // For MVP, simplistic delete. 
    // Ideally: Use a recursive query to find all file keys to delete from R2, then DB delete.

    // Get folder for workspaceId before delete
    const [folder] = await db.select().from(folders).where(eq(folders.id, id)).limit(1)

    await db.delete(folders).where(eq(folders.id, id))

    // TRIGGER WEBHOOK
    if (folder) {
        triggerWebhook('folder.deleted', folder, folder.workspaceId)
    }

    return c.json({ success: true })
})

export default app
