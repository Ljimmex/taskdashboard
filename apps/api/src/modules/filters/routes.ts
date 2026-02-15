import { Hono } from 'hono'
import { db } from '../../db'
import { savedFilters } from '../../db/schema/filters'
import { workspaceMembers } from '../../db/schema/workspaces'
import { eq, and } from 'drizzle-orm'
import type { WorkspaceRole } from '../../lib/permissions'

import { type Auth } from '../../lib/auth'

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString } from '../../lib/zod-extensions'

const createFilterSchema = z.object({
    workspaceSlug: zSanitizedString(),
    name: zSanitizedString(),
    filters: z.record(z.any()), // flexible JSON
    isShared: z.boolean().optional(),
})

const updateFilterSchema = z.object({
    name: zSanitizedString().optional(),
    filters: z.record(z.any()).optional(),
    isShared: z.boolean().optional(),
})

export const filtersRoutes = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

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

// =============================================================================
// GET /api/filters - List user's saved filters
// =============================================================================

filtersRoutes.get('/', async (c) => {
    try {
        const workspaceSlug = c.req.query('workspaceSlug')

        const user = c.get('user')
        const userId = user.id

        // Get workspace ID from slug
        let workspaceId: string | undefined

        if (workspaceSlug) {
            const workspace = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug),
            })
            if (workspace) {
                workspaceId = workspace.id
                // Check workspace membership status
                const workspaceRole = await getUserWorkspaceRole(userId, workspace.id)
                if (!workspaceRole) {
                    return c.json({ error: 'Forbidden: No active workspace access' }, 403)
                }
            }
        }

        // Fetch filters - user's own + shared filters
        const filters = await db.query.savedFilters.findMany({
            where: (f, { eq, and, or }) => {
                const conditions = []

                if (workspaceId) {
                    conditions.push(eq(f.workspaceId, workspaceId))
                }

                // Show user's own filters OR shared filters
                conditions.push(
                    or(
                        eq(f.userId, userId),
                        eq(f.isShared, true)
                    )!
                )

                return and(...conditions)
            },
            with: {
                user: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (f, { desc }) => [desc(f.createdAt)]
        })

        return c.json({
            success: true,
            data: filters.map(f => ({
                ...f,
                isOwner: f.userId === userId
            }))
        })
    } catch (error) {
        console.error('Error fetching saved filters:', error)
        return c.json({ success: false, error: 'Failed to fetch filters' }, 500)
    }
})

// =============================================================================
// POST /api/filters - Create new filter preset
// =============================================================================

filtersRoutes.post('/', zValidator('json', createFilterSchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id

        const body = c.req.valid('json')
        const { workspaceSlug, name, filters, isShared } = body

        // Get workspace ID from slug
        const workspace = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.slug, workspaceSlug),
        })

        if (!workspace) {
            return c.json({ success: false, error: 'Workspace not found' }, 404)
        }

        // Check workspace membership status
        const workspaceRole = await getUserWorkspaceRole(userId, workspace.id)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        // Create the filter
        const [newFilter] = await db.insert(savedFilters).values({
            workspaceId: workspace.id,
            userId,
            name,
            filters,
            isShared: isShared || false,
            isDefault: false,
        }).returning()

        return c.json({ success: true, data: newFilter }, 201)
    } catch (error) {
        console.error('Error creating saved filter:', error)
        return c.json({ success: false, error: 'Failed to create filter' }, 500)
    }
})

// =============================================================================
// PUT /api/filters/:id - Update filter preset
// =============================================================================

filtersRoutes.put('/:id', zValidator('json', updateFilterSchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const id = c.req.param('id')

        // Check ownership
        const existing = await db.query.savedFilters.findFirst({
            where: (f, { eq, and }) => and(eq(f.id, id), eq(f.userId, userId))
        })

        if (!existing) {
            return c.json({ success: false, error: 'Filter not found or not owned' }, 404)
        }

        const body = c.req.valid('json')
        const { name, filters, isShared } = body

        const [updated] = await db.update(savedFilters)
            .set({
                name: name ?? existing.name,
                filters: filters ?? existing.filters,
                isShared: isShared ?? existing.isShared,
                updatedAt: new Date(),
            })
            .where(eq(savedFilters.id, id))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating saved filter:', error)
        return c.json({ success: false, error: 'Failed to update filter' }, 500)
    }
})

// =============================================================================
// DELETE /api/filters/:id - Delete filter preset
// =============================================================================

filtersRoutes.delete('/:id', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const id = c.req.param('id')

        // Check ownership
        const existing = await db.query.savedFilters.findFirst({
            where: (f, { eq, and }) => and(eq(f.id, id), eq(f.userId, userId))
        })

        if (!existing) {
            return c.json({ success: false, error: 'Filter not found or not owned' }, 404)
        }

        await db.delete(savedFilters).where(eq(savedFilters.id, id))

        return c.json({ success: true, message: 'Filter deleted' })
    } catch (error) {
        console.error('Error deleting saved filter:', error)
        return c.json({ success: false, error: 'Failed to delete filter' }, 500)
    }
})

// =============================================================================
// POST /api/filters/:id/default - Set as default filter
// =============================================================================

filtersRoutes.post('/:id/default', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const id = c.req.param('id')

        // Get the filter and its workspace
        const filter = await db.query.savedFilters.findFirst({
            where: (f, { eq, and }) => and(eq(f.id, id), eq(f.userId, userId))
        })

        if (!filter) {
            return c.json({ success: false, error: 'Filter not found or not owned' }, 404)
        }

        // Reset all other defaults for this user in this workspace
        await db.update(savedFilters)
            .set({ isDefault: false })
            .where(
                and(
                    eq(savedFilters.userId, userId),
                    eq(savedFilters.workspaceId, filter.workspaceId)
                )
            )

        // Set this one as default
        const [updated] = await db.update(savedFilters)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(savedFilters.id, id))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error setting default filter:', error)
        return c.json({ success: false, error: 'Failed to set default filter' }, 500)
    }
})
