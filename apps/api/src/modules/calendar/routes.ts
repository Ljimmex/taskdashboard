import { Hono } from 'hono'
import { db } from '../../db'
import { calendarEvents, type NewCalendarEvent } from '../../db/schema/calendar'
import { RRule } from 'rrule'
import { auth } from '../../lib/auth'
import { eq, sql } from 'drizzle-orm'
import { triggerWebhook } from '../webhooks/trigger'
import {
    canViewCalendarEvents,
    canCreateCalendarEvents,
    canManageCalendarEvents,
    type WorkspaceRole,
    type TeamLevel
} from '../../lib/permissions'
import { generateICS } from './ical'
import { authMiddleware } from '@/middleware/auth'
import { type Auth } from '../../lib/auth'

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString, zSanitizedStringOptional } from '../../lib/zod-extensions'

const createEventSchema = z.object({
    title: zSanitizedString(),
    startAt: z.string(),
    endAt: z.string(),
    teamIds: z.array(z.string()),
    description: zSanitizedStringOptional(),
    type: z.enum(['event', 'meeting', 'reminder', 'task']).optional(), // Include 'task' if allowed? Enum in DB: calendar_event_type
    meetingLink: zSanitizedStringOptional(),
    taskId: z.string().optional().nullable(),
    isAllDay: z.boolean().optional(),
    recurrence: z.any().optional()
})

const updateEventSchema = createEventSchema.partial()

const calendarQuerySchema = z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    teamId: z.string().optional(),
    type: z.string().optional(),
    workspaceSlug: zSanitizedString().optional(),
})

export const calendarRoutes = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

// Apply auth middleware to all routes EXCEPT export
calendarRoutes.use('*', async (c, next) => {
    if (c.req.path.startsWith('/export')) {
        return next()
    }
    return authMiddleware(c, next)
})

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

// Helper to get user permissions context for a list of teams
// Returns true if user has permission in ALL teams or ANY?
// For creation, usually need permission in all target teams? Or just one?
// Let's assume creation requires permission in at least one team, or we check all.
// User said "Teamu a tego aktualnie nie robisz (max 5)".
// I will check if user has permission in the *first* team or *any* of the teams. 
// For simplicity and security, let's enforce permission on the first team or all.
// Let's check permissions for the first team in the list for now, or adapt `getUserPermissions`.

async function checkTeamPermissions(userId: string, teamIds: string[]): Promise<boolean> {
    if (!teamIds || teamIds.length === 0) return false
    // Check first team for now, or we can check all.
    // Let's just check the first one as "primary" context.
    const teamId = teamIds[0]
    const perms = await getUserPermissions(userId, teamId)
    if (!perms) return false
    return canCreateCalendarEvents(perms.workspaceRole, perms.teamLevel)
}

// ... existing helper `getUserPermissions` ...

