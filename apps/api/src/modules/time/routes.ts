import { Hono } from 'hono'
import { db } from '../../db'
import { timeEntries, type NewTimeEntry, tasks, subtasks } from '../../db/schema/tasks'
import { projects } from '../../db/schema/projects'
import { teams, teamMembers } from '../../db/schema/teams'
import { workspaces, workspaceMembers } from '../../db/schema/workspaces'
import { users } from '../../db/schema/users'
import { eq, desc, and, inArray } from 'drizzle-orm'
import {
    canCreateTimeEntries,
    canViewAllTimeEntries,
    canManageTimeEntries,
    type TeamLevel
} from '../../lib/permissions'

import { type Auth } from '../../lib/auth'

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString } from '../../lib/zod-extensions'

// Default role multipliers for revshare calculation
const DEFAULT_MULTIPLIERS: Record<string, number> = {
    owner: 2.0,
    admin: 1.8,
    project_manager: 1.5,
    hr_manager: 1.3,
    member: 1.0,
    guest: 0.5,
    team_lead: 1.4,
    senior: 1.2,
    mid: 1.0,
    junior: 0.8,
    intern: 0.6,
}

const createTimeEntrySchema = z.object({
    taskId: z.string(),
    subtaskId: z.string().optional().nullable(),
    userId: z.string().optional(),
    description: zSanitizedString().optional(),
    durationMinutes: z.number().int().nonnegative(),
    startedAt: z.string().datetime().or(z.date()), // Accepts ISO string or Date object
    endedAt: z.string().datetime().or(z.date()).optional().nullable(),
})

const startTimeEntrySchema = z.object({
    taskId: z.string(),
    subtaskId: z.string().optional().nullable(),
    userId: z.string().optional(),
    description: zSanitizedString().optional(),
})

const updateTimeEntrySchema = z.object({
    description: zSanitizedString().optional(),
    durationMinutes: z.number().int().nonnegative().optional(),
})

export const timeRoutes = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

// Helper: Get user's team level for a project's team
async function getUserTeamLevel(userId: string, teamId: string): Promise<TeamLevel | null> {
    const member = await db.query.teamMembers.findFirst({
        where: (tm, { eq, and }) => and(eq(tm.userId, userId), eq(tm.teamId, teamId))
    })
    return (member?.teamLevel as TeamLevel) || null
}

// Helper: Get teamId from taskId
async function getTeamIdFromTask(taskId: string): Promise<string | null> {
    const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (!task) return null
    const [project] = await db.select({ teamId: projects.teamId }).from(projects).where(eq(projects.id, task.projectId)).limit(1)
    return project?.teamId || null
}

// Helper: Get workspace role from a taskId
async function getWorkspaceRoleFromTask(userId: string, taskId: string): Promise<string | null> {
    const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (!task) return null
    const [project] = await db.select({ teamId: projects.teamId }).from(projects).where(eq(projects.id, task.projectId)).limit(1)
    if (!project) return null
    const [team] = await db.select({ workspaceId: teams.workspaceId }).from(teams).where(eq(teams.id, project.teamId)).limit(1)
    if (!team) return null
    const [wsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
        .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, team.workspaceId))).limit(1)
    return wsMember?.role || null
}

