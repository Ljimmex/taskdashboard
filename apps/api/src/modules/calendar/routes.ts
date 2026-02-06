import { Hono } from 'hono'
import { db } from '../../db'
import { calendarEvents, type NewCalendarEvent } from '../../db/schema/calendar'
import { auth } from '../../lib/auth'
import { eq } from 'drizzle-orm'
import { triggerWebhook } from '../webhooks/trigger'
import {
    canViewCalendarEvents,
    canCreateCalendarEvents,
    canManageCalendarEvents,
    type WorkspaceRole,
    type TeamLevel
} from '../../lib/permissions'

export const calendarRoutes = new Hono()

// Helper to get user permissions context
async function getUserPermissions(userId: string, teamId: string) {
    if (!teamId) return null

    // Get team membership and workspace info
    const teamMember = await db.query.teamMembers.findFirst({
        where: (tm, { and, eq }) => and(eq(tm.userId, userId), eq(tm.teamId, teamId)),
        with: {
            team: {
                columns: { workspaceId: true }
            }
        }
    })

    if (!teamMember) return null

    // Get workspace membership
    const workspaceMember = await db.query.workspaceMembers.findFirst({
        where: (wm, { and, eq }) => and(
            eq(wm.userId, userId),
            eq(wm.workspaceId, teamMember.team.workspaceId)
        ),
        columns: { role: true }
    })

    return {
        workspaceRole: (workspaceMember?.role || null) as WorkspaceRole | null,
        teamLevel: (teamMember.teamLevel || null) as TeamLevel | null
    }
}

// Helper to trigger webhook with workspace context
async function triggerWebhookWithWorkspace(event: string, payload: any, teamId: string) {
    try {
        const team = await db.query.teams.findFirst({
            where: (t, { eq }) => eq(t.id, teamId),
            columns: { workspaceId: true }
        })
        if (team?.workspaceId) {
            await triggerWebhook(event, payload, team.workspaceId)
        }
    } catch (e) {
        console.error('Failed to trigger calendar webhook:', e)
    }
}

// =============================================================================
// CALENDAR CRUD
// =============================================================================

// GET /api/calendar - List events
calendarRoutes.get('/', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)

        const userId = session.user.id
        const { start, end, teamId, type } = c.req.query()

        // 1. If teamId is provided, check permission for that team
        if (teamId) {
            const perms = await getUserPermissions(userId, teamId)
            if (!perms || !canViewCalendarEvents(perms.workspaceRole, perms.teamLevel)) {
                return c.json({ error: 'Forbidden' }, 403)
            }
        }

        // 2. If no teamId, find ALL teams user can view
        let allowedTeamIds: string[] = []
        if (teamId) {
            allowedTeamIds = [teamId]
        } else {
            const members = await db.query.teamMembers.findMany({
                where: (tm, { eq }) => eq(tm.userId, userId),
                with: {
                    team: { columns: { workspaceId: true } }
                }
            })

            // For each team, we need to check permissions. 
            // Optimization: Fetch workspace roles once per workspace.
            const workspaceIds = [...new Set(members.map(m => m.team.workspaceId))]
            const workspacemembers = await db.query.workspaceMembers.findMany({
                where: (wm, { and, eq, inArray }) => and(
                    eq(wm.userId, userId),
                    inArray(wm.workspaceId, workspaceIds)
                ),
                columns: { workspaceId: true, role: true }
            })

            const workspaceRoleMap = new Map(workspacemembers.map(wm => [wm.workspaceId, wm.role]))

            allowedTeamIds = members.filter(m => {
                const wsRole = (workspaceRoleMap.get(m.team.workspaceId) || null) as WorkspaceRole | null
                const teamLevel = (m.teamLevel || null) as TeamLevel | null
                return canViewCalendarEvents(wsRole, teamLevel)
            }).map(m => m.teamId)
        }

        if (allowedTeamIds.length === 0) {
            return c.json({ success: true, data: [] })
        }

        // Find events
        const events = await db.query.calendarEvents.findMany({
            where: (e, { and, gte, lte, inArray, eq }) => {
                const wheres: any[] = []

                if (start) wheres.push(gte(e.startAt, new Date(start)))
                if (end) wheres.push(lte(e.endAt, new Date(end)))
                if (type) wheres.push(eq(e.type, type as any))
                // Constrain to allowed teams
                wheres.push(inArray(e.teamId, allowedTeamIds))

                return and(...wheres)
            },
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                },
                task: {
                    columns: { id: true, title: true, status: true, priority: true }
                }
            }
        })

        return c.json({ success: true, data: events })
    } catch (error) {
        console.error('Error fetching calendar events:', error)
        return c.json({ success: false, error: 'Failed to fetch events' }, 500)
    }
})

