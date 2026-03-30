import { Hono } from 'hono'
import { db } from '../../db'
import { timeEntries, type NewTimeEntry, tasks, subtasks } from '../../db/schema/tasks'
import { calendarEvents } from '../../db/schema/calendar'
import { projects, projectMembers } from '../../db/schema/projects'
import { teams, teamMembers } from '../../db/schema/teams'
import { workspaces, workspaceMembers } from '../../db/schema/workspaces'
import { users } from '../../db/schema/users'
import { eq, desc, and, inArray, or, sql, gte } from 'drizzle-orm'
import {
    canCreateTimeEntries,
    canViewAllTimeEntries,
    canManageTimeEntries,
    type TeamLevel
} from '../../lib/permissions'

import { type Auth } from '../../lib/auth'
import { NotificationService } from '../notifications/service'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString } from '../../lib/zod-extensions'

// Default role multipliers for revshare calculation
const ROLE_COEFFICIENTS: Record<string, number> = {
    project_leader: 1.25,
    area_leader: 1.10,
    participant: 1.00,
}

const DIFFICULTY_COEFFICIENTS: Record<string, number> = {
    basic: 0.75,
    standard: 1.00,
    advanced: 1.30,
    critical: 1.50,
}

const isUUID = (val: string | null | undefined): boolean => {
    if (!val) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

// Mapowanie ról workspace/team → współczynnik projektu
export function resolveProjectRole(wsRole: string, isAnyTeamLead: boolean): string {
    // Owner, Admin, Project Manager → Lider Projektu (Najwyższa ranga)
    if (['owner', 'admin', 'project_manager'].includes(wsRole)) return 'Project_Leader'
    // Jeśli jest leaderem w DOWOLNYM zespole w tym workspace → Lider Obszaru
    if (isAnyTeamLead) return 'Team_Leader'
    // Wszyscy inni → Uczestnik
    return 'Participant'
}

const createTimeEntrySchema = z.object({
    taskId: z.string().optional().nullable(),
    subtaskId: z.string().optional().nullable(),
    userId: z.string().optional(),
    workspaceSlug: z.string().optional(),
    description: zSanitizedString().optional(),
    durationMinutes: z.number().int().nonnegative(),
    startedAt: z.string().datetime().or(z.date()), // Accepts ISO string or Date object
    endedAt: z.string().datetime().or(z.date()).optional().nullable(),
    entryType: z.enum(['task', 'meeting']).default('task'),
})

const approveTimeEntrySchema = z.object({
    difficultyLevel: z.enum(['basic', 'standard', 'advanced', 'critical']),
    bonusPoints: z.number().int().nonnegative().optional(),
})

const rejectTimeEntrySchema = z.object({
    rejectionReason: z.string().min(5).max(500),
})

const startTimeEntrySchema = z.object({
    taskId: z.string().optional().nullable(),
    subtaskId: z.string().optional().nullable(),
    userId: z.string().optional(),
    workspaceSlug: z.string().optional(),
    description: zSanitizedString().optional(),
    entryType: z.enum(['task', 'meeting']).default('task'),
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
async function getTeamIdFromTask(taskId: string | null | undefined): Promise<string | null> {
    if (!taskId || !isUUID(taskId)) return null
    const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (!task) return null
    const [project] = await db.select({ teamId: projects.teamId }).from(projects).where(eq(projects.id, task.projectId)).limit(1)
    return project?.teamId || null
}

// Helper: Check if user is a team_lead in ANY team within a workspace
async function isUserAnyTeamLead(userId: string, workspaceId: string): Promise<boolean> {
    const [lead] = await db.select({ id: teamMembers.id })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(
            and(
                eq(teamMembers.userId, userId),
                eq(teamMembers.teamLevel, 'team_lead'),
                eq(teams.workspaceId, workspaceId)
            )
        )
        .limit(1)
    return !!lead
}
// Helper: Get workspace role from a taskId
async function getWorkspaceRoleFromTask(userId: string, taskId: string | null | undefined): Promise<string | null> {
    if (!taskId || !isUUID(taskId)) return null
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
        const { taskId, startDate, endDate, approvalStatus } = c.req.query()
        const filterUserId = c.req.query('userId')

        let query = db.select().from(timeEntries).orderBy(desc(timeEntries.startedAt))
        let result = await query

        // Check if viewing all or filtering by specific user
        if (filterUserId && filterUserId !== userId) {
            // Need viewAll permission to see others' entries
            if (taskId) {
                const teamId = await getTeamIdFromTask(taskId as string)
                if (teamId) {
                    const teamLevel = await getUserTeamLevel(userId, teamId)
                    if (!canViewAllTimeEntries(null, teamLevel as any)) {
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
        if (approvalStatus) result = result.filter(e => e.approvalStatus === approvalStatus)

        // Fetch task and subtask titles for display
        const taskIds = [...new Set(result.map(e => e.taskId).filter(Boolean) as string[])]
        let taskMap: Record<string, string> = {
            'standalone-meetings': 'Meetings & Calendar Events'
        }
        if (taskIds.length > 0) {
            const taskList = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(inArray(tasks.id, taskIds))
            taskList.forEach(t => { taskMap[t.id] = t.title })
        }

        const subtaskIds = [...new Set(result.map(e => e.subtaskId).filter(Boolean) as string[])]
        let subtaskMap: Record<string, string> = {}
        if (subtaskIds.length > 0) {
            const subtaskList = await db.select({ id: subtasks.id, title: subtasks.title }).from(subtasks).where(inArray(subtasks.id, subtaskIds))
            subtaskMap = Object.fromEntries(subtaskList.map(s => [s.id, s.title]))
        }

        // Apply 50% rule for meetings and calculate points
        const enrichedResult = result.map(e => {
            const rawDuration = e.durationMinutes
            const effectiveDuration = e.entryType === 'meeting' ? rawDuration * 0.5 : rawDuration

            const roleFactor = ROLE_COEFFICIENTS[e.projectRole] ?? 1.0
            const diffFactor = DIFFICULTY_COEFFICIENTS[e.difficultyLevel] ?? 1.0
            const points = Math.round(((effectiveDuration / 60) * roleFactor * diffFactor + (e.bonusPoints || 0)) * 100) / 100

            return {
                ...e,
                durationMinutes: effectiveDuration, // Override with effective duration
                rawDurationMinutes: rawDuration,
                points,
                taskTitle: (e.taskId ? taskMap[e.taskId] : taskMap['standalone-meetings']) || 'General',
                subtaskTitle: (e.subtaskId && typeof e.subtaskId === 'string') ? subtaskMap[e.subtaskId] || null : null
            }
        })

        const totalMinutes = enrichedResult.reduce((sum, e) => sum + e.durationMinutes, 0)

        return c.json({ success: true, data: enrichedResult, totalMinutes })
    } catch (error: any) {
        console.error('Error fetching time entries:', error)
        return c.json({ success: false, error: 'Failed to fetch time entries', details: error.message }, 500)
    }
})

timeRoutes.get('/summary', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const { startDate, endDate } = c.req.query()
        const filterUserId = c.req.query('userId')

        let result = await db.select({ durationMinutes: timeEntries.durationMinutes, entryType: timeEntries.entryType, userId: timeEntries.userId, startedAt: timeEntries.startedAt }).from(timeEntries)

        if (filterUserId) result = result.filter(e => e.userId === filterUserId)
        else result = result.filter(e => e.userId === userId)

        if (startDate) result = result.filter(e => new Date(e.startedAt) >= new Date(startDate))
        if (endDate) result = result.filter(e => new Date(e.startedAt) <= new Date(endDate))

        const totalMinutes = result.reduce((sum, e) => {
            const effective = e.entryType === 'meeting' ? e.durationMinutes * 0.5 : e.durationMinutes
            return sum + effective
        }, 0)
        return c.json({ success: true, totalMinutes, totalHours: Math.round(totalMinutes / 60 * 100) / 100 })
    } catch (error: any) {
        console.error('Error fetching time summary:', error)
        return c.json({ success: false, error: 'Failed to fetch summary', details: error.message }, 500)
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

        // Get ALL tasks in these projects to find associated meetings
        const allTasksInProjects = await db.select().from(tasks)
            .where(inArray(tasks.projectId, projectIds))
            .orderBy(desc(tasks.updatedAt))

        const targetUserId = c.req.query('targetUserId') || userId
        const allTaskIds = allTasksInProjects.map(t => t.id)

        let allSubtasks: any[] = []
        let allMeetings: any[] = []

        if (allTaskIds.length > 0) {
            allSubtasks = await db.select({
                id: subtasks.id,
                title: subtasks.title,
                taskId: subtasks.taskId,
                isCompleted: subtasks.isCompleted
            }).from(subtasks).where(inArray(subtasks.taskId, allTaskIds))

            allMeetings = await db.select({
                id: calendarEvents.id,
                title: calendarEvents.title,
                taskId: calendarEvents.taskId,
                startAt: calendarEvents.startAt,
            }).from(calendarEvents).where(
                and(
                    eq(calendarEvents.workspaceId, workspace.id),
                    inArray(calendarEvents.type, ['meeting', 'event']),
                    gte(calendarEvents.endAt, sql`now()`),
                    or(
                        inArray(calendarEvents.taskId, allTaskIds.length > 0 ? allTaskIds : ['']),
                        eq(calendarEvents.createdBy, userId),
                        sql`${userId} = ANY(${calendarEvents.attendeeIds})`
                    )
                )
            ).orderBy(desc(calendarEvents.startAt))
        }

        // Filter to:
        // 1. Tasks assigned to user
        // 2. Tasks that have meetings (so user can pick the meeting)
        const myTasks = allTasksInProjects.filter(t =>
            (t.assignees && t.assignees.includes(targetUserId) && !t.isCompleted) ||
            allMeetings.some(m => m.taskId === t.id)
        )

        // Build project map
        const projectMap = Object.fromEntries(teamProjects.map(p => [p.id, p]))

        // Build response with tasks grouped by project
        const taskResults = myTasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            projectName: projectMap[t.projectId]?.name || 'Unknown',
            type: 'task',
            subtasks: allSubtasks
                .filter(s => s.taskId === t.id && !s.isCompleted)
                .map(s => ({
                    id: s.id,
                    title: s.title,
                    isCompleted: s.isCompleted,
                })),
            meetings: allMeetings
                .filter(m => m.taskId === t.id)
                .map(m => ({
                    id: m.id,
                    title: m.title,
                    taskId: m.taskId,
                    date: m.startAt,
                })),
        }))

        // Filter standalone meetings (no taskId or taskId not in our projects)
        const standaloneMeetings = allMeetings.filter(m => !m.taskId || !allTaskIds.includes(m.taskId))

        if (standaloneMeetings.length > 0) {
            // Add a virtual task for standalone meetings
            taskResults.push({
                id: 'standalone-meetings',
                title: 'Meetings & Calendar Events',
                status: 'todo',
                priority: 'medium',
                projectId: 'calendar',
                projectName: 'Calendar',
                type: 'task',
                subtasks: [],
                meetings: standaloneMeetings.map(m => ({
                    id: m.id,
                    title: m.title,
                    taskId: 'standalone-meetings',
                    date: m.startAt,
                }))
            } as any)
        }

        return c.json({ success: true, data: taskResults })
    } catch (error: any) {
        console.error('Error fetching my tasks:', error)
        return c.json({ success: false, error: 'Failed to fetch tasks', details: error.message }, 500)
    }
})

