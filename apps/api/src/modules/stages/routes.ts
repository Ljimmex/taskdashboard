import { Hono } from 'hono'
import { db } from '../../db'
import { projectStages, industryTemplateStages, industryTemplates } from '../../db/schema'
import { projects } from '../../db/schema/projects'
import { workspaceMembers } from '../../db/schema/workspaces'
import { eq, asc, max, and } from 'drizzle-orm'
import {
    canCreateStages,
    canUpdateStages,
    canDeleteStages,
    canReorderStages,
    type TeamLevel,
    type WorkspaceRole
} from '../../lib/permissions'
import { triggerWebhook } from '../webhooks/trigger'
import { teams } from '../../db/schema'

const app = new Hono()

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

// Helper: Get user's team level for a project's team
async function getUserTeamLevel(userId: string, teamId: string): Promise<TeamLevel | null> {
    const member = await db.query.teamMembers.findFirst({
        where: (tm, { eq, and }) => and(eq(tm.userId, userId), eq(tm.teamId, teamId))
    })
    return (member?.teamLevel as TeamLevel) || null
}

// Helper: Get teamId from projectId
async function getTeamIdFromProject(projectId: string): Promise<string | null> {
    const [project] = await db.select({ teamId: projects.teamId }).from(projects).where(eq(projects.id, projectId)).limit(1)
    return project?.teamId || null
}

// Helper: Get workspaceId from projectId
async function getWorkspaceIdFromProject(projectId: string): Promise<string | null> {
    const [result] = await db
        .select({ workspaceId: teams.workspaceId })
        .from(projects)
        .innerJoin(teams, eq(projects.teamId, teams.id))
        .where(eq(projects.id, projectId))
        .limit(1)
    return result?.workspaceId || null
}

// =============================================================================
// GET /api/projects/:projectId/stages - Get project stages (anyone with project access)
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
// POST /api/projects/:projectId/stages - Add custom stage (requires stages.create)
// =============================================================================
app.post('/:projectId/stages', async (c) => {
    const { projectId } = c.req.param()
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { name, color = '#6B7280', isFinal = false } = body

    if (!name) {
        return c.json({ success: false, error: 'Stage name is required' }, 400)
    }

    try {
        // Get workspace context and check suspension status
        const workspaceId = await getWorkspaceIdFromProject(projectId)
        if (!workspaceId) {
            return c.json({ success: false, error: 'Project workspace not found' }, 404)
        }

        const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        // Get teamId from project
        const teamId = await getTeamIdFromProject(projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateStages(workspaceRole, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create stages' }, 403)
        }

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

        // TRIGGER WEBHOOK
        if (workspaceId) {
            triggerWebhook('stage.created', stage, workspaceId)
        }

        return c.json({ success: true, data: stage }, 201)
    } catch (error) {
        console.error('Error creating stage:', error)
        return c.json({ success: false, error: 'Failed to create stage' }, 500)
    }
})

// =============================================================================
// PATCH /api/projects/:projectId/stages/:stageId - Update stage (requires stages.update)
// =============================================================================
app.patch('/:projectId/stages/:stageId', async (c) => {
    const { projectId, stageId } = c.req.param()
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { name, color, isFinal } = body

    try {
        // Get teamId from project
        const teamId = await getTeamIdFromProject(projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canUpdateStages(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to update stages' }, 403)
        }

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

        // TRIGGER WEBHOOK
        const workspaceId = await getWorkspaceIdFromProject(projectId)
        if (workspaceId) {
            triggerWebhook('stage.updated', stage, workspaceId)
        }

        return c.json({ success: true, data: stage })
    } catch (error) {
        console.error('Error updating stage:', error)
        return c.json({ success: false, error: 'Failed to update stage' }, 500)
    }
})

// =============================================================================
// DELETE /api/projects/:projectId/stages/:stageId - Delete stage (requires stages.delete)
// =============================================================================
app.delete('/:projectId/stages/:stageId', async (c) => {
    const { projectId, stageId } = c.req.param()
    const userId = c.req.header('x-user-id') || 'temp-user-id'

    try {
        // Get teamId from project
        const teamId = await getTeamIdFromProject(projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canDeleteStages(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete stages' }, 403)
        }

        const [deleted] = await db
            .delete(projectStages)
            .where(eq(projectStages.id, stageId))
            .returning()

        if (!deleted) {
            return c.json({ success: false, error: 'Stage not found' }, 404)
        }

        // TRIGGER WEBHOOK
        const workspaceId = await getWorkspaceIdFromProject(projectId)
        if (workspaceId) {
            triggerWebhook('stage.deleted', deleted, workspaceId)
        }

        return c.json({ success: true, data: deleted })
    } catch (error) {
        console.error('Error deleting stage:', error)
        return c.json({ success: false, error: 'Failed to delete stage' }, 500)
    }
})

// =============================================================================
// POST /api/projects/:projectId/stages/reorder - Reorder stages (requires stages.reorder)
// =============================================================================
app.post('/:projectId/stages/reorder', async (c) => {
    const { projectId } = c.req.param()
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { stageIds } = body // Array of stage IDs in new order

    if (!stageIds || !Array.isArray(stageIds)) {
        return c.json({ success: false, error: 'stageIds array is required' }, 400)
    }

    try {
        // Get teamId from project
        const teamId = await getTeamIdFromProject(projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canReorderStages(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to reorder stages' }, 403)
        }

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

        // TRIGGER WEBHOOK
        const workspaceId = await getWorkspaceIdFromProject(projectId)
        if (workspaceId) {
            triggerWebhook('stage.reordered', stages, workspaceId)
        }

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
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { templateStageId } = body

    if (!templateStageId) {
        return c.json({ success: false, error: 'templateStageId is required' }, 400)
    }

    try {
        // Get teamId from project
        const teamId = await getTeamIdFromProject(projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateStages(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to import stages' }, 403)
        }

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
    const userId = c.req.header('x-user-id') || 'temp-user-id'
    const body = await c.req.json()
    const { templateSlug } = body

    if (!templateSlug) {
        return c.json({ success: false, error: 'templateSlug is required' }, 400)
    }

    try {
        // Get teamId from project
        const teamId = await getTeamIdFromProject(projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateStages(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to initialize stages' }, 403)
        }

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
