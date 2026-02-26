import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, asc } from 'drizzle-orm'
import { db } from '../../db'
import { fileAnnotations, files } from '../../db/schema/files'
import { authMiddleware } from '@/middleware/auth'
import { type Auth } from '../../lib/auth'
import { zSanitizedString } from '../../lib/zod-extensions'
import type { WorkspaceRole } from '../../lib/permissions'

const app = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

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

app.use('*', authMiddleware)

// -----------------------------------------------------------------------------
// GET /api/annotations?fileId=XXX - List annotations for a file
// -----------------------------------------------------------------------------
const listSchema = z.object({
    fileId: z.string(),
})

app.get('/', zValidator('query', listSchema), async (c) => {
    const { fileId } = c.req.valid('query')

    const results = await db.query.fileAnnotations.findMany({
        where: eq(fileAnnotations.fileId, fileId),
        with: {
            user: {
                columns: { id: true, name: true, image: true }
            },
            replies: {
                with: {
                    user: {
                        columns: { id: true, name: true, image: true }
                    }
                },
                orderBy: [asc(fileAnnotations.createdAt)]
            }
        },
        orderBy: [asc(fileAnnotations.pageNumber), asc(fileAnnotations.createdAt)]
    })

    // Only return top-level annotations (not replies)
    const topLevel = results.filter(a => !a.parentId)

    return c.json({ data: topLevel })
})

// -----------------------------------------------------------------------------
// POST /api/annotations - Create annotation
// -----------------------------------------------------------------------------
const createSchema = z.object({
    fileId: z.string(),
    content: zSanitizedString(),
    pageNumber: z.number().int().optional().nullable(),
    positionX: z.number().int().min(0).max(100).optional().nullable(),
    positionY: z.number().int().min(0).max(100).optional().nullable(),
    type: z.enum(['comment', 'highlight']).default('comment'),
    parentId: z.string().optional().nullable(),
})

app.post('/', zValidator('json', createSchema), async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    // Verify file exists and get workspace
    const file = await db.query.files.findFirst({
        where: eq(files.id, body.fileId)
    })
    if (!file) return c.json({ error: 'File not found' }, 404)

    // Check workspace access
    const role = await getUserWorkspaceRole(user.id, file.workspaceId || '')
    if (!role) return c.json({ error: 'Forbidden' }, 403)

    const [created] = await db.insert(fileAnnotations).values({
        fileId: body.fileId,
        userId: user.id,
        content: body.content,
        pageNumber: body.pageNumber ?? null,
        positionX: body.positionX ?? null,
        positionY: body.positionY ?? null,
        type: body.type,
        parentId: body.parentId ?? null,
    }).returning()

    // Return with user info
    const result = await db.query.fileAnnotations.findFirst({
        where: eq(fileAnnotations.id, created.id),
        with: {
            user: {
                columns: { id: true, name: true, image: true }
            }
        }
    })

    return c.json({ data: result }, 201)
})

// -----------------------------------------------------------------------------
// PATCH /api/annotations/:id - Update annotation
// -----------------------------------------------------------------------------
const updateSchema = z.object({
    content: zSanitizedString().optional(),
    resolved: z.boolean().optional(),
})

app.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')
    const body = c.req.valid('json')

    const annotation = await db.query.fileAnnotations.findFirst({
        where: eq(fileAnnotations.id, id)
    })
    if (!annotation) return c.json({ error: 'Annotation not found' }, 404)

    // Only author can edit content, anyone can resolve
    if (body.content && annotation.userId !== user.id) {
        return c.json({ error: 'Only the author can edit this annotation' }, 403)
    }

    const [updated] = await db.update(fileAnnotations)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(fileAnnotations.id, id))
        .returning()

    return c.json({ data: updated })
})

// -----------------------------------------------------------------------------
// DELETE /api/annotations/:id - Delete annotation
// -----------------------------------------------------------------------------
app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const user = c.get('user')

    const annotation = await db.query.fileAnnotations.findFirst({
        where: eq(fileAnnotations.id, id)
    })
    if (!annotation) return c.json({ error: 'Annotation not found' }, 404)

    // Only author can delete
    if (annotation.userId !== user.id) {
        return c.json({ error: 'Only the author can delete this annotation' }, 403)
    }

    // Delete replies first, then the annotation itself
    await db.delete(fileAnnotations).where(eq(fileAnnotations.parentId, id))
    await db.delete(fileAnnotations).where(eq(fileAnnotations.id, id))

    return c.json({ success: true })
})

export default app
