import { Hono } from 'hono'
import { db } from '../../db'
import { type Auth } from '../../lib/auth'
import { taskTemplates } from '../../db/schema/templates'
import { workspaceMembers } from '../../db/schema/workspaces'
import { eq, and } from 'drizzle-orm'
import type { WorkspaceRole } from '../../lib/permissions'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString, zSanitizedStringOptional } from '../../lib/zod-extensions'

const createTemplateSchema = z.object({
    workspaceSlug: zSanitizedString(),
    name: zSanitizedString(),
    description: zSanitizedStringOptional(),
    templateData: z.any()
})

const updateTemplateSchema = z.object({
    name: zSanitizedStringOptional(),
    description: zSanitizedStringOptional(),
    isActive: z.boolean().optional(),
    templateData: z.any().optional()
})

const templatesQuerySchema = z.object({
    workspaceSlug: zSanitizedString().optional(),
})

export const templatesRoutes = new Hono<Env>()

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
// GET /api/templates - List workspace templates
// =============================================================================

templatesRoutes.get('/', zValidator('query', templatesQuerySchema), async (c) => {
    try {
        const { workspaceSlug } = c.req.valid('query')
        const user = c.get('user') as any
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

        // Fetch active templates
        const templates = await db.query.taskTemplates.findMany({
            where: (t, { eq, and }) => {
                const conditions = [eq(t.isActive, true)]

                if (workspaceId) {
                    conditions.push(eq(t.workspaceId, workspaceId))
                }

                return and(...conditions)
            },
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (t, { asc }) => [asc(t.name)]
        })

        return c.json({ success: true, data: templates })
    } catch (error) {
        console.error('Error fetching templates:', error)
        return c.json({ success: false, error: 'Failed to fetch templates' }, 500)
    }
})

// =============================================================================
// GET /api/templates/:id - Get single template
// =============================================================================

templatesRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')

        const template = await db.query.taskTemplates.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                }
            }
        })

        if (!template) {
            return c.json({ success: false, error: 'Template not found' }, 404)
        }

        return c.json({ success: true, data: template })
    } catch (error) {
        console.error('Error fetching template:', error)
        return c.json({ success: false, error: 'Failed to fetch template' }, 500)
    }
})

// =============================================================================
// POST /api/templates - Create new template
// =============================================================================

// POST /api/templates - Create new template
templatesRoutes.post('/', zValidator('json', createTemplateSchema), async (c) => {
    try {
        const user = c.get('user') as any
        const userId = user.id

        const body = c.req.valid('json')
        const { workspaceSlug, name, description, templateData } = body

        // Validation handled by schema
        // if (!workspaceSlug || !name || !templateData) { ... }

        // Get workspace ID from slug
        const workspace = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.slug, workspaceSlug),
        })

        if (!workspace) {
            return c.json({ success: false, error: 'Workspace not found' }, 404)
        }

        // Create the template
        const [newTemplate] = await db.insert(taskTemplates).values({
            workspaceId: workspace.id,
            createdBy: userId,
            name,
            description,
            templateData,
            isActive: true,
        }).returning()

        return c.json({ success: true, data: newTemplate }, 201)
    } catch (error) {
        console.error('Error creating template:', error)
        return c.json({ success: false, error: 'Failed to create template' }, 500)
    }
})

// =============================================================================
// PUT /api/templates/:id - Update template
// =============================================================================

templatesRoutes.put('/:id', zValidator('json', updateTemplateSchema), async (c) => {
    try {
        const user = c.get('user') as any
        const userId = user.id
        const id = c.req.param('id')

        const existing = await db.query.taskTemplates.findFirst({
            where: (t, { eq }) => eq(t.id, id)
        })

        if (!existing) {
            return c.json({ success: false, error: 'Template not found' }, 404)
        }

        // Check workspace membership status
        const workspaceRole = await getUserWorkspaceRole(userId, existing.workspaceId)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        const body = c.req.valid('json')
        const { name, description, templateData, isActive } = body

        const [updated] = await db.update(taskTemplates)
            .set({
                name: name ?? existing.name,
                description: description ?? existing.description,
                templateData: templateData ?? existing.templateData,
                isActive: isActive ?? existing.isActive,
                updatedAt: new Date(),
            })
            .where(eq(taskTemplates.id, id))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating template:', error)
        return c.json({ success: false, error: 'Failed to update template' }, 500)
    }
})

// =============================================================================
// DELETE /api/templates/:id - Delete template
// =============================================================================

templatesRoutes.delete('/:id', async (c) => {
    try {
        const user = c.get('user') as any
        const userId = user.id
        const id = c.req.param('id')

        const existing = await db.query.taskTemplates.findFirst({
            where: (t, { eq }) => eq(t.id, id)
        })

        if (!existing) {
            return c.json({ success: false, error: 'Template not found' }, 404)
        }

        // Check workspace membership status
        const workspaceRole = await getUserWorkspaceRole(userId, existing.workspaceId)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        await db.delete(taskTemplates).where(eq(taskTemplates.id, id))

        return c.json({ success: true, message: 'Template deleted' })
    } catch (error) {
        console.error('Error deleting template:', error)
        return c.json({ success: false, error: 'Failed to delete template' }, 500)
    }
})
