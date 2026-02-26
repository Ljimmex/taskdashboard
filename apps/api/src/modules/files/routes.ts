import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, desc, sql, ilike } from 'drizzle-orm'
import { db } from '../../db'
import { files, NewFileRecord } from '../../db/schema/files'
// workspaceMembers accessed via db.query, no direct import needed

import { getUploadUrl, getDownloadUrl, deleteFile, checkFileExists, getPreviewUrl, getFileContent, putFileContent } from '../../lib/r2'
import { authMiddleware } from '@/middleware/auth'

import { type Auth } from '../../lib/auth'
import { triggerWebhook } from '../webhooks/trigger'
import type { WorkspaceRole } from '../../lib/permissions'

// type Env removed

const app = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

// Helper: Get user's workspace role (blocks suspended members)
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

// Apply auth middleware to all routes
app.use('*', authMiddleware)

// -----------------------------------------------------------------------------
// POST /files/upload - Get presigned URL for upload and create metadata
// -----------------------------------------------------------------------------
import { zSanitizedString } from '../../lib/zod-extensions'

// ...

const uploadSchema = z.object({
    name: zSanitizedString(),
    size: z.number().int().nonnegative(),
    mimeType: z.string(),
    folderId: z.string().optional(),
    workspaceId: z.string(),
    teamId: z.string().optional().nullable(),
    taskId: z.string().optional().nullable(),
})

const filesQuerySchema = z.object({
    workspaceId: z.string(),
    folderId: z.string().optional(),
    search: z.string().optional(),
    type: z.string().optional(),
})

app.post('/upload', zValidator('json', uploadSchema), async (c) => {
    const body = c.req.valid('json')
    const user = c.get('user')

    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    // Check workspace membership status (blocks suspended users)
    const workspaceRole = await getUserWorkspaceRole(user.id, body.workspaceId)
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

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

    // TRIGGER WEBHOOK
    if (newFile) {
        triggerWebhook('file.uploaded', newFile, body.workspaceId)
    }

    return c.json({
        uploadUrl,
        file: newFile
    })
})

// -----------------------------------------------------------------------------
// GET /files - List files with filters
// -----------------------------------------------------------------------------
app.get('/', zValidator('query', filesQuerySchema), async (c) => {
    const { workspaceId, folderId, search, type } = c.req.valid('query')

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

    const conditions = [
        eq(files.workspaceId, workspaceId),
        eq(files.isArchived, false)
    ]

    // Folder filtering logic:
    // - If folderId is provided and is 'root': show files WHERE folderId IS NULL (which includes task files implicitly if they have no folder)
    // - If folderId is a specific UUID: show files strictly WHERE folderId = UUID
    // - If no folderId: show all files (including task attachments)
    if (folderId) {
        if (folderId === 'root') {
            // Root: files with no explicit folder assignment
            conditions.push(
                sql`${files.folderId} IS NULL`
            )
        } else {
            // Specific folder: ONLY files exactly explicitly in this folder
            conditions.push(
                eq(files.folderId, folderId)
            )
        }
    }
    // If no folderId specified, show ALL files (no additional filter)

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

    // Verify if file exists in R2
    const exists = await checkFileExists(file.r2Key)
    if (!exists) {
        console.warn(`File missing in R2: ${file.r2Key}`)
        return c.json({ error: 'File content missing in storage' }, 404)
    }

    const downloadUrl = await getDownloadUrl(file.r2Key, file.name)

    return c.json({ downloadUrl })
})

// -----------------------------------------------------------------------------
// GET /files/:id/preview - Get inline preview URL (no download prompt)
// -----------------------------------------------------------------------------
app.get('/:id/preview', async (c) => {
    const id = c.req.param('id')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file || !file.r2Key) {
        return c.json({ error: 'File not found' }, 404)
    }

    const exists = await checkFileExists(file.r2Key)
    if (!exists) {
        return c.json({ error: 'File content missing in storage' }, 404)
    }

    const previewUrl = await getPreviewUrl(file.r2Key)
    return c.json({ previewUrl, file })
})