// GET /api/time/contribution/:projectId - Calculate contribution points & revshare percentages
// GET /api/time/contribution/:projectId/monthly - Monthly view
timeRoutes.get('/contribution/:projectId/monthly', async (c) => {
    return handleContribution(c, 'monthly')
})

// GET /api/time/contribution/:projectId/cumulative - Cumulative view
timeRoutes.get('/contribution/:projectId/cumulative', async (c) => {
    return handleContribution(c, 'cumulative')
})

// GET /api/time/contribution/:projectId/custom - Custom date range
timeRoutes.get('/contribution/:projectId/custom', async (c) => {
    return handleContribution(c, 'custom')
})

// GET /api/time/contribution/:projectId - Base route (defaults to cumulative)
timeRoutes.get('/contribution/:projectId', async (c) => {
    return handleContribution(c, 'cumulative')
})

// GET /api/time/contribution/:projectId/member - Single member view
timeRoutes.get('/contribution/:projectId/member', async (c) => {
    const userId = c.req.query('userId')
    if (!userId) return c.json({ success: false, error: 'userId is required' }, 400)
    return handleContribution(c, 'cumulative', userId)
})

async function handleContribution(c: any, type: string, targetUserId?: string) {
    try {
        const projectId = c.req.param('projectId')
        const { month, startDate, endDate } = c.req.query() // month='YYYY-MM', or startDate/endDate for custom

        // Get project and workspace
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        if (!project) return c.json({ success: false, error: 'Project not found' }, 404)

        const [team] = await db.select().from(teams).where(eq(teams.id, project.teamId)).limit(1)
        if (!team) return c.json({ success: false, error: 'Team not found' }, 404)

        const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, team.workspaceId)).limit(1)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

        // Get threshold from settings (default 200)
        const hourThreshold = workspace.settings?.revshareHourThreshold || 200

        // Get all tasks in this project
        const projectTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, projectId))
        const taskIds = projectTasks.map(t => t.id)

        // --- FETCH ALL APPROVED ENTRIES ---
        const allApprovedEntries = await db.select().from(timeEntries).where(
            and(
                or(
                    taskIds.length > 0 ? inArray(timeEntries.taskId, taskIds) : sql`false`,
                    and(
                        eq(timeEntries.workspaceId, workspace.id),
                        eq(timeEntries.entryType, 'meeting'),
                        sql`${timeEntries.taskId} IS NULL`
                    )
                ),
                eq(timeEntries.approvalStatus, 'approved')
            )
        )

        // --- FILTER ENTRIES BY RANGE ---
        let targetEntries = allApprovedEntries
        if (type === 'monthly' && month) {
            const [yearStr, monthStr] = month.split('-')
            const yr = parseInt(yearStr, 10)
            const mo = parseInt(monthStr, 10) - 1
            const startOfMonth = new Date(yr, mo, 1)
            const endOfMonth = new Date(yr, mo + 1, 0, 23, 59, 59)
            targetEntries = allApprovedEntries.filter(e => {
                const d = new Date(e.startedAt)
                return d >= startOfMonth && d <= endOfMonth
            })
        } else if (type === 'custom' && startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            targetEntries = allApprovedEntries.filter(e => {
                const d = new Date(e.startedAt)
                return d >= start && d <= end
            })
        }

        // Fetch project mapping for all users involved to get CURRENT roles (Workspace + Team context)
        const membersData = await db.select({
            userId: projectMembers.userId,
            wsRole: workspaceMembers.role,
            isAnyTeamLead: sql<boolean>`EXISTS (
                SELECT 1 FROM team_members tm 
                JOIN teams t ON tm.team_id = t.id 
                WHERE tm.user_id = ${projectMembers.userId} 
                AND tm.team_level = 'team_lead' 
                AND t.workspace_id = ${workspace.id}
            )`
        }).from(projectMembers)
            .leftJoin(workspaceMembers, and(eq(workspaceMembers.userId, projectMembers.userId), eq(workspaceMembers.workspaceId, workspace.id)))
            .where(eq(projectMembers.projectId, projectId))

        const memberRoleMap = Object.fromEntries(membersData.map(m => {
            const resolved = resolveProjectRole(m.wsRole || 'member', !!m.isAnyTeamLead)
            return [m.userId, resolved]
        }))

        // --- CALCULATE USER TOTAL APPROVED HOURS (GLOBAL FOR 200H CHECK) ---
        const userTotalApprovedMinutes: Record<string, number> = {}
        for (const entry of allApprovedEntries) {
            const effectiveDuration = entry.entryType === 'meeting' ? entry.durationMinutes * 0.5 : entry.durationMinutes
            userTotalApprovedMinutes[entry.userId] = (userTotalApprovedMinutes[entry.userId] || 0) + effectiveDuration
        }

        const allProjectUserIds = membersData.map(m => m.userId)
        const displayUserIds = targetUserId ? [targetUserId] : allProjectUserIds

        const userDetails = displayUserIds.length > 0
            ? await db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(inArray(users.id, displayUserIds))
            : []
        const userMap = Object.fromEntries(userDetails.map(u => [u.id, u]))

        // Calculate Stats for current range AND total project PW
        const userStats: Record<string, any> = {}
        let totalProjectPW = 0

        for (const entry of targetEntries) {
            const effectiveDuration = entry.entryType === 'meeting' ? entry.durationMinutes * 0.5 : entry.durationMinutes
            const timeHours = effectiveDuration / 60

            // PRIORITY: Use current project role if available, fallback to stored role
            const currentResolvedRole = memberRoleMap[entry.userId] || entry.projectRole || 'participant'
            const roleFactor = ROLE_COEFFICIENTS[currentResolvedRole] ?? 1.0
            const diffFactor = DIFFICULTY_COEFFICIENTS[entry.difficultyLevel] ?? 1.0

            const points = timeHours * roleFactor * diffFactor + (entry.bonusPoints || 0)

            if (!userStats[entry.userId]) {
                userStats[entry.userId] = { totalMinutes: 0, pw: 0, bonus: 0, role: currentResolvedRole, averageDifficulty: 0, taskCount: 0 }
            }
            const stats = userStats[entry.userId]

            stats.totalMinutes += effectiveDuration
            stats.pw += points
            stats.bonus += (entry.bonusPoints || 0)
            if (entry.durationMinutes > 0) {
                stats.averageDifficulty += diffFactor
                stats.taskCount++
            }

            totalProjectPW += points
        }

        // Calculate total PW for pool (qualifying users only)
        let totalRevSharePW = 0
        const poolUserStats: Record<string, number> = {}
        for (const entry of allApprovedEntries) {
            const effectiveDuration = entry.entryType === 'meeting' ? entry.durationMinutes * 0.5 : entry.durationMinutes
            const currentResolvedRole = memberRoleMap[entry.userId] || entry.projectRole || 'participant'
            const roleFactor = ROLE_COEFFICIENTS[currentResolvedRole] ?? 1.0
            const diffFactor = DIFFICULTY_COEFFICIENTS[entry.difficultyLevel] ?? 1.0
            const points = (effectiveDuration / 60) * roleFactor * diffFactor + (entry.bonusPoints || 0)
            poolUserStats[entry.userId] = (poolUserStats[entry.userId] || 0) + points
        }

        for (const [uId, pw] of Object.entries(poolUserStats)) {
            if ((userTotalApprovedMinutes[uId] || 0) / 60 >= hourThreshold) {
                totalRevSharePW += pw
            }
        }

        const participants = displayUserIds.map(uId => {
            const currentRole = memberRoleMap[uId] || 'participant'
            const data = userStats[uId] || { totalMinutes: 0, pw: 0, bonus: 0, role: currentRole, averageDifficulty: 0, taskCount: 0 }
            const approvedHoursTotal = (userTotalApprovedMinutes[uId] || 0) / 60
            const hasThreshold = approvedHoursTotal >= hourThreshold
            let sharePercent = 0
            if (hasThreshold && totalRevSharePW > 0) {
                sharePercent = Math.round((data.pw / totalRevSharePW) * 10000) / 100
            }

            return {
                userId: uId,
                name: userMap[uId]?.name || 'Unknown',
                image: userMap[uId]?.image || null,
                role: currentRole, // Use current role here
                totalMinutes: data.totalMinutes,
                totalHours: Math.round(data.totalMinutes / 60 * 100) / 100,
                averageDifficulty: data.taskCount > 0 ? (Math.round((data.averageDifficulty / data.taskCount) * 100) / 100) : 0,
                bonusPoints: data.bonus,
                contributionPoints: Math.round(data.pw * 100) / 100,
                hasThreshold,
                approvedBaseHoursTotal: Math.round(approvedHoursTotal * 100) / 100,
                sharePercent
            }
        })

        const sortedParticipants = [...participants].sort((a, b) => b.contributionPoints - a.contributionPoints)
        const dashboardParticipants = sortedParticipants.filter(p => p.totalMinutes > 0 || p.bonusPoints > 0)

        if (targetUserId) {
            const recentQuery = db.select().from(timeEntries)
                .where(
                    and(
                        or(
                            taskIds.length > 0 ? inArray(timeEntries.taskId, taskIds) : sql`false`,
                            and(
                                eq(timeEntries.workspaceId, workspace.id),
                                eq(timeEntries.entryType, 'meeting'),
                                sql`${timeEntries.taskId} IS NULL`
                            )
                        ),
                        eq(timeEntries.userId, targetUserId)
                    )
                )
                .orderBy(desc(timeEntries.startedAt))
                .limit(10)

            const recent = await recentQuery

            const recentTaskIds = [...new Set(recent.map(r => r.taskId).filter(Boolean) as string[])]
            let recentTaskMap: Record<string, string> = {
                'standalone-meetings': 'Meetings & Calendar Events'
            }
            if (recentTaskIds.length > 0) {
                const recentTasks = await db.select({ id: tasks.id, title: tasks.title })
                    .from(tasks)
                    .where(inArray(tasks.id, recentTaskIds))
                recentTasks.forEach(t => { recentTaskMap[t.id] = t.title })
            }

            const mappedRecent = recent.map(r => {
                const effective = r.entryType === 'meeting' ? r.durationMinutes * 0.5 : r.durationMinutes
                const currentResolvedRole = memberRoleMap[r.userId] || r.projectRole || 'participant'
                const roleFactor = ROLE_COEFFICIENTS[currentResolvedRole] ?? 1.0
                const diffFactor = DIFFICULTY_COEFFICIENTS[r.difficultyLevel] ?? 1.0
                const points = Math.round(((effective / 60) * roleFactor * diffFactor + (r.bonusPoints || 0)) * 100) / 100

                return {
                    id: r.id,
                    taskId: r.taskId,
                    taskTitle: (r.taskId ? recentTaskMap[r.taskId] : recentTaskMap['standalone-meetings']) || 'General',
                    durationMinutes: effective,
                    rawDurationMinutes: r.durationMinutes,
                    description: r.description,
                    startedAt: r.startedAt,
                    entryType: r.entryType,
                    approvalStatus: r.approvalStatus,
                    points
                }
            })

            return c.json({
                success: true,
                data: {
                    summary: participants[0],
                    recentEntries: mappedRecent,
                    hourThreshold
                }
            })
        }

        return c.json({
            success: true,
            data: {
                participants: dashboardParticipants,
                totalPW: Math.round(totalRevSharePW * 100) / 100,
                totalProjectPW: Math.round(totalProjectPW * 100) / 100,
                hourThreshold
            }
        })
    } catch (error: any) {
        console.error('Error calculating contribution:', error)
        return c.json({ success: false, error: 'Failed to calculate contribution', details: error.message }, 500)
    }
}

