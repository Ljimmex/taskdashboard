import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, desc, sql, ilike } from 'drizzle-orm'
import { db } from '../../db'
import { files, NewFileRecord } from '../../db/schema/files'

import { getUploadUrl, getDownloadUrl, deleteFile } from '../../lib/r2'
import { authMiddleware } from '@/middleware/auth'

import { auth } from '../../lib/auth'

type Env = {
    Variables: {
        user: typeof auth.$Infer.Session.user
        session: typeof auth.$Infer.Session.session
    }
}

const app = new Hono<Env>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

// -----------------------------------------------------------------------------
// POST /files/upload - Get presigned URL for upload and create metadata
// -----------------------------------------------------------------------------
const uploadSchema = z.object({
    name: z.string().min(1),
    size: z.number().int().nonnegative(),
    mimeType: z.string(),
    folderId: z.string().optional(),
    workspaceId: z.string(),
    teamId: z.string().optional().nullable(), // Make nullable to match schema
    taskId: z.string().optional().nullable(), // Make nullable to match schema
})

app.post('/upload', zValidator('json', uploadSchema), async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')

    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    // Generate a unique key for R2
    const fileExt = body.name.split('.').pop() || ''
    const r2Key = `${body.workspaceId}/${crypto.randomUUID()}.${fileExt}`

    // Get presigned URL
    const uploadUrl = await getUploadUrl(r2Key, body.mimeType)

    // Create file record in DB
    const [newFile] = await db.insert(files).values({
        name: body.name,
        path: r2Key, // We use the R2 key as path
        r2Key: r2Key,
        size: body.size,
        mimeType: body.mimeType,
        fileType: fileExt.toLowerCase(),
        workspaceId: body.workspaceId,
        folderId: body.folderId || null, // Ensure null if undefined
        teamId: body.teamId || null, // Ensure null if undefined
        taskId: body.taskId || null, // Ensure null if undefined
        uploadedBy: user.id,
    } as NewFileRecord).returning()

    return c.json({
        uploadUrl,
        file: newFile
    })
})

// -----------------------------------------------------------------------------
// GET /files - List files with filters
// -----------------------------------------------------------------------------
app.get('/', async (c) => {
    const workspaceId = c.req.query('workspaceId')
    const folderId = c.req.query('folderId')
    const search = c.req.query('search')
    const type = c.req.query('type') // 'pdf', 'image', etc.

    if (!workspaceId) {
        return c.json({ error: 'Workspace ID is required' }, 400)
    }



    // Filter by folder (handle root vs specific folder)
    // If folderId is provided, filter by it. 
    // If explicitly 'root', filter where folderId is NULL.
    // If not provided, we might default to root or all? Let's assume list relies on folderId usually.
    if (folderId === 'root' || !folderId) {
        // @ts-ignore - dizzzle types might be strict about null, but this works for "is null" check usually or use isNull()
        // actually better to check filter logic. For now, let's say if no folderId, we return all (e.g. search) or root?
        // Let's implement: if valid UUID provided -> exact match. If 'root' -> isNull.
    }

    // Actually, let's construct conditions array
    const conditions = [
        eq(files.workspaceId, workspaceId),
        eq(files.isArchived, false)
    ]

    if (folderId) {
        if (folderId === 'root') {
            conditions.push(sql`${files.folderId} IS NULL`)
        } else {
            conditions.push(eq(files.folderId, folderId))
        }
    }

    if (search) {
        conditions.push(ilike(files.name, `%${search}%`))
    }

    if (type) {
        // Simple mapping for common "types" to extensions or mime types could go here
        // For now assume exact extension match if short, or basic mime check
        if (['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'].includes(type.toLowerCase())) {
            conditions.push(eq(files.fileType, type.toLowerCase()))
        }
        // 'image' category
        else if (type === 'image') {
            conditions.push(ilike(files.mimeType, 'image/%'))
        }
    }

    const results = await db.select().from(files).where(and(...conditions)).orderBy(desc(files.createdAt))

    return c.json({ data: results })
})

// -----------------------------------------------------------------------------
// GET /files/:id/download - Get download URL
// -----------------------------------------------------------------------------
app.get('/:id/download', async (c) => {
    const id = c.req.param('id')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file || !file.r2Key) {
        return c.json({ error: 'File not found' }, 404)
    }

    const downloadUrl = await getDownloadUrl(file.r2Key)

    return c.json({ downloadUrl })
})

// -----------------------------------------------------------------------------
// PATCH /files/:id - Rename / Move
// -----------------------------------------------------------------------------
const updateSchema = z.object({
    name: z.string().optional(),
    folderId: z.string().nullable().optional(), // Nullable to move to root
})

app.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const [updated] = await db.update(files)
        .set({
            ...body,
            updatedAt: new Date()
        })
        .where(eq(files.id, id))
        .returning()

    return c.json(updated)
})

// -----------------------------------------------------------------------------
// PATCH /files/:id/archive - Archive file
// -----------------------------------------------------------------------------
app.patch('/:id/archive', async (c) => {
    const id = c.req.param('id')

    const [updated] = await db.update(files)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(files.id, id))
        .returning()

    return c.json(updated)
})

// -----------------------------------------------------------------------------
// POST /files/:id/duplicate - Duplicate file
// -----------------------------------------------------------------------------
app.post('/:id/duplicate', async (c) => {
    const id = c.req.param('id')
    // const user = c.get('user')

    const originalFile = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!originalFile || !originalFile.r2Key) {
        return c.json({ error: 'Original file not found' }, 404)
    }

    // Since R2/S3 CopyObject isn't exposed in our simple utility yet, 
    // we might need to add it or do a download/upload flow (inefficient for large files).
    // For now, let's assume we'll implement a 'copyFile' in r2.ts or just create a DB entry 
    // pointing to the same R2 key (but that deletes are dangerous then).
    // BEST PRACTICE: Copy the object in S3. 

    // For this MVP step, let's pretend we have copy capability or add it to r2.ts.
    // Let's defer actual R2 copy and just return error for now until r2.ts is updated.
    return c.json({ error: 'Not implemented' }, 501)
})


// -----------------------------------------------------------------------------
// DELETE /files/:id - Delete file
// -----------------------------------------------------------------------------
app.delete('/:id', async (c) => {
    const id = c.req.param('id')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file) return c.json({ success: true }) // idempotent

    // Delete from R2
    if (file.r2Key) {
        try {
            await deleteFile(file.r2Key)
        } catch (e) {
            console.error("Failed to delete from R2", e)
        }
    }

    // Delete from DB
    await db.delete(files).where(eq(files.id, id))

    return c.json({ success: true })
})

export default app