// GET /api/calendar/:id - Get single event
calendarRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const event = await db.query.calendarEvents.findFirst({
            where: (e, { eq }) => eq(e.id, id),
            with: {
                creator: true,
                task: true
            }
        })

        if (!event) return c.json({ error: 'Event not found' }, 404)

        return c.json({ success: true, data: event })
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch event' }, 500)
    }
})

// POST /api/calendar - Create event
calendarRoutes.post('/', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const body = await c.req.json()

        // Validation (simplified)
        if (!body.title || !body.startAt || !body.endAt || !body.teamId) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // Permission check
        const perms = await getUserPermissions(userId, body.teamId)
        if (!perms || !canCreateCalendarEvents(perms.workspaceRole, perms.teamLevel)) {
            return c.json({ error: 'Forbidden: Cannot create events in this team' }, 403)
        }

        const newEvent: NewCalendarEvent = {
            ...body,
            type: body.type || 'event',
            startAt: new Date(body.startAt),
            endAt: new Date(body.endAt),
            createdBy: userId
        }

        const [created] = await db.insert(calendarEvents).values(newEvent).returning()

        // Webhook
        await triggerWebhookWithWorkspace('calendar.created', created, body.teamId)

        return c.json({ success: true, data: created })
    } catch (error: any) {
        console.error('Create event error:', error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// PATCH /api/calendar/:id - Update event
calendarRoutes.patch('/:id', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id
        const id = c.req.param('id')

        const body = await c.req.json()

        const existing = await db.query.calendarEvents.findFirst({
            where: (e, { eq }) => eq(e.id, id)
        })

        if (!existing) return c.json({ error: 'Event not found' }, 404)

        // Permission check
        const perms = await getUserPermissions(userId, existing.teamId)

        const isAuthor = existing.createdBy === userId
        const canManage = perms && canManageCalendarEvents(perms.workspaceRole, perms.teamLevel)

        if (!isAuthor && !canManage) {
            return c.json({ error: 'Forbidden: You can only edit your own events or need manage permission' }, 403)
        }

        const updateData: Partial<NewCalendarEvent> = {
            ...body,
        }
        if (body.startAt) updateData.startAt = new Date(body.startAt)
        if (body.endAt) updateData.endAt = new Date(body.endAt)

        const [updated] = await db.update(calendarEvents)
            .set(updateData)
            .where(eq(calendarEvents.id, id))
            .returning()

        // Webhook
        await triggerWebhookWithWorkspace('calendar.updated', updated, existing.teamId)

        return c.json({ success: true, data: updated })
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500)
    }
})

// DELETE /api/calendar/:id - Delete event
calendarRoutes.delete('/:id', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id
        const id = c.req.param('id')

        const existing = await db.query.calendarEvents.findFirst({
            where: (e, { eq }) => eq(e.id, id)
        })

        if (!existing) return c.json({ error: 'Event not found' }, 404)

        // Permission check
        const perms = await getUserPermissions(userId, existing.teamId)

        const isAuthor = existing.createdBy === userId
        const canManage = perms && canManageCalendarEvents(perms.workspaceRole, perms.teamLevel)

        if (!isAuthor && !canManage) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        await db.delete(calendarEvents).where(eq(calendarEvents.id, id))

        // Webhook
        await triggerWebhookWithWorkspace('calendar.deleted', existing, existing.teamId)

        return c.json({ success: true, message: 'Event deleted' })
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500)
    }
})