// GET /api/time/contribution/:projectId/custom - Custom view
timeRoutes.get('/contribution/:projectId/custom', async (c) => {
    return handleContribution(c, 'custom')
})


// GET /api/time/project/:projectId - List time entries for a project (owner/admin view)
timeRoutes.get('/project/:projectId', async (c) => {
    try {
        const projectId = c.req.param('projectId')

        // Get project and workspace
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        if (!project) return c.json({ success: false, error: 'Project not found' }, 404)

        const [team] = await db.select().from(teams).where(eq(teams.id, project.teamId)).limit(1)
        if (!team) return c.json({ success: false, error: 'Team not found' }, 404)

        // Get tasks in project
        const projectTasks = await db.select({
            id: tasks.id,
            title: tasks.title,
        }).from(tasks).where(eq(tasks.projectId, projectId))
        const taskIds = projectTasks.map(t => t.id)

        const taskMap = Object.fromEntries(projectTasks.map(t => [t.id, t]))

        const membersData = await db.select({
            userId: projectMembers.userId,
            wsRole: workspaceMembers.role,
            isAnyTeamLead: sql<boolean>`EXISTS (
                SELECT 1 FROM team_members tm 
                JOIN teams t ON tm.team_id = t.id 
                WHERE tm.user_id = ${projectMembers.userId} 
                AND tm.team_level = 'team_lead' 
                AND t.workspace_id = ${team.workspaceId}
            )`
        }).from(projectMembers)
            .leftJoin(workspaceMembers, and(eq(workspaceMembers.userId, projectMembers.userId), eq(workspaceMembers.workspaceId, team.workspaceId)))
            .where(eq(projectMembers.projectId, projectId))

        const memberRoleMap = Object.fromEntries(membersData.map(m => {
            const resolved = resolveProjectRole(m.wsRole || 'member', !!m.isAnyTeamLead)
            return [m.userId, resolved]
        }))

        // Get all time entries for these tasks + standalone meetings of the same workspace
        const entries = await db.select().from(timeEntries)
            .where(
                and(
                    or(
                        taskIds.length > 0 ? inArray(timeEntries.taskId, taskIds) : sql`false`,
                        and(
                            eq(timeEntries.workspaceId, team.workspaceId),
                            eq(timeEntries.entryType, 'meeting'),
                            sql`${timeEntries.taskId} IS NULL`
                        )
                    )
                )
            )
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

        const result = entries.map(e => {
            const effective = e.entryType === 'meeting' ? e.durationMinutes * 0.5 : e.durationMinutes
            const currentResolvedRole = memberRoleMap[e.userId] || e.projectRole || 'participant'
            const roleFactor = ROLE_COEFFICIENTS[currentResolvedRole] ?? 1.0
            const diffFactor = DIFFICULTY_COEFFICIENTS[e.difficultyLevel] ?? 1.0
            const points = Math.round(((effective / 60) * roleFactor * diffFactor + (e.bonusPoints || 0)) * 100) / 100

            return {
                ...e,
                durationMinutes: effective,
                rawDurationMinutes: e.durationMinutes,
                points,
                projectRole: currentResolvedRole, // Use current role
                taskTitle: (e.taskId ? taskMap[e.taskId]?.title : 'Meetings & Calendar Events') || 'General',
                subtaskTitle: e.subtaskId ? subtaskMap[e.subtaskId]?.title || null : null,
                userName: userMap[e.userId]?.name || 'Unknown',
                userImage: userMap[e.userId]?.image || null,
            }
        })

        return c.json({ success: true, data: result })
    } catch (error: any) {
        console.error('Error fetching project time entries:', error)
        return c.json({ success: false, error: 'Failed to fetch project time entries', details: error.message }, 500)
    }
})