// GET /api/time - List time entries (own entries OR viewAll permission)
timeRoutes.get('/', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const { taskId, startDate, endDate } = c.req.query()
        const filterUserId = c.req.query('userId')

        let result = await db.select().from(timeEntries).orderBy(desc(timeEntries.startedAt))

        // Check if viewing all or filtering by specific user
        if (filterUserId && filterUserId !== userId) {
            // Need viewAll permission to see others' entries
            if (taskId) {
                const teamId = await getTeamIdFromTask(taskId)
                if (teamId) {
                    const teamLevel = await getUserTeamLevel(userId, teamId)
                    if (!canViewAllTimeEntries(null, teamLevel)) {
                        return c.json({ success: false, error: 'Unauthorized to view all time entries' }, 403)
                    }
                }
            }
        }

        if (taskId) result = result.filter(e => e.taskId === taskId)
        if (filterUserId) result = result.filter(e => e.userId === filterUserId)
        else result = result.filter(e => e.userId === userId) // Default: own entries only
        if (startDate) result = result.filter(e => new Date(e.startedAt) >= new Date(startDate))
        if (endDate) result = result.filter(e => new Date(e.startedAt) <= new Date(endDate))

        const totalMinutes = result.reduce((sum, e) => sum + e.durationMinutes, 0)

        // Fetch task and subtask titles for display
        const taskIds = [...new Set(result.map(e => e.taskId))]
        let taskMap: Record<string, string> = {}
        if (taskIds.length > 0) {
            const taskList = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(inArray(tasks.id, taskIds))
            taskMap = Object.fromEntries(taskList.map(t => [t.id, t.title]))
        }

        const subtaskIds = [...new Set(result.map(e => e.subtaskId).filter(Boolean) as string[])]
        let subtaskMap: Record<string, string> = {}
        if (subtaskIds.length > 0) {
            const subtaskList = await db.select({ id: subtasks.id, title: subtasks.title }).from(subtasks).where(inArray(subtasks.id, subtaskIds))
            subtaskMap = Object.fromEntries(subtaskList.map(s => [s.id, s.title]))
        }

        const enrichedResult = result.map(e => ({
            ...e,
            taskTitle: taskMap[e.taskId] || 'Unknown',
            subtaskTitle: e.subtaskId ? subtaskMap[e.subtaskId] || null : null
        }))

        return c.json({ success: true, data: enrichedResult, totalMinutes })
    } catch (error) {
        console.error('Error fetching time entries:', error)
        return c.json({ success: false, error: 'Failed to fetch time entries' }, 500)
    }
})

// GET /api/time/summary - Get time summary
timeRoutes.get('/summary', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const { startDate, endDate } = c.req.query()
        const filterUserId = c.req.query('userId')

        let result = await db.select().from(timeEntries)

        if (filterUserId) result = result.filter(e => e.userId === filterUserId)
        else result = result.filter(e => e.userId === userId)

        if (startDate) result = result.filter(e => new Date(e.startedAt) >= new Date(startDate))
        if (endDate) result = result.filter(e => new Date(e.startedAt) <= new Date(endDate))

        const totalMinutes = result.reduce((sum, e) => sum + e.durationMinutes, 0)
        return c.json({ success: true, totalMinutes, totalHours: Math.round(totalMinutes / 60 * 100) / 100 })
    } catch (error) {
        console.error('Error fetching time summary:', error)
        return c.json({ success: false, error: 'Failed to fetch summary' }, 500)
    }
})

// GET /api/time/my-tasks - Get tasks assigned to the current user (for task selector)
timeRoutes.get('/my-tasks', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const workspaceSlug = c.req.query('workspaceSlug')

        if (!workspaceSlug) {
            return c.json({ success: false, error: 'workspaceSlug is required' }, 400)
        }

        // Get workspace
        const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug)).limit(1)
        if (!workspace) {
            return c.json({ success: false, error: 'Workspace not found' }, 404)
        }

        // Get teams in this workspace
        const workspaceTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.workspaceId, workspace.id))
        const teamIds = workspaceTeams.map(t => t.id)

        if (teamIds.length === 0) {
            return c.json({ success: true, data: [] })
        }

        // Get projects for those teams
        const teamProjects = await db.select({
            id: projects.id,
            name: projects.name,
            teamId: projects.teamId
        }).from(projects).where(inArray(projects.teamId, teamIds))

        if (teamProjects.length === 0) {
            return c.json({ success: true, data: [] })
        }

        const projectIds = teamProjects.map(p => p.id)

        // Get tasks assigned to this user in those projects
        const allTasks = await db.select().from(tasks)
            .where(inArray(tasks.projectId, projectIds))
            .orderBy(desc(tasks.updatedAt))

        const targetUserId = c.req.query('targetUserId') || userId

        // Filter to tasks strictly assigned to the target user
        const myTasks = allTasks.filter(t =>
            t.assignees && t.assignees.includes(targetUserId)
        )

        // Get subtasks for these tasks
        const taskIds = myTasks.map(t => t.id)
        let taskSubtasks: any[] = []
        if (taskIds.length > 0) {
            taskSubtasks = await db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds))
        }

        // Build project map
        const projectMap = Object.fromEntries(teamProjects.map(p => [p.id, p]))

        // Build response with tasks grouped by project
        const result = myTasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            projectName: projectMap[t.projectId]?.name || 'Unknown',
            subtasks: taskSubtasks
                .filter(s => s.taskId === t.id)
                .map(s => ({
                    id: s.id,
                    title: s.title,
                    isCompleted: s.isCompleted,
                })),
        }))

        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching my tasks:', error)
        return c.json({ success: false, error: 'Failed to fetch tasks' }, 500)
    }
})