// -----------------------------------------------------------------------------
// GET /files/:id/content - Get raw text content for editing
// -----------------------------------------------------------------------------
app.get('/:id/content', async (c) => {
    const id = c.req.param('id')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file || !file.r2Key) {
        return c.json({ error: 'File not found' }, 404)
    }

    // Only allow text-based files
    const textTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/html', 'text/css', 'text/javascript', 'application/xml']
    const isText = textTypes.some(t => file.mimeType?.startsWith(t)) ||
        ['txt', 'md', 'csv', 'json', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'xml', 'yaml', 'yml', 'env', 'log'].includes(file.fileType || '')

    if (!isText) {
        return c.json({ error: 'File is not a text-based format' }, 400)
    }

    const exists = await checkFileExists(file.r2Key)
    if (!exists) {
        return c.json({ error: 'File content missing in storage' }, 404)
    }

    const content = await getFileContent(file.r2Key)
    return c.json({ content, file })
})

// -----------------------------------------------------------------------------
// PUT /files/:id/content - Overwrite text file content
// -----------------------------------------------------------------------------
const contentUpdateSchema = z.object({
    content: z.string(),
})

app.put('/:id/content', zValidator('json', contentUpdateSchema), async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')
    const { content } = c.req.valid('json')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file || !file.r2Key) {
        return c.json({ error: 'File not found' }, 404)
    }

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, file.workspaceId || '')
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

    await putFileContent(file.r2Key, content, file.mimeType || 'text/plain')

    // Update file size in DB
    const newSize = new TextEncoder().encode(content).length
    const [updated] = await db.update(files)
        .set({ size: newSize, updatedAt: new Date() })
        .where(eq(files.id, id))
        .returning()

    return c.json({ success: true, file: updated })
})

// -----------------------------------------------------------------------------
// PATCH /files/:id - Rename / Move
// -----------------------------------------------------------------------------
const updateSchema = z.object({
    name: zSanitizedString().optional(),
    folderId: z.string().nullable().optional(),
})

app.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')
    const body = c.req.valid('json')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file) return c.json({ error: 'File not found' }, 404)

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, file.workspaceId || '')
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

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
    const user = c.get('user')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file) return c.json({ error: 'File not found' }, 404)

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, file.workspaceId || '')
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

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
    const user = c.get('user')

    if (!user) return c.json({ error: 'Unauthorized' }, 401)

    const originalFile = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!originalFile || !originalFile.r2Key) {
        return c.json({ error: 'Original file not found' }, 404)
    }

    // Generate new R2 key for the copy
    const fileExt = originalFile.name.split('.').pop() || ''
    const newR2Key = `${originalFile.workspaceId}/${crypto.randomUUID()}.${fileExt}`

    try {
        // Copy the file in R2
        const { copyFile } = await import('../../lib/r2')
        await copyFile(originalFile.r2Key, newR2Key)

        // Create new database record
        const [newFile] = await db.insert(files).values({
            name: `${originalFile.name.replace(`.${fileExt}`, '')} (copy).${fileExt}`,
            path: newR2Key,
            r2Key: newR2Key,
            size: originalFile.size,
            mimeType: originalFile.mimeType,
            fileType: originalFile.fileType,
            workspaceId: originalFile.workspaceId,
            folderId: originalFile.folderId,
            teamId: originalFile.teamId,
            taskId: originalFile.taskId,
            uploadedBy: user.id,
        } as NewFileRecord).returning()

        // TRIGGER WEBHOOK
        if (newFile && originalFile.workspaceId) {
            triggerWebhook('file.uploaded', newFile, originalFile.workspaceId)
        }

        return c.json(newFile)
    } catch (error) {
        console.error('Failed to duplicate file:', error)
        return c.json({ error: 'Failed to duplicate file' }, 500)
    }
})


// -----------------------------------------------------------------------------
// DELETE /files/:id - Delete file
// -----------------------------------------------------------------------------
app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')

    const file = await db.query.files.findFirst({
        where: eq(files.id, id)
    })

    if (!file) return c.json({ success: true }) // idempotent

    // Check workspace membership status
    const workspaceRole = await getUserWorkspaceRole(user.id, file.workspaceId || '')
    if (!workspaceRole) {
        return c.json({ error: 'Forbidden: No active workspace access' }, 403)
    }

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

    // TRIGGER WEBHOOK
    if (file.workspaceId) {
        triggerWebhook('file.deleted', file, file.workspaceId)
    }

    return c.json({ success: true })
})

export default app
