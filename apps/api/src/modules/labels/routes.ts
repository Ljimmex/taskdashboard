import { Hono } from 'hono'
import { db } from '../../db'
import { workspaces, workspaceMembers } from '../../db/schema/workspaces'
import { tasks } from '../../db/schema/tasks'
import { eq, sql, and } from 'drizzle-orm'
import { auth } from '../../lib/auth'
import { triggerWebhook } from '../webhooks/trigger'
import type { WorkspaceRole } from '../../lib/permissions'

export const labelsRoutes = new Hono()

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

// Helper: Get workspace by slug
async function getWorkspaceBySlug(slug: string) {
    return await db.query.workspaces.findFirst({
        where: (w, { eq }) => eq(w.slug, slug)
    })
}

// GET /api/labels - List labels for a workspace
labelsRoutes.get('/', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const workspaceSlug = c.req.query('workspaceSlug')
        if (!workspaceSlug) return c.json({ success: false, error: 'workspaceSlug is required' }, 400)

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

        // Check workspace membership status (blocks suspended users)
        const workspaceRole = await getUserWorkspaceRole(userId, workspace.id)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        // Return labels from workspace JSONB
        const labels = workspace.labels || []
        return c.json({ success: true, data: labels })
    } catch (error) {
        console.error('Error fetching labels:', error)
        return c.json({ success: false, error: 'Failed to fetch labels' }, 500)
    }
})

// POST /api/labels - Add label to workspace
labelsRoutes.post('/', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const body = await c.req.json()
        const { workspaceSlug, name, color } = body

        if (!workspaceSlug || !name) {
            return c.json({ success: false, error: 'workspaceSlug and name are required' }, 400)
        }

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

        // Check workspace membership status (blocks suspended users)
        const workspaceRole = await getUserWorkspaceRole(userId, workspace.id)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        // Generate unique ID for the new label
        const newLabel = {
            id: `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            color: color || '#6B7280',
        }

        // Add to existing labels array
        const currentLabels = workspace.labels || []
        const updatedLabels = [...currentLabels, newLabel]

        // Update workspace with new labels
        await db.update(workspaces)
            .set({ labels: updatedLabels, updatedAt: new Date() })
            .where(eq(workspaces.id, workspace.id))

        // TRIGGER WEBHOOK
        triggerWebhook('label.created', newLabel, workspace.id)

        return c.json({ success: true, data: newLabel }, 201)
    } catch (error) {
        console.error('Error creating label:', error)
        return c.json({ success: false, error: 'Failed to create label' }, 500)
    }
})

// PATCH /api/labels/:id - Update label in workspace
labelsRoutes.patch('/:id', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const labelId = c.req.param('id')
        const body = await c.req.json()
        const { workspaceSlug, name, color } = body

        if (!workspaceSlug) {
            return c.json({ success: false, error: 'workspaceSlug is required' }, 400)
        }

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

        // Check workspace membership status (blocks suspended users)
        const workspaceRole = await getUserWorkspaceRole(userId, workspace.id)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        // Find and update the label
        const currentLabels = workspace.labels || []
        const labelIndex = currentLabels.findIndex((l: any) => l.id === labelId)

        if (labelIndex === -1) {
            return c.json({ success: false, error: 'Label not found' }, 404)
        }

        // Update label properties
        const updatedLabel = {
            ...currentLabels[labelIndex],
            ...(name !== undefined && { name }),
            ...(color !== undefined && { color }),
        }
        currentLabels[labelIndex] = updatedLabel

        // Update workspace with modified labels
        await db.update(workspaces)
            .set({ labels: currentLabels, updatedAt: new Date() })
            .where(eq(workspaces.id, workspace.id))

        // TRIGGER WEBHOOK
        triggerWebhook('label.updated', updatedLabel, workspace.id)

        return c.json({ success: true, data: updatedLabel })
    } catch (error) {
        console.error('Error updating label:', error)
        return c.json({ success: false, error: 'Failed to update label' }, 500)
    }
})

// DELETE /api/labels/:id - Remove label from workspace
labelsRoutes.delete('/:id', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const labelId = c.req.param('id')
        const workspaceSlug = c.req.query('workspaceSlug')

        if (!workspaceSlug) {
            return c.json({ success: false, error: 'workspaceSlug is required' }, 400)
        }

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

        // Check workspace membership status (blocks suspended users)
        const workspaceRole = await getUserWorkspaceRole(userId, workspace.id)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        // Find and remove the label
        const currentLabels = workspace.labels || []
        const labelIndex = currentLabels.findIndex((l: any) => l.id === labelId)

        if (labelIndex === -1) {
            return c.json({ success: false, error: 'Label not found' }, 404)
        }

        const deletedLabel = currentLabels[labelIndex]
        const updatedLabels = currentLabels.filter((l: any) => l.id !== labelId)

        // Update workspace with filtered labels
        await db.update(workspaces)
            .set({ labels: updatedLabels, updatedAt: new Date() })
            .where(eq(workspaces.id, workspace.id))

        // Cleanup: Remove this label ID from all tasks in this workspace
        // We use SQL array mechanism to remove the item from the array
        await db.update(tasks)
            .set({
                labels: sql`array_remove(${tasks.labels}, ${labelId})`,
                updatedAt: new Date()
            })
            .where(
                sql`${tasks.projectId} IN (
                    SELECT id FROM projects WHERE team_id IN (
                        SELECT id FROM teams WHERE workspace_id = ${workspace.id}
                    )
                )`
            )

        // TRIGGER WEBHOOK
        triggerWebhook('label.deleted', deletedLabel, workspace.id)

        return c.json({ success: true, message: `Label "${deletedLabel.name}" deleted and removed from tasks` })
    } catch (error) {
        console.error('Error deleting label:', error)
        return c.json({ success: false, error: 'Failed to delete label' }, 500)
    }
})