// GET /api/time/revshare/:projectId - Calculate influence points & revshare percentages
timeRoutes.get('/revshare/:projectId', async (c) => {
    try {
        const projectId = c.req.param('projectId')

        // Get project and workspace
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        if (!project) return c.json({ success: false, error: 'Project not found' }, 404)

        const [team] = await db.select().from(teams).where(eq(teams.id, project.teamId)).limit(1)
        if (!team) return c.json({ success: false, error: 'Team not found' }, 404)

        const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, team.workspaceId)).limit(1)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

        // Get multipliers from workspace settings or use defaults
        const multipliers = { ...DEFAULT_MULTIPLIERS, ...(workspace.settings as any)?.revshareMultipliers }
        const taskWeight = (workspace.settings as any)?.revshareTaskWeight ?? 1.0
        const subtaskWeight = (workspace.settings as any)?.revshareSubtaskWeight ?? 0.8

        // Get all tasks in this project
        const projectTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, projectId))
        const taskIds = projectTasks.map(t => t.id)

        if (taskIds.length === 0) {
            return c.json({ success: true, data: { participants: [], totalIP: 0, multipliers, taskWeight, subtaskWeight } })
        }

        // Get all time entries for these tasks
        const entries = await db.select().from(timeEntries).where(inArray(timeEntries.taskId, taskIds))

        // Get all unique user IDs
        const userIds = [...new Set(entries.map(e => e.userId))]
        if (userIds.length === 0) {
            return c.json({ success: true, data: { participants: [], totalIP: 0, multipliers, taskWeight, subtaskWeight } })
        }

        // Get user details
        const userDetails = await db.select({
            id: users.id,
            name: users.name,
            image: users.image,
        }).from(users).where(inArray(users.id, userIds))
        const userMap = Object.fromEntries(userDetails.map(u => [u.id, u]))

        // Get workspace roles for users
        const wsMembers = await db.select({
            userId: workspaceMembers.userId,
            role: workspaceMembers.role,
        }).from(workspaceMembers).where(
            and(eq(workspaceMembers.workspaceId, workspace.id), inArray(workspaceMembers.userId, userIds))
        )
        const wsRoleMap = Object.fromEntries(wsMembers.map(m => [m.userId, m.role]))

        // Get team roles for users
        const tmMembers = await db.select({
            userId: teamMembers.userId,
            teamLevel: teamMembers.teamLevel,
        }).from(teamMembers).where(
            and(eq(teamMembers.teamId, project.teamId), inArray(teamMembers.userId, userIds))
        )
        const tmRoleMap = Object.fromEntries(tmMembers.map(m => [m.userId, m.teamLevel]))

        // Calculate IP per user
        const userIPs: Record<string, { totalMinutes: number, ip: number, role: string }> = {}

        for (const entry of entries) {
            if (!userIPs[entry.userId]) {
                // Determine effective role: prefer team level, fall back to workspace role
                const teamRole = tmRoleMap[entry.userId]
                const wsRole = wsRoleMap[entry.userId]
                const effectiveRole = teamRole || wsRole || 'member'
                userIPs[entry.userId] = { totalMinutes: 0, ip: 0, role: effectiveRole }
            }

            const weight = entry.subtaskId ? subtaskWeight : taskWeight
            const multiplier = multipliers[userIPs[entry.userId].role] ?? 1.0

            userIPs[entry.userId].totalMinutes += entry.durationMinutes
            userIPs[entry.userId].ip += entry.durationMinutes * multiplier * weight
        }

        const totalIP = Object.values(userIPs).reduce((sum, u) => sum + u.ip, 0)

        // Build participants array
        const participants = Object.entries(userIPs).map(([userId, data]) => ({
            userId,
            name: userMap[userId]?.name || 'Unknown',
            image: userMap[userId]?.image || null,
            role: data.role,
            totalMinutes: data.totalMinutes,
            totalHours: Math.round(data.totalMinutes / 60 * 100) / 100,
            influencePoints: Math.round(data.ip * 100) / 100,
            sharePercent: totalIP > 0 ? Math.round((data.ip / totalIP) * 10000) / 100 : 0,
        })).sort((a, b) => b.influencePoints - a.influencePoints)

        return c.json({
            success: true,
            data: {
                participants,
                totalIP: Math.round(totalIP * 100) / 100,
                multipliers,
                taskWeight,
                subtaskWeight,
            }
        })
    } catch (error) {
        console.error('Error calculating revshare:', error)
        return c.json({ success: false, error: 'Failed to calculate revshare' }, 500)
    }
})

