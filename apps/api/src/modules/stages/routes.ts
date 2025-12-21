import { Hono } from 'hono'
import { db } from '../../db'
import { projectStages, industryTemplateStages, industryTemplates } from '../../db/schema'
import { eq, asc, max } from 'drizzle-orm'

const app = new Hono()

// =============================================================================
// GET /api/projects/:projectId/stages - Get project stages
// =============================================================================
app.get('/:projectId/stages', async (c) => {
    const { projectId } = c.req.param()

    try {
        const stages = await db
            .select()
            .from(projectStages)
            .where(eq(projectStages.projectId, projectId))
            .orderBy(asc(projectStages.position))

        return c.json({
            success: true,
            data: stages,
        })
    } catch (error) {
        console.error('Error fetching project stages:', error)
        return c.json({ success: false, error: 'Failed to fetch stages' }, 500)
    }
})

// =============================================================================
// POST /api/projects/:projectId/stages - Add custom stage
// =============================================================================
app.post('/:projectId/stages', async (c) => {
    const { projectId } = c.req.param()
    const body = await c.req.json()
    const { name, color = '#6B7280', isFinal = false } = body

    if (!name) {
        return c.json({ success: false, error: 'Stage name is required' }, 400)
    }

    try {
        // Get max position
        const [maxPos] = await db
            .select({ maxPosition: max(projectStages.position) })
            .from(projectStages)
            .where(eq(projectStages.projectId, projectId))

        const position = (maxPos?.maxPosition ?? -1) + 1

        const [stage] = await db
            .insert(projectStages)
            .values({
                projectId,
                name,
                color,
                position,
                isFinal,
            })
            .returning()

        return c.json({ success: true, data: stage }, 201)
    } catch (error) {
        console.error('Error creating stage:', error)
        return c.json({ success: false, error: 'Failed to create stage' }, 500)
    }
})

// =============================================================================
// PATCH /api/projects/:projectId/stages/:stageId - Update stage
// =============================================================================
app.patch('/:projectId/stages/:stageId', async (c) => {
    const { stageId } = c.req.param()
    const body = await c.req.json()
    const { name, color, isFinal } = body

    try {
        const updateData: Partial<typeof projectStages.$inferInsert> = {}
        if (name !== undefined) updateData.name = name
        if (color !== undefined) updateData.color = color
        if (isFinal !== undefined) updateData.isFinal = isFinal

        const [stage] = await db
            .update(projectStages)
            .set(updateData)
            .where(eq(projectStages.id, stageId))
            .returning()

        if (!stage) {
            return c.json({ success: false, error: 'Stage not found' }, 404)
        }

        return c.json({ success: true, data: stage })
    } catch (error) {
        console.error('Error updating stage:', error)
        return c.json({ success: false, error: 'Failed to update stage' }, 500)
    }
})

// =============================================================================
// DELETE /api/projects/:projectId/stages/:stageId - Delete stage
// =============================================================================
app.delete('/:projectId/stages/:stageId', async (c) => {
    const { stageId } = c.req.param()

    try {
        // TODO: Check if any tasks are in this stage and handle migration

        const [deleted] = await db
            .delete(projectStages)
            .where(eq(projectStages.id, stageId))
            .returning()

        if (!deleted) {
            return c.json({ success: false, error: 'Stage not found' }, 404)
        }

        return c.json({ success: true, data: deleted })
    } catch (error) {
        console.error('Error deleting stage:', error)
        return c.json({ success: false, error: 'Failed to delete stage' }, 500)
    }
})

// =============================================================================
// POST /api/projects/:projectId/stages/reorder - Reorder stages
// =============================================================================
app.post('/:projectId/stages/reorder', async (c) => {
    const { projectId } = c.req.param()
    const body = await c.req.json()
    const { stageIds } = body // Array of stage IDs in new order

    if (!stageIds || !Array.isArray(stageIds)) {
        return c.json({ success: false, error: 'stageIds array is required' }, 400)
    }

    try {
        // Update positions
        await Promise.all(
            stageIds.map((stageId, index) =>
                db
                    .update(projectStages)
                    .set({ position: index })
                    .where(eq(projectStages.id, stageId))
            )
        )

        // Fetch updated stages
        const stages = await db
            .select()
            .from(projectStages)
            .where(eq(projectStages.projectId, projectId))
            .orderBy(asc(projectStages.position))

        return c.json({ success: true, data: stages })
    } catch (error) {
        console.error('Error reordering stages:', error)
        return c.json({ success: false, error: 'Failed to reorder stages' }, 500)
    }
})

// =============================================================================
// POST /api/projects/:projectId/stages/import - Import stage from template
// =============================================================================
app.post('/:projectId/stages/import', async (c) => {
    const { projectId } = c.req.param()
    const body = await c.req.json()
    const { templateStageId } = body

    if (!templateStageId) {
        return c.json({ success: false, error: 'templateStageId is required' }, 400)
    }

    try {
        // Get template stage
        const [templateStage] = await db
            .select()
            .from(industryTemplateStages)
            .where(eq(industryTemplateStages.id, templateStageId))
            .limit(1)

        if (!templateStage) {
            return c.json({ success: false, error: 'Template stage not found' }, 404)
        }

        // Get max position
        const [maxPos] = await db
            .select({ maxPosition: max(projectStages.position) })
            .from(projectStages)
            .where(eq(projectStages.projectId, projectId))

        const position = (maxPos?.maxPosition ?? -1) + 1

        // Create project stage from template
        const [stage] = await db
            .insert(projectStages)
            .values({
                projectId,
                name: templateStage.name,
                color: templateStage.color,
                position,
                isFinal: templateStage.isFinal,
            })
            .returning()

        return c.json({ success: true, data: stage }, 201)
    } catch (error) {
        console.error('Error importing stage:', error)
        return c.json({ success: false, error: 'Failed to import stage' }, 500)
    }
})

// =============================================================================
// POST /api/projects/:projectId/stages/init-from-template - Initialize stages from template
// =============================================================================
app.post('/:projectId/stages/init-from-template', async (c) => {
    const { projectId } = c.req.param()
    const body = await c.req.json()
    const { templateSlug } = body

    if (!templateSlug) {
        return c.json({ success: false, error: 'templateSlug is required' }, 400)
    }

    try {
        // Get template
        const [template] = await db
            .select()
            .from(industryTemplates)
            .where(eq(industryTemplates.slug, templateSlug))
            .limit(1)

        if (!template) {
            return c.json({ success: false, error: 'Template not found' }, 404)
        }

        // Get template stages
        const templateStages = await db
            .select()
            .from(industryTemplateStages)
            .where(eq(industryTemplateStages.templateId, template.id))
            .orderBy(asc(industryTemplateStages.position))

        // Create project stages from template
        const createdStages = await Promise.all(
            templateStages.map((ts) =>
                db
                    .insert(projectStages)
                    .values({
                        projectId,
                        name: ts.name,
                        color: ts.color,
                        position: ts.position,
                        isFinal: ts.isFinal,
                    })
                    .returning()
            )
        )

        return c.json({
            success: true,
            data: createdStages.map((s) => s[0]),
        }, 201)
    } catch (error) {
        console.error('Error initializing stages:', error)
        return c.json({ success: false, error: 'Failed to initialize stages' }, 500)
    }
})

export { app as projectStagesRoutes }