// POST /api/time - Create time entry (requires timeTracking.create permission)
timeRoutes.post('/', zValidator('json', createTimeEntrySchema), async (c) => {
    try {
        const currentUser = c.get('user')
        const body = c.req.valid('json')
        const targetUserId = body.userId || currentUser.id

        // Resolve context for the CURRENT user (to check permissions)
        let currentUserWsRole: string | null = null
        let currentUserTeamLevel: string | null = null
        let wsId: string | null = null

        if (body.workspaceSlug) {
            const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, body.workspaceSlug)).limit(1)
            if (workspace) {
                wsId = workspace.id
                const [wsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                    .where(and(eq(workspaceMembers.userId, currentUser.id), eq(workspaceMembers.workspaceId, wsId))).limit(1)
                currentUserWsRole = wsMember?.role || null
            }
        }

        if (body.taskId && body.taskId !== 'standalone-meetings') {
            const teamId = await getTeamIdFromTask(body.taskId)
            if (teamId) {
                currentUserTeamLevel = await getUserTeamLevel(currentUser.id, teamId)
                if (!currentUserWsRole) {
                    currentUserWsRole = await getWorkspaceRoleFromTask(currentUser.id, body.taskId)
                }
            }
        }

        if (!currentUserWsRole && !currentUserTeamLevel) {
            return c.json({ success: false, error: 'Unauthorized context' }, 403)
        }

        // Basic permission check for current user
        if (!canCreateTimeEntries(currentUserWsRole as any, currentUserTeamLevel as any)) {
            return c.json({ success: false, error: 'Unauthorized' }, 403)
        }

        // If adding for someone else, need manage permission
        if (targetUserId !== currentUser.id) {
            if (!canManageTimeEntries(currentUserWsRole as any, currentUserTeamLevel as any)) {
                return c.json({ success: false, error: 'Unauthorized to create entries for others' }, 403)
            }
        }

        // NOW: Resolve role for the TARGET user (the entry owner)
        let targetWsRole: string | null = null
        let targetAnyTeamLead = false

        if (wsId) {
            const [targetWsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                .where(and(eq(workspaceMembers.userId, targetUserId), eq(workspaceMembers.workspaceId, wsId))).limit(1)
            targetWsRole = targetWsMember?.role || null
            targetAnyTeamLead = await isUserAnyTeamLead(targetUserId, wsId)
        }

        const newEntry = {
            taskId: (body.taskId === 'standalone-meetings' || !body.taskId) ? null : body.taskId,
            subtaskId: body.subtaskId || null,
            userId: targetUserId,
            workspaceId: wsId,
            description: body.description || null,
            durationMinutes: body.durationMinutes,
            startedAt: new Date(body.startedAt),
            endedAt: body.endedAt ? new Date(body.endedAt) : null,
            entryType: body.entryType || 'task',
            projectRole: resolveProjectRole(targetWsRole as any, targetAnyTeamLead),
            approvalStatus: 'pending'
        }
        const [created] = await db.insert(timeEntries).values(newEntry).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error: any) {
        console.error('Error creating time entry:', error)
        return c.json({ success: false, error: 'Failed to create time entry' }, 500)
    }
})

