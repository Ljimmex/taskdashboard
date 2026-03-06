import { Hono } from 'hono'
import { db } from '../../db'
import { documents, type NewDocument } from '../../db/schema/documents'
import { type Auth } from '../../lib/auth'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString, zSanitizedStringOptional } from '../../lib/zod-extensions'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

const createDocSchema = z.object({
    title: zSanitizedString(),
    content: z.any().optional(),
    workspaceId: z.string(),
})

const updateDocSchema = z.object({
    title: zSanitizedStringOptional(),
    content: z.any().optional(),
    isArchived: z.boolean().optional(),
})

export const docsRoutes = new Hono<Env>()

// Helper: Resolve workspaceId — accepts either a workspace UUID or a slug
async function resolveWorkspaceId(workspaceIdOrSlug: string): Promise<string | null> {
    try {
        const byId = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.id, workspaceIdOrSlug),
            columns: { id: true }
        })
        if (byId) return byId.id

        const bySlug = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.slug, workspaceIdOrSlug),
            columns: { id: true }
        })
        return bySlug?.id || null
    } catch (error) {
        console.error('resolveWorkspaceId error:', error)
        return null
    }
}

// Helper: Get user's workspace role
async function getUserWorkspaceRole(userId: string, workspaceId: string) {
    const member = await db.query.workspaceMembers.findFirst({
        where: (wm, { eq, and }) => and(
            eq(wm.userId, userId),
            eq(wm.workspaceId, workspaceId),
            eq(wm.status, 'active')
        )
    })
    return member?.role || null
}

// GET /api/docs - List documents for a workspace
docsRoutes.get('/', async (c) => {
    try {
        const user = c.get('user')
        const workspaceIdOrSlug = c.req.query('workspaceId')

        if (!workspaceIdOrSlug) {
            return c.json({ success: false, error: 'workspaceId is required' }, 400)
        }

        const workspaceId = await resolveWorkspaceId(workspaceIdOrSlug)
        if (!workspaceId) {
            return c.json({ success: false, error: 'Workspace not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, workspaceId)
        if (!role) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        const result = await db.query.documents.findMany({
            where: (d, { eq, and }) => and(
                eq(d.workspaceId, workspaceId),
                eq(d.isArchived, false)
            ),
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: [desc(documents.updatedAt)]
        })

        return c.json({ success: true, data: result })
    } catch (error: any) {
        console.error('GET /api/docs error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// GET /api/docs/:id - Get single document
docsRoutes.get('/:id', async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')

        const doc = await db.query.documents.findFirst({
            where: (d, { eq }) => eq(d.id, id),
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                }
            }
        })

        if (!doc) {
            return c.json({ success: false, error: 'Document not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, doc.workspaceId)
        if (!role) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        return c.json({ success: true, data: doc })
    } catch (error: any) {
        console.error('GET /api/docs/:id error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// POST /api/docs - Create document
docsRoutes.post('/', zValidator('json', createDocSchema, (result, c) => {
    if (!result.success) {
        console.error('Zod Validation Error on createDocSchema:', result.error.errors)
        return c.json({ success: false, error: 'Validation failed', details: result.error.errors }, 400)
    }
}), async (c) => {
    try {
        const user = c.get('user')
        const body = c.req.valid('json')

        const workspaceId = await resolveWorkspaceId(body.workspaceId)
        if (!workspaceId) {
            return c.json({ success: false, error: 'Workspace not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, workspaceId)
        if (!role) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        const newDoc: NewDocument = {
            workspaceId: workspaceId,
            title: body.title,
            content: body.content || {},
            createdBy: user.id,
        }

        const [created] = await db.insert(documents).values(newDoc).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error: any) {
        console.error('POST /api/docs error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// PATCH /api/docs/:id - Update document
docsRoutes.patch('/:id', zValidator('json', updateDocSchema), async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')
        const body = c.req.valid('json')

        const doc = await db.query.documents.findFirst({
            where: (d, { eq }) => eq(d.id, id)
        })

        if (!doc) {
            return c.json({ success: false, error: 'Document not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, doc.workspaceId)
        if (!role) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        const updateData: any = { ...body, updatedAt: new Date() }
        const [updated] = await db.update(documents).set(updateData).where(eq(documents.id, id)).returning()

        return c.json({ success: true, data: updated })
    } catch (error: any) {
        console.error('PATCH /api/docs/:id error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// DELETE /api/docs/:id - Delete document (soft delete)
docsRoutes.delete('/:id', async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')

        const doc = await db.query.documents.findFirst({
            where: (d, { eq }) => eq(d.id, id)
        })

        if (!doc) {
            return c.json({ success: false, error: 'Document not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, doc.workspaceId)
        if (!role || !['owner', 'admin'].includes(role) && doc.createdBy !== user.id) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        const [updated] = await db.update(documents)
            .set({ isArchived: true, updatedAt: new Date() })
            .where(eq(documents.id, id))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error: any) {
        console.error('DELETE /api/docs/:id error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})