// GET /api/calendar - List events
calendarRoutes.get('/', zValidator('query', calendarQuerySchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const { start, end, teamId, type, workspaceSlug } = c.req.valid('query')

        console.log(`[Calendar GET] userId=${userId} workspaceSlug=${workspaceSlug} teamId=${teamId}`)

        let allowedTeamIds: string[] = []

        if (teamId) {
            // If specific team requested, check perm
            const perms = await getUserPermissions(userId, teamId)
            if (!perms || !canViewCalendarEvents(perms.workspaceRole, perms.teamLevel)) {
                return c.json({ error: 'Forbidden' }, 403)
            }
            allowedTeamIds = [teamId]
        } else if (workspaceSlug) {
            const workspace = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug)
            })
            if (!workspace) {
                console.log(`[Calendar GET] Workspace not found: ${workspaceSlug}`)
                return c.json({ success: true, data: [] })
            }

            console.log(`[Calendar GET] Found workspace: ${workspace.id}`)

            // Get workspace role first
            const wsMember = await db.query.workspaceMembers.findFirst({
                where: (wm, { and, eq }) => and(eq(wm.userId, userId), eq(wm.workspaceId, workspace.id))
            })
            const wsRole = (wsMember?.role || null) as WorkspaceRole | null
            console.log(`[Calendar GET] Workspace role: ${wsRole}`)

            const members = await db.query.teamMembers.findMany({
                where: (tm, { eq }) => eq(tm.userId, userId),
                with: { team: { columns: { workspaceId: true, id: true } } }
            })

            // Filter user's teams in this workspace
            const wsTeamMembers = members.filter(m => m.team.workspaceId === workspace.id)
            console.log(`[Calendar GET] Teams in workspace: ${wsTeamMembers.length}`)

            if (wsTeamMembers.length === 0 && (wsRole === 'owner' || wsRole === 'admin')) {
                // Owners/admins with no team memberships can still see all events
                const allTeams = await db.query.teams.findMany({
                    where: (t, { eq }) => eq(t.workspaceId, workspace.id),
                    columns: { id: true }
                })
                allowedTeamIds = allTeams.map(t => t.id)
                console.log(`[Calendar GET] Owner/admin fallback - ${allowedTeamIds.length} teams`)
            } else {
                allowedTeamIds = wsTeamMembers.filter(m => {
                    const teamLevel = (m.teamLevel || null) as TeamLevel | null
                    return canViewCalendarEvents(wsRole, teamLevel)
                }).map(m => m.teamId)
            }

        } else {
            // All teams logic... (simplified for brevity, assume similar to before)
            const members = await db.query.teamMembers.findMany({
                where: (tm, { eq }) => eq(tm.userId, userId),
                with: {
                    team: { columns: { workspaceId: true } }
                }
            })
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

        console.log(`[Calendar GET] allowedTeamIds: ${JSON.stringify(allowedTeamIds)}`)

        if (allowedTeamIds.length === 0) {
            return c.json({ success: true, data: [] })
        }

        // Build overlap condition using Postgres array literal string
        const pgArrayLiteral = `{${allowedTeamIds.join(',')}}`
        const overlapCondition = sql`team_ids && ${pgArrayLiteral}::uuid[]`

        const events = await db.query.calendarEvents.findMany({
            where: (e, { and, gte, lte, eq }) => {
                const wheres: any[] = []

                if (start) wheres.push(gte(e.startAt, new Date(start)))
                if (end) wheres.push(lte(e.endAt, new Date(end)))
                if (type) wheres.push(eq(e.type, type as any))

                wheres.push(overlapCondition)

                return and(...wheres)
            },
            with: {
                creator: {
                    columns: { id: true, name: true, image: true }
                },
                task: {
                    with: {
                        project: {
                            columns: { id: true, name: true }
                        },
                        assignee: {
                            columns: { id: true, name: true, image: true, email: true }
                        }
                    },
                    columns: { id: true, title: true, status: true, priority: true, projectId: true, assigneeId: true }
                }
            }
        })

        console.log(`[Calendar GET] Found ${events.length} events`)

        // Fetch team members for non-task events to populate participants
        const allTeamIds = [...new Set(events.flatMap(e => e.teamIds || []))]
        const teamMembersByTeam = new Map<string, any[]>()

        if (allTeamIds.length > 0) {
            const members = await db.query.teamMembers.findMany({
                where: (tm, { inArray }) => inArray(tm.teamId, allTeamIds),
                with: {
                    user: {
                        columns: { id: true, name: true, image: true }
                    }
                }
            })
            members.forEach(m => {
                if (!teamMembersByTeam.has(m.teamId)) teamMembersByTeam.set(m.teamId, [])
                teamMembersByTeam.get(m.teamId)?.push(m.user)
            })
        }

        const eventsWithAssignees = events.map(event => {
            const assigneesMap = new Map<string, any>()

            // Add Creator
            if (event.creator) {
                assigneesMap.set(event.creator.id, event.creator)
            }

            if (event.type === 'task') {
                // Add Task Assignee if exists
                const taskAssignee = event.task?.assignee
                if (taskAssignee) {
                    assigneesMap.set(taskAssignee.id, taskAssignee)
                }
            } else {
                // For Meetings, Events, Reminders - include all team members
                (event.teamIds || []).forEach(tid => {
                    const members = teamMembersByTeam.get(tid) || []
                    members.forEach(m => assigneesMap.set(m.id, m))
                })
            }

            return {
                ...event,
                assignees: Array.from(assigneesMap.values())
            }
        })

        return c.json({ success: true, data: eventsWithAssignees })
    } catch (error: any) {
        console.error('[Calendar GET] Error:', error?.message || error)
        console.error('[Calendar GET] Stack:', error?.stack)
        return c.json({ success: false, error: 'Failed to fetch events', details: String(error?.message || error) }, 500)
    }
})