// POST /api/time/start - Start timer
timeRoutes.post('/start', zValidator('json', startTimeEntrySchema), async (c) => {
    try {
        const currentUser = c.get('user')
        const body = c.req.valid('json')
        const targetUserId = body.userId || currentUser.id

        // Resolve context for CURRENT user
        let currentUserWsRole: string | null = null
        let currentUserTeamLevel: string | null = null
        let wsId: string | null = null

        if (body.workspaceSlug) {
            const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, body.workspaceSlug)).limit(1)
            if (workspace) {
                wsId = workspace.id
                const [wsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                    .where(and(eq(workspaceMembers.userId, currentUser.id), eq(workspaceMembers.workspaceId, wsId))).limit(1)
                currentUserWsRole = wsMember?.role || null
            }
        }

        if (body.taskId && body.taskId !== 'standalone-meetings') {
            const teamId = await getTeamIdFromTask(body.taskId)
            if (teamId) {
                currentUserTeamLevel = await getUserTeamLevel(currentUser.id, teamId)
                if (!currentUserWsRole) {
                    currentUserWsRole = await getWorkspaceRoleFromTask(currentUser.id, body.taskId)
                }
            }
        }

        if (!canCreateTimeEntries(currentUserWsRole as any, currentUserTeamLevel as any)) {
            return c.json({ success: false, error: 'Unauthorized' }, 403)
        }

        // TARGET user context
        let targetWsRole: string | null = null
        let targetAnyTeamLead = false
        if (wsId) {
            const [targetWsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                .where(and(eq(workspaceMembers.userId, targetUserId), eq(workspaceMembers.workspaceId, wsId))).limit(1)
            targetWsRole = targetWsMember?.role || null
            targetAnyTeamLead = await isUserAnyTeamLead(targetUserId, wsId)
        }

        const newEntry = {
            taskId: (body.taskId === 'standalone-meetings' || !body.taskId) ? null : body.taskId,
            subtaskId: body.subtaskId || null,
            userId: targetUserId,
            workspaceId: wsId,
            description: body.description || null,
            durationMinutes: 0,
            startedAt: new Date(),
            entryType: body.entryType || 'task',
            projectRole: resolveProjectRole(targetWsRole as any, targetAnyTeamLead),
            approvalStatus: 'pending'
        }
        const [created] = await db.insert(timeEntries).values(newEntry).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error: any) {
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

        // Get context
        let teamId: string | null = null
        let wsRole: string | null = null
        if (entry.taskId) {
            teamId = await getTeamIdFromTask(entry.taskId)
            wsRole = await getWorkspaceRoleFromTask(userId, entry.taskId)
        } else if (entry.workspaceId) {
            const [wsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, entry.workspaceId))).limit(1)
            wsRole = wsMember?.role || null
        }

        // Get permissions
        const teamLevel = teamId ? await getUserTeamLevel(userId, teamId) : null

        // Allow if: is owner OR has manage permission
        if (!isOwner && !canManageTimeEntries(wsRole as any, teamLevel as any)) {
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

        // Get context
        let teamId: string | null = null
        let wsRole: string | null = null
        if (entry.taskId) {
            teamId = await getTeamIdFromTask(entry.taskId)
            wsRole = await getWorkspaceRoleFromTask(userId, entry.taskId)
        } else if (entry.workspaceId) {
            const [wsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, entry.workspaceId))).limit(1)
            wsRole = wsMember?.role || null
        }

        // Get permissions
        const teamLevel = teamId ? await getUserTeamLevel(userId, teamId) : null

        // Allow if: is owner OR has manage permission
        if (!isOwner && !canManageTimeEntries(wsRole as any, teamLevel as any)) {
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

// GET /api/time/pending - List pending time entries (HR Manager+ view)
timeRoutes.get('/pending', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const workspaceSlug = c.req.query('workspaceSlug')

        if (!workspaceSlug) {
            return c.json({ success: false, error: 'workspaceSlug is required' }, 400)
        }

        const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug)).limit(1)
        if (!workspace) return c.json({ success: false, error: 'Workspace not found' }, 404)

        const [wsMember] = await db.select().from(workspaceMembers)
            .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspace.id))).limit(1)

        if (!wsMember || !['owner', 'admin', 'hr_manager'].includes(wsMember.role)) {
            return c.json({ success: false, error: 'Unauthorized. HR Manager or higher required.' }, 403)
        }

        const workspaceTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.workspaceId, workspace.id))
        const teamIds = workspaceTeams.map(t => t.id)
        if (teamIds.length === 0) return c.json({ success: true, data: [] })

        const teamProjects = await db.select({ id: projects.id }).from(projects).where(inArray(projects.teamId, teamIds))
        const projectIds = teamProjects.map(p => p.id)
        if (projectIds.length === 0) return c.json({ success: true, data: [] })

        const projectTasks = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(inArray(tasks.projectId, projectIds))
        const taskIds = projectTasks.map(t => t.id)
        if (taskIds.length === 0) return c.json({ success: true, data: [] })
        const taskMap = Object.fromEntries(projectTasks.map(t => [t.id, t]))

        const pendingEntries = await db.select().from(timeEntries)
            .where(and(
                or(
                    taskIds.length > 0 ? inArray(timeEntries.taskId, taskIds) : sql`false`,
                    eq(timeEntries.workspaceId, workspace.id)
                ),
                eq(timeEntries.approvalStatus, 'pending')
            ))
            .orderBy(desc(timeEntries.startedAt))

        const entryUserIds = [...new Set(pendingEntries.map(e => e.userId))]
        const userDetails = entryUserIds.length > 0
            ? await db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(inArray(users.id, entryUserIds))
            : []
        const userMap = Object.fromEntries(userDetails.map(u => [u.id, u]))

        const result = pendingEntries.map(e => ({
            ...e,
            taskTitle: (e.taskId ? taskMap[e.taskId]?.title : 'Meetings & Calendar Events') || 'General',
            userName: userMap[e.userId]?.name || 'Unknown',
            userImage: userMap[e.userId]?.image || null,
        }))

        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching pending entries:', error)
        return c.json({ success: false, error: 'Failed to fetch pending entries' }, 500)
    }
})

