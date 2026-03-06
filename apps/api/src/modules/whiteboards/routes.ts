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
    projectId: z.string().uuid().optional(),
    folderId: z.string().optional(),
})

const updateWhiteboardSchema = z.object({
    name: zSanitizedStringOptional(),
    data: z.any().optional(),
    isArchived: z.boolean().optional(),
    projectId: z.string().uuid().optional(),
    folderId: z.string().optional(),
})

export const whiteboardsRoutes = new Hono<Env>()

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
    const user = c.get('user')
    const workspaceId = c.req.query('workspaceId')

    if (!workspaceId) {
        return c.json({ error: 'workspaceId is required' }, 400)
    }

    const role = await getUserWorkspaceRole(user.id, workspaceId)
    if (!role) {
        return c.json({ error: 'Forbidden' }, 403)
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
})

// GET /api/whiteboards/:id - Get single whiteboard
whiteboardsRoutes.get('/:id', async (c) => {
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
        return c.json({ error: 'Whiteboard not found' }, 404)
    }

    const role = await getUserWorkspaceRole(user.id, board.workspaceId)
    if (!role) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    return c.json({ success: true, data: board })
})

// POST /api/whiteboards - Create whiteboard
whiteboardsRoutes.post('/', zValidator('json', createWhiteboardSchema), async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    const role = await getUserWorkspaceRole(user.id, body.workspaceId)
    if (!role) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const newBoard: NewWhiteboard = {
        workspaceId: body.workspaceId,
        name: body.name,
        data: body.data || {},
        createdBy: user.id,
        projectId: body.projectId,
        folderId: body.folderId,
    }

    const [created] = await db.insert(whiteboards).values(newBoard).returning()
    return c.json({ success: true, data: created }, 201)
})

// PATCH /api/whiteboards/:id - Update whiteboard
whiteboardsRoutes.patch('/:id', zValidator('json', updateWhiteboardSchema), async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const board = await db.query.whiteboards.findFirst({
        where: (w, { eq }) => eq(w.id, id)
    })

    if (!board) {
        return c.json({ error: 'Whiteboard not found' }, 404)
    }

    const role = await getUserWorkspaceRole(user.id, board.workspaceId)
    if (!role) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const updateData: any = { ...body, updatedAt: new Date() }
    const [updated] = await db.update(whiteboards).set(updateData).where(eq(whiteboards.id, id)).returning()

    return c.json({ success: true, data: updated })
})

// DELETE /api/whiteboards/:id - Delete whiteboard
whiteboardsRoutes.delete('/:id', async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    const board = await db.query.whiteboards.findFirst({
        where: (w, { eq }) => eq(w.id, id)
    })

    if (!board) {
        return c.json({ error: 'Whiteboard not found' }, 404)
    }

    const role = await getUserWorkspaceRole(user.id, board.workspaceId)
    if (!role || !['owner', 'admin'].includes(role) && board.createdBy !== user.id) {
        return c.json({ error: 'Forbidden' }, 403)
    }

    const [updated] = await db.update(whiteboards)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(whiteboards.id, id))
        .returning()

    return c.json({ success: true, data: updated })
})
