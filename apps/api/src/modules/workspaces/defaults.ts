import { Hono } from 'hono'
import { db } from '../../db'
import { workspaces } from '../../db/schema/workspaces'
import { eq } from 'drizzle-orm'
import { auth } from '../../lib/auth'
import { getUserWorkspaceRole } from './routes'

export const workspaceDefaultsRoutes = new Hono()

// =============================================================================
// GET /api/workspaces/:workspaceId/priorities - List workspace priorities
// =============================================================================
workspaceDefaultsRoutes.get('/:workspaceId/priorities', async (c) => {
    const { workspaceId } = c.req.param()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user?.id) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const workspace = await db.query.workspaces.findFirst({
            where: (w, { eq }) => eq(w.id, workspaceId)
        })

        if (!workspace) {
            return c.json({ error: 'Workspace not found' }, 404)
        }

        // Return priorities sorted by position
        const priorities = (workspace.priorities || []).sort((a: any, b: any) => a.position - b.position)

        return c.json({
            success: true,
            data: priorities
        })
    } catch (error) {
        console.error('Error fetching priorities:', error)
        return c.json({ error: 'Failed to fetch priorities' }, 500)
    }
})

// =============================================================================
// PATCH /api/workspaces/:workspaceId/priorities - Update all priorities
// =============================================================================
workspaceDefaultsRoutes.patch('/:workspaceId/priorities', async (c) => {
    const { workspaceId } = c.req.param()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user?.id) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const role = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!role || !['owner', 'admin'].includes(role)) {
            return c.json({ error: 'Forbidden: Only owners and admins can manage priorities' }, 403)
        }

        const body = await c.req.json()
        const priorities = body.priorities

        // Validation
        if (!Array.isArray(priorities) || priorities.length === 0) {
            return c.json({ error: 'At least one priority is required' }, 400)
        }

        // Validate structure
        for (const p of priorities) {
            if (!p.id || !p.name || !p.color || typeof p.position !== 'number') {
                return c.json({ error: 'Invalid priority structure' }, 400)
            }
        }

        // Check for unique positions
        const positions = priorities.map((p: any) => p.position)
        if (new Set(positions).size !== positions.length) {
            return c.json({ error: 'Priority positions must be unique' }, 400)
        }

        // Update workspace
        await db.update(workspaces)
            .set({ priorities })
            .where(eq(workspaces.id, workspaceId))

        return c.json({
            success: true,
            message: 'Priorities updated successfully',
            data: priorities
        })
    } catch (error) {
        console.error('Error updating priorities:', error)
        return c.json({ error: 'Failed to update priorities' }, 500)
    }
})

// =============================================================================
// POST /api/workspaces/:workspaceId/priorities - Create new priority
// =============================================================================
workspaceDefaultsRoutes.post('/:workspaceId/priorities', async (c) => {
    const { workspaceId } = c.req.param()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user?.id) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const role = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!role || !['owner', 'admin'].includes(role)) {
            return c.json({ error: 'Forbidden: Only owners and admins can create priorities' }, 403)
        }

        const body = await c.req.json()
        const { id, name, color, icon } = body

        if (!id || !name || !color) {
            return c.json({ error: 'Missing required fields: id, name, color' }, 400)
        }

        // Fetch current priorities
        const workspace = await db.query.workspaces.findFirst({
            where: (w, { eq }) => eq(w.id, workspaceId)
        })

        if (!workspace) {
            return c.json({ error: 'Workspace not found' }, 404)
        }

        const currentPriorities = workspace.priorities || []

        // Check if ID already exists
        if (currentPriorities.find((p: any) => p.id === id)) {
            return c.json({ error: 'Priority with this ID already exists' }, 400)
        }

        // Add new priority at the end
        const newPriority = {
            id,
            name,
            color,
            icon: icon || '',
            position: currentPriorities.length
        }

        const updatedPriorities = [...currentPriorities, newPriority]

        await db.update(workspaces)
            .set({ priorities: updatedPriorities })
            .where(eq(workspaces.id, workspaceId))

        return c.json({
            success: true,
            message: 'Priority created successfully',
            data: newPriority
        })
    } catch (error) {
        console.error('Error creating priority:', error)
        return c.json({ error: 'Failed to create priority' }, 500)
    }
})

// =============================================================================
// DELETE /api/workspaces/:workspaceId/priorities/:priorityId - Delete priority
// =============================================================================
workspaceDefaultsRoutes.delete('/:workspaceId/priorities/:priorityId', async (c) => {
    const { workspaceId, priorityId } = c.req.param()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user?.id) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const role = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!role || !['owner', 'admin'].includes(role)) {
            return c.json({ error: 'Forbidden: Only owners and admins can delete priorities' }, 403)
        }

        // Fetch current priorities
        const workspace = await db.query.workspaces.findFirst({
            where: (w, { eq }) => eq(w.id, workspaceId)
        })

        if (!workspace) {
            return c.json({ error: 'Workspace not found' }, 404)
        }

        const currentPriorities = workspace.priorities || []

        // Must have at least one priority left
        if (currentPriorities.length <= 1) {
            return c.json({ error: 'Cannot delete the last priority' }, 400)
        }

        // Check if any tasks use this priority
        const tasksUsingPriority = await db.query.tasks.findFirst({
            where: (t, { eq, and }) => and(
                eq(t.priority, priorityId)
            )
        })

        if (tasksUsingPriority) {
            return c.json({
                error: 'Cannot delete priority that is being used by tasks',
                details: 'Please reassign tasks to a different priority first'
            }, 400)
        }

        // Remove priority and reindex positions
        const updatedPriorities = currentPriorities
            .filter((p: any) => p.id !== priorityId)
            .map((p: any, index: number) => ({ ...p, position: index }))

        await db.update(workspaces)
            .set({ priorities: updatedPriorities })
            .where(eq(workspaces.id, workspaceId))

        return c.json({
            success: true,
            message: 'Priority deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting priority:', error)
        return c.json({ error: 'Failed to delete priority' }, 500)
    }
})

// =============================================================================
// PATCH /api/workspaces/:workspaceId/defaults - Update workspace defaults
// =============================================================================
workspaceDefaultsRoutes.patch('/:workspaceId/defaults', async (c) => {
    const { workspaceId } = c.req.param()
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user?.id) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    try {
        const role = await getUserWorkspaceRole(session.user.id, workspaceId)
        if (!role || !['owner', 'admin'].includes(role)) {
            return c.json({ error: 'Forbidden: Only owners and admins can update workspace defaults' }, 403)
        }

        const body = await c.req.json()
        const { defaultIndustryTemplateId } = body

        await db.update(workspaces)
            .set({ defaultIndustryTemplateId })
            .where(eq(workspaces.id, workspaceId))

        return c.json({
            success: true,
            message: 'Workspace defaults updated successfully'
        })
    } catch (error) {
        console.error('Error updating workspace defaults:', error)
        return c.json({ error: 'Failed to update workspace defaults' }, 500)
    }
})