// PATCH /api/time/:id/approve - Approve time entry
timeRoutes.patch('/:id/approve', zValidator('json', approveTimeEntrySchema), async (c) => {
    try {
        const id = c.req.param('id')
        const user = c.get('user')
        const body = c.req.valid('json')

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        let wsRole: string | null = null
        if (entry.taskId) {
            wsRole = await getWorkspaceRoleFromTask(user.id, entry.taskId)
        } else if (entry.workspaceId) {
            const [wsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                .where(and(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.workspaceId, entry.workspaceId))).limit(1)
            wsRole = wsMember?.role || null
        }

        if (!['owner', 'admin', 'hr_manager', 'project_manager'].includes(wsRole || '')) {
            return c.json({ success: false, error: 'Unauthorized to approve entries' }, 403)
        }

        const [updated] = await db.update(timeEntries)
            .set({
                approvalStatus: 'approved',
                approvedBy: user.id,
                approvedAt: new Date(),
                difficultyLevel: body.difficultyLevel,
                bonusPoints: body.bonusPoints || null,
                rejectionReason: null
            })
            .where(eq(timeEntries.id, id))
            .returning()

        // Notify user about approval
        if (updated && updated.userId) {
            const [workspace] = await db.select({ slug: workspaces.slug }).from(workspaces)
                .where(eq(workspaces.id, updated.workspaceId!)).limit(1)

            await NotificationService.push(updated.userId, {
                type: 'time_entry_approved',
                title: 'notifications.titles.time_approved',
                message: `Twój wpis czasu (${updated.durationMinutes} min) został zaakceptowany przez [${user.name}]`,
                link: `/${workspace?.slug}/time-tracker`,
                actor: { name: user.name, image: user.image || undefined },
                metadata: { entryId: updated.id }
            })
        }

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error approving entry:', error)
        return c.json({ success: false, error: 'Failed to approve entry' }, 500)
    }
})

