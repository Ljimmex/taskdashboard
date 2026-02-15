import { Hono } from 'hono'
import { db } from '../../db'
import { industryTemplates, industryTemplateStages } from '../../db/schema'
import { eq, asc } from 'drizzle-orm'

import { type Auth } from '../../lib/auth'

const app = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

// =============================================================================
// GET /api/industry-templates - List all templates with stages
// =============================================================================
app.get('/', async (c) => {
    try {
        const templates = await db
            .select()
            .from(industryTemplates)
            .where(eq(industryTemplates.isActive, true))
            .orderBy(asc(industryTemplates.name))

        // Fetch stages for each template
        const templatesWithStages = await Promise.all(
            templates.map(async (template) => {
                const stages = await db
                    .select()
                    .from(industryTemplateStages)
                    .where(eq(industryTemplateStages.templateId, template.id))
                    .orderBy(asc(industryTemplateStages.position))

                return {
                    ...template,
                    stages,
                }
            })
        )

        return c.json({
            success: true,
            data: templatesWithStages,
        })
    } catch (error) {
        console.error('Error fetching industry templates:', error)
        return c.json({ success: false, error: 'Failed to fetch templates' }, 500)
    }
})

// =============================================================================
// GET /api/industry-templates/:slug - Get single template with stages
// =============================================================================
app.get('/:slug', async (c) => {
    const { slug } = c.req.param()

    try {
        const [template] = await db
            .select()
            .from(industryTemplates)
            .where(eq(industryTemplates.slug, slug))
            .limit(1)

        if (!template) {
            return c.json({ success: false, error: 'Template not found' }, 404)
        }

        const stages = await db
            .select()
            .from(industryTemplateStages)
            .where(eq(industryTemplateStages.templateId, template.id))
            .orderBy(asc(industryTemplateStages.position))

        return c.json({
            success: true,
            data: {
                ...template,
                stages,
            },
        })
    } catch (error) {
        console.error('Error fetching template:', error)
        return c.json({ success: false, error: 'Failed to fetch template' }, 500)
    }
})

export { app as industryTemplatesRoutes }
