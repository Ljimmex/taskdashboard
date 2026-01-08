import { Hono } from 'hono'
import { db } from '../../db'
import { taskTemplates } from '../../db/schema/templates'
import { eq } from 'drizzle-orm'

export const templatesRoutes = new Hono()

// =============================================================================
// GET /api/templates - List workspace templates
// =============================================================================

templatesRoutes.get('/', async (c) => {
    try {
        const workspaceSlug = c.req.query('workspaceSlug')
        const userId = c.req.header('x-user-id')

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        // Get workspace ID from slug
        let workspaceId: string | undefined

        if (workspaceSlug) {
            const workspace = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug),
            })
            if (workspace) {
                workspaceId = workspace.id
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

templatesRoutes.post('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id')

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const body = await c.req.json()
        const { workspaceSlug, name, description, templateData } = body

        if (!workspaceSlug || !name || !templateData) {
            return c.json({ success: false, error: 'Missing required fields' }, 400)
        }

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

templatesRoutes.put('/:id', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const id = c.req.param('id')

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const existing = await db.query.taskTemplates.findFirst({
            where: (t, { eq }) => eq(t.id, id)
        })

        if (!existing) {
            return c.json({ success: false, error: 'Template not found' }, 404)
        }

        const body = await c.req.json()
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
        const userId = c.req.header('x-user-id')
        const id = c.req.param('id')

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const existing = await db.query.taskTemplates.findFirst({
            where: (t, { eq }) => eq(t.id, id)
        })

        if (!existing) {
            return c.json({ success: false, error: 'Template not found' }, 404)
        }

        await db.delete(taskTemplates).where(eq(taskTemplates.id, id))

        return c.json({ success: true, message: 'Template deleted' })
    } catch (error) {
        console.error('Error deleting template:', error)
        return c.json({ success: false, error: 'Failed to delete template' }, 500)
    }
})
