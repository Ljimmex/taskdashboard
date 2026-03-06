import { Hono } from 'hono'
import { db } from '../../db'
import { whiteboards, type NewWhiteboard } from '../../db/schema/whiteboards'
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

const createWhiteboardSchema = z.object({
    name: zSanitizedString(),
    data: z.any().optional(),
    workspaceId: z.string(),
})

const updateWhiteboardSchema = z.object({
    name: zSanitizedStringOptional(),
    data: z.any().optional(),
    isArchived: z.boolean().optional(),
})

export const whiteboardsRoutes = new Hono<Env>()

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

// GET /api/whiteboards - List whiteboards for a workspace
whiteboardsRoutes.get('/', async (c) => {
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

        const result = await db.query.whiteboards.findMany({
            where: (w, { eq, and }) => and(
                eq(w.workspaceId, workspaceId),
                eq(w.isArchived, false)
            ),
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: [desc(whiteboards.updatedAt)]
        })

        return c.json({ success: true, data: result })
    } catch (error: any) {
        console.error('GET /api/whiteboards error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// GET /api/whiteboards/:id - Get single whiteboard
whiteboardsRoutes.get('/:id', async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')

        const board = await db.query.whiteboards.findFirst({
            where: (w, { eq }) => eq(w.id, id),
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                }
            }
        })

        if (!board) {
            return c.json({ success: false, error: 'Whiteboard not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, board.workspaceId)
        if (!role) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        return c.json({ success: true, data: board })
    } catch (error: any) {
        console.error('GET /api/whiteboards/:id error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// POST /api/whiteboards - Create whiteboard
whiteboardsRoutes.post('/', zValidator('json', createWhiteboardSchema, (result, c) => {
    if (!result.success) {
        console.error('Zod Validation Error on createWhiteboardSchema:', result.error.errors)
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

        const newBoard: NewWhiteboard = {
            workspaceId: workspaceId,
            name: body.name,
            data: body.data || {},
            createdBy: user.id,
        }

        const [created] = await db.insert(whiteboards).values(newBoard).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error: any) {
        console.error('POST /api/whiteboards error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// PATCH /api/whiteboards/:id - Update whiteboard
whiteboardsRoutes.patch('/:id', zValidator('json', updateWhiteboardSchema), async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')
        const body = c.req.valid('json')

        const board = await db.query.whiteboards.findFirst({
            where: (w, { eq }) => eq(w.id, id)
        })

        if (!board) {
            return c.json({ success: false, error: 'Whiteboard not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, board.workspaceId)
        if (!role) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        const updateData: any = { ...body, updatedAt: new Date() }
        const [updated] = await db.update(whiteboards).set(updateData).where(eq(whiteboards.id, id)).returning()

        return c.json({ success: true, data: updated })
    } catch (error: any) {
        console.error('PATCH /api/whiteboards/:id error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})

// DELETE /api/whiteboards/:id - Delete whiteboard
whiteboardsRoutes.delete('/:id', async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')

        const board = await db.query.whiteboards.findFirst({
            where: (w, { eq }) => eq(w.id, id)
        })

        if (!board) {
            return c.json({ success: false, error: 'Whiteboard not found' }, 404)
        }

        const role = await getUserWorkspaceRole(user.id, board.workspaceId)
        if (!role || !['owner', 'admin'].includes(role) && board.createdBy !== user.id) {
            return c.json({ success: false, error: 'Forbidden' }, 403)
        }

        const [updated] = await db.update(whiteboards)
            .set({ isArchived: true, updatedAt: new Date() })
            .where(eq(whiteboards.id, id))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error: any) {
        console.error('DELETE /api/whiteboards/:id error:', error)
        return c.json({ success: false, error: error.message || 'Internal Server Error' }, 500)
    }
})