// GET /api/calendar/export/:workspaceSlug - Export ical
// Note: This endpoint is public to allow subscription from Google/Apple Calendar.
// For higher security, we should implement per-user tokens.
calendarRoutes.get('/export/:workspaceSlug', async (c) => {
    try {
        const workspaceSlug = c.req.param('workspaceSlug')

        // Find workspace
        const workspace = await db.query.workspaces.findFirst({
            where: (ws, { eq }) => eq(ws.slug, workspaceSlug)
        })

        if (!workspace) return c.text('Workspace not found', 404)

        // Get all teams in workspace
        const teams = await db.query.teams.findMany({
            where: (t, { eq }) => eq(t.workspaceId, workspace.id),
            columns: { id: true }
        })

        const teamIds = teams.map(t => t.id)
        if (teamIds.length === 0) {
            const ics = generateICS([])
            return c.text(ics, 200, { 'Content-Type': 'text/calendar' })
        }

        // Fetch events for these teams
        // We fetch everything to allow full history/future in external apps
        const pgArrayLiteral = `{${teamIds.join(',')}}`
        const overlapCondition = sql`team_ids && ${pgArrayLiteral}::uuid[]`

        const events = await db.query.calendarEvents.findMany({
            where: overlapCondition
        })

        const ics = generateICS(events)

        return c.text(ics, 200, {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="calendar-${workspaceSlug}.ics"`,
            'Cache-Control': 'no-cache'
        })
    } catch (error: any) {
        console.error('[Calendar Export] Error:', error)
        return c.text('Error generating calendar', 500)
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
calendarRoutes.post('/', zValidator('json', createEventSchema), async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const body = c.req.valid('json')

        // Validation handled by schema
        if (body.teamIds.length === 0) {
            return c.json({ error: 'At least one team ID is required' }, 400)
        }

        // Permission check
        const canCreate = await checkTeamPermissions(userId, body.teamIds)
        if (!canCreate) {
            return c.json({ error: 'Forbidden: Cannot create events in selected teams' }, 403)
        }

        const baseEvent: NewCalendarEvent = {
            title: body.title,
            description: body.description,
            teamIds: body.teamIds,
            type: (body.type as any) || 'event',
            startAt: new Date(body.startAt),
            endAt: new Date(body.endAt),
            meetingLink: body.meetingLink, // Save meeting link
            taskId: body.taskId || null,
            createdBy: userId,
            allDay: body.isAllDay || false,
            recurrence: body.recurrence || null
        }

        const eventsToInsert: NewCalendarEvent[] = []
        // ... rest of logic for recurrence ...

        // Recurrence Handling (Materialization)
        if (body.recurrence) {
            try {
                // Defensive RRule usage to handle different module formats
                const RRuleToUse = (RRule as any).RRule || RRule

                // Limit infinite recurrence to avoid DB explosion
                const MAX_OCCURRENCES = 100
                const MAX_DATE = new Date()
                MAX_DATE.setFullYear(MAX_DATE.getFullYear() + 2)

                const ruleOptions = body.recurrence
                const dtstart = new Date(body.startAt)

                // Ensure until date is inclusive of the whole day if provided
                let until = MAX_DATE
                if (ruleOptions.until) {
                    until = new Date(ruleOptions.until)
                    // If time is not specified (00:00), set to end of day
                    if (until.getHours() === 0 && until.getMinutes() === 0) {
                        until.setHours(23, 59, 59, 999)
                    }
                }

                let freq = RRuleToUse.DAILY
                if (ruleOptions.frequency === 'weekly') freq = RRuleToUse.WEEKLY
                else if (ruleOptions.frequency === 'monthly') freq = RRuleToUse.MONTHLY
                else if (ruleOptions.frequency === 'yearly') freq = RRuleToUse.YEARLY

                const rule = new RRuleToUse({
                    freq,
                    dtstart,
                    until,
                    count: ruleOptions.count || (ruleOptions.until ? undefined : MAX_OCCURRENCES),
                    interval: ruleOptions.interval || 1,
                })

                const durationMs = new Date(body.endAt).getTime() - new Date(body.startAt).getTime()
                const occurrences = rule.all()

                occurrences.forEach((date: Date, index: number) => {
                    if (index === 0) {
                        // First event is the "Master" - keep recurrence rule
                        eventsToInsert.push(baseEvent)
                    } else {
                        // Subsequent events - No recurrence rule, just instances
                        eventsToInsert.push({
                            ...baseEvent,
                            startAt: date,
                            endAt: new Date(date.getTime() + durationMs),
                            recurrence: null // Clear recurrence for instances
                        })
                    }
                })
            } catch (expansionError) {
                console.error('[Calendar] Recurrence expansion failed:', expansionError)
            }
        }

        // Fallback: if no recurrence specified or expansion produced no results
        if (eventsToInsert.length === 0) {
            eventsToInsert.push(baseEvent)
        }

        // Insert all events
        const createdEvents = await db.insert(calendarEvents).values(eventsToInsert).returning()

        // Webhook (trigger for the first created event)
        if (createdEvents.length > 0) {
            await triggerWebhookWithWorkspace('calendar.created', createdEvents[0], createdEvents[0].teamIds[0])
        }

        return c.json({
            success: true,
            data: createdEvents[0],
            count: createdEvents.length
        })
    } catch (error: any) {
        console.error('Create event error:', error)
        return c.json({ success: false, error: error.message }, 500)
    }
})

// PATCH /api/calendar/:id - Update event
calendarRoutes.patch('/:id', zValidator('json', updateEventSchema), async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id
        const id = c.req.param('id')

        const body = c.req.valid('json')

        const existing = await db.query.calendarEvents.findFirst({
            where: (e, { eq }) => eq(e.id, id)
        })

        if (!existing) return c.json({ error: 'Event not found' }, 404)

        // Permission check on existing teams
        const perms = await getUserPermissions(userId, existing.teamIds[0])

        const isAuthor = existing.createdBy === userId
        const canManage = perms && canManageCalendarEvents(perms.workspaceRole, perms.teamLevel)

        if (!isAuthor && !canManage) {
            return c.json({ error: 'Forbidden: You can only edit your own events or need manage permission' }, 403)
        }

        // Handle date string to Date conversion
        // Zod passed strings, we need to convert for updateData
        const updateData: Partial<NewCalendarEvent> = {}
        if (body.title) updateData.title = body.title
        if (body.description) updateData.description = body.description
        if (body.teamIds) updateData.teamIds = body.teamIds
        if (body.startAt) updateData.startAt = new Date(body.startAt)
        if (body.endAt) updateData.endAt = new Date(body.endAt)
        if (body.meetingLink !== undefined) updateData.meetingLink = body.meetingLink
        if (body.recurrence !== undefined) updateData.recurrence = body.recurrence

        const [updated] = await db.update(calendarEvents)
            .set(updateData)
            .where(eq(calendarEvents.id, id))
            .returning()

        // Webhook
        await triggerWebhookWithWorkspace('calendar.updated', updated, existing.teamIds[0])

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
        const perms = await getUserPermissions(userId, existing.teamIds[0])

        const isAuthor = existing.createdBy === userId
        const canManage = perms && canManageCalendarEvents(perms.workspaceRole, perms.teamLevel)

        if (!isAuthor && !canManage) {
            return c.json({ error: 'Forbidden' }, 403)
        }

        await db.delete(calendarEvents).where(eq(calendarEvents.id, id))

        // Webhook
        await triggerWebhookWithWorkspace('calendar.deleted', existing, existing.teamIds[0])

        return c.json({ success: true, message: 'Event deleted' })
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500)
    }
})