// GET /api/time/project/:projectId - List time entries for a project (owner/admin view)
timeRoutes.get('/project/:projectId', async (c) => {
    try {
        const projectId = c.req.param('projectId')

        // Get tasks in project
        const projectTasks = await db.select({
            id: tasks.id,
            title: tasks.title,
        }).from(tasks).where(eq(tasks.projectId, projectId))
        const taskIds = projectTasks.map(t => t.id)

        if (taskIds.length === 0) {
            return c.json({ success: true, data: [] })
        }

        const taskMap = Object.fromEntries(projectTasks.map(t => [t.id, t]))

        // Get all time entries for these tasks
        const entries = await db.select().from(timeEntries)
            .where(inArray(timeEntries.taskId, taskIds))
            .orderBy(desc(timeEntries.startedAt))

        // Get subtask info
        const subtaskIds = entries.filter(e => e.subtaskId).map(e => e.subtaskId!) as string[]
        let subtaskMap: Record<string, any> = {}
        if (subtaskIds.length > 0) {
            const subtaskList = await db.select({ id: subtasks.id, title: subtasks.title }).from(subtasks).where(inArray(subtasks.id, subtaskIds))
            subtaskMap = Object.fromEntries(subtaskList.map(s => [s.id, s]))
        }

        // Get user info
        const userIds = [...new Set(entries.map(e => e.userId))]
        const userDetails = userIds.length > 0
            ? await db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(inArray(users.id, userIds))
            : []
        const userMap = Object.fromEntries(userDetails.map(u => [u.id, u]))

        const result = entries.map(e => ({
            ...e,
            taskTitle: taskMap[e.taskId]?.title || 'Unknown',
            subtaskTitle: e.subtaskId ? subtaskMap[e.subtaskId]?.title || null : null,
            userName: userMap[e.userId]?.name || 'Unknown',
            userImage: userMap[e.userId]?.image || null,
        }))

        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching project time entries:', error)
        return c.json({ success: false, error: 'Failed to fetch project time entries' }, 500)
    }
})

