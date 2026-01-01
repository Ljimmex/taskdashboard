import { Hono } from 'hono'
import { db } from '../../db'
import { workspaces } from '../../db/schema/workspaces'
import { eq } from 'drizzle-orm'

export const labelsRoutes = new Hono()

// Helper: Get workspace by slug
async function getWorkspaceBySlug(slug: string) {
    return await db.query.workspaces.findFirst({
        where: (w, { eq }) => eq(w.slug, slug)
    })
}

// GET /api/labels - List labels for a workspace
labelsRoutes.get('/', async (c) => {
    try {
        const workspaceSlug = c.req.query('workspaceSlug')
        if (!workspaceSlug) return c.json({ success: false, error: 'workspaceSlug is required' }, 400)

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

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
        const body = await c.req.json()
        const { workspaceSlug, name, color } = body

        if (!workspaceSlug || !name) {
            return c.json({ success: false, error: 'workspaceSlug and name are required' }, 400)
        }

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

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

        return c.json({ success: true, data: newLabel }, 201)
    } catch (error) {
        console.error('Error creating label:', error)
        return c.json({ success: false, error: 'Failed to create label' }, 500)
    }
})

// PATCH /api/labels/:id - Update label in workspace
labelsRoutes.patch('/:id', async (c) => {
    try {
        const labelId = c.req.param('id')
        const body = await c.req.json()
        const { workspaceSlug, name, color } = body

        if (!workspaceSlug) {
            return c.json({ success: false, error: 'workspaceSlug is required' }, 400)
        }

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

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

        return c.json({ success: true, data: updatedLabel })
    } catch (error) {
        console.error('Error updating label:', error)
        return c.json({ success: false, error: 'Failed to update label' }, 500)
    }
})

// DELETE /api/labels/:id - Remove label from workspace
labelsRoutes.delete('/:id', async (c) => {
    try {
        const labelId = c.req.param('id')
        const workspaceSlug = c.req.query('workspaceSlug')

        if (!workspaceSlug) {
            return c.json({ success: false, error: 'workspaceSlug is required' }, 400)
        }

        const workspace = await getWorkspaceBySlug(workspaceSlug)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

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

        return c.json({ success: true, message: `Label "${deletedLabel.name}" deleted` })
    } catch (error) {
        console.error('Error deleting label:', error)
        return c.json({ success: false, error: 'Failed to delete label' }, 500)
    }
})