// PATCH /api/time/:id/reject - Reject time entry
timeRoutes.patch('/:id/reject', zValidator('json', rejectTimeEntrySchema), async (c) => {
    try {
        const id = c.req.param('id')
        const user = c.get('user')
        const body = c.req.valid('json')

        const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1)
        if (!entry) return c.json({ success: false, error: 'Time entry not found' }, 404)

        let wsRole: string | null = null
        if (entry.taskId) {
            wsRole = await getWorkspaceRoleFromTask(user.id, entry.taskId)
        } else if (entry.workspaceId) {
            const [wsMember] = await db.select({ role: workspaceMembers.role }).from(workspaceMembers)
                .where(and(eq(workspaceMembers.userId, user.id), eq(workspaceMembers.workspaceId, entry.workspaceId))).limit(1)
            wsRole = wsMember?.role || null
        }

        if (!['owner', 'admin', 'hr_manager', 'project_manager'].includes(wsRole || '')) {
            return c.json({ success: false, error: 'Unauthorized to reject entries' }, 403)
        }

        const [updated] = await db.update(timeEntries)
            .set({
                approvalStatus: 'rejected',
                rejectionReason: body.rejectionReason,
                approvedBy: null,
                approvedAt: null
            })
            .where(eq(timeEntries.id, id))
            .returning()

        // Notify user about rejection
        if (updated && updated.userId) {
            const [workspace] = await db.select({ slug: workspaces.slug }).from(workspaces)
                .where(eq(workspaces.id, updated.workspaceId!)).limit(1)

            await NotificationService.push(updated.userId, {
                type: 'time_entry_rejected',
                title: 'notifications.titles.time_rejected',
                message: `Twój wpis czasu (${updated.durationMinutes} min) został odrzucony przez [${user.name}]. Powód: ${body.rejectionReason}`,
                link: `/${workspace?.slug}/time-tracker`,
                actor: { name: user.name, image: user.image || undefined },
                metadata: { entryId: updated.id, reason: body.rejectionReason }
            })
        }

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error rejecting entry:', error)
        return c.json({ success: false, error: 'Failed to reject entry' }, 500)
    }
})