// POST /api/time - Create time entry (requires timeTracking.create permission)
timeRoutes.post('/', zValidator('json', createTimeEntrySchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const body = c.req.valid('json')

        // Get teamId from task
        const teamId = await getTeamIdFromTask(body.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions (check both workspace role and team level)
        const teamLevel = await getUserTeamLevel(userId, teamId)
        const wsRole = await getWorkspaceRoleFromTask(userId, body.taskId)

        if (!canCreateTimeEntries(wsRole as any, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create time entries' }, 403)
        }

        // Check if trying to create an entry for someone else
        if (body.userId && body.userId !== userId) {
            if (!canManageTimeEntries(wsRole as any, teamLevel)) {
                return c.json({ success: false, error: 'Unauthorized to create time entries for other users' }, 403)
            }
        }

        const newEntry: NewTimeEntry = {
            taskId: body.taskId,
            subtaskId: body.subtaskId || null,
            userId: body.userId || userId,
            description: body.description || null,
            durationMinutes: body.durationMinutes,
            startedAt: new Date(body.startedAt),
            endedAt: body.endedAt ? new Date(body.endedAt) : null,
        }
        const [created] = await db.insert(timeEntries).values(newEntry).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating time entry:', error)
        return c.json({ success: false, error: 'Failed to create time entry' }, 500)
    }
})

// POST /api/time/start - Start timer
timeRoutes.post('/start', zValidator('json', startTimeEntrySchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const body = c.req.valid('json')

        // Get teamId from task
        const teamId = await getTeamIdFromTask(body.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions (check both workspace role and team level)
        const teamLevel = await getUserTeamLevel(userId, teamId)
        const wsRole = await getWorkspaceRoleFromTask(userId, body.taskId)

        if (!canCreateTimeEntries(wsRole as any, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to track time' }, 403)
        }

        const newEntry: NewTimeEntry = {
            taskId: body.taskId,
            subtaskId: body.subtaskId || null,
            userId: body.userId || userId,
            description: body.description || null,
            durationMinutes: 0,
            startedAt: new Date(),
        }
        const [created] = await db.insert(timeEntries).values(newEntry).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error starting timer:', error)
        return c.json({ success: false, error: 'Failed to start timer' }, 500)
    }
})

// PATCH /api/time/:id/stop - Stop timer
timeRoutes.patch('/:id/stop', async (c) => {
    try {
        const id = c.req.param('id')
        const user = c.get('user')
        const userId = user.id

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        // Only owner can stop their timer
        if (entry.userId !== userId) {
            return c.json({ success: false, error: 'Unauthorized to stop this timer' }, 403)
        }

        const endedAt = new Date()
        const durationMinutes = Math.round((endedAt.getTime() - new Date(entry.startedAt).getTime()) / 60000)
        const [updated] = await db.update(timeEntries).set({ endedAt, durationMinutes }).where(eq(timeEntries.id, id)).returning()
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error stopping timer:', error)
        return c.json({ success: false, error: 'Failed to stop timer' }, 500)
    }
})

// PATCH /api/time/:id - Update time entry (owner OR manage permission)
timeRoutes.patch('/:id', zValidator('json', updateTimeEntrySchema), async (c) => {
    try {
        const id = c.req.param('id')
        const user = c.get('user')
        const userId = user.id
        const body = c.req.valid('json')

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        const isOwner = entry.userId === userId

        // Get teamId from task
        const teamId = await getTeamIdFromTask(entry.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: is owner OR has manage permission
        if (!isOwner && !canManageTimeEntries(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to update time entry' }, 403)
        }

        const updateData: Partial<NewTimeEntry> = {}
        if (body.description !== undefined) updateData.description = body.description
        if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes

        const [updated] = await db.update(timeEntries).set(updateData).where(eq(timeEntries.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Time entry not found' }, 404)
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating time entry:', error)
        return c.json({ success: false, error: 'Failed to update time entry' }, 500)
    }
})

// DELETE /api/time/:id - Delete time entry (owner OR manage permission)
timeRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const user = c.get('user')
        const userId = user.id

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        const isOwner = entry.userId === userId

        // Get teamId from task
        const teamId = await getTeamIdFromTask(entry.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: is owner OR has manage permission
        if (!isOwner && !canManageTimeEntries(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete time entry' }, 403)
        }

        const [deleted] = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Time entry not found' }, 404)
        return c.json({ success: true, message: 'Time entry deleted' })
    } catch (error) {
        console.error('Error deleting time entry:', error)
        return c.json({ success: false, error: 'Failed to delete time entry' }, 500)
    }
})
