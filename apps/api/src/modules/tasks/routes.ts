
import { Hono } from 'hono'
import { db } from '../../db'
import {
    tasks, subtasks, taskActivityLog, taskComments,
    type NewTask, type NewSubtask, type NewTaskComment
} from '../../db/schema/tasks'
import { auth, type Auth } from '../../lib/auth'
import { projects, projectMembers } from '../../db/schema/projects'
import { eq, desc, arrayContains, inArray } from 'drizzle-orm'
import {
    canCreateTasks,
    canUpdateTasks,
    canDeleteTasks,
    canAssignTasks,
    canCompleteTasks,
    type TeamLevel,
    type WorkspaceRole
} from '../../lib/permissions'
import { triggerWebhook } from '../webhooks/trigger'
import { teams } from '../../db/schema/teams'
import { syncTaskToCalendar, deleteTaskCalendarEvent } from '../calendar/sync'

type Env = {
    Variables: {
        user: Auth['$Infer']['Session']['user']
        session: Auth['$Infer']['Session']['session']
    }
}

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString, zSanitizedStringOptional } from '../../lib/zod-extensions'

const subtaskSchema = z.object({
    title: zSanitizedString(),
    description: zSanitizedStringOptional(),
    assigneeId: z.string().optional().nullable(),
    dependsOn: z.array(z.string()).optional()
})

const createTaskSchema = z.object({
    title: zSanitizedString(),
    description: zSanitizedStringOptional(),
    status: zSanitizedStringOptional(),
    priority: zSanitizedStringOptional(),
    // assigneeId removed
    dueDate: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    meetingLink: zSanitizedStringOptional(),
    estimatedHours: z.coerce.number().optional().nullable(),
    links: z.array(z.any()).optional(),
    type: z.enum(['task', 'meeting']).optional(),
    projectId: z.string(),
    subtasks: z.array(subtaskSchema).optional(),
    labels: z.array(z.string().or(z.object({ id: z.string() }))).optional().nullable(),
    reporterId: z.string().optional(), // Should be set from session, but schema might allow it if not strictly filtered
    assignees: z.array(z.string()).optional(),
    dependsOn: z.array(z.string()).optional(),
    isCompleted: z.boolean().optional()
})

const updateTaskSchema = createTaskSchema.partial().extend({
    progress: z.number().optional(),
    isArchived: z.boolean().optional(),
})

const tasksQuerySchema = z.object({
    projectId: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assigneeId: z.string().optional(), // Keep query param for filtering, but implementation will check array
    isArchived: z.string().optional(),
    type: z.enum(['task', 'meeting']).optional(),
    workspaceSlug: zSanitizedString().optional(),
})

export const tasksRoutes = new Hono<Env>()

// Helper: Get user's workspace role (blocks suspended members)
async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const member = await db.query.workspaceMembers.findFirst({
        where: (wm, { eq, and }) => and(
            eq(wm.userId, userId),
            eq(wm.workspaceId, workspaceId),
            eq(wm.status, 'active')
        )
    })
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
    try {
        const teamId = await getTeamIdFromProject(projectId)
        if (!teamId) return null

        const [team] = await db.select({ workspaceId: teams.workspaceId }).from(teams).where(eq(teams.id, teamId)).limit(1)
        return team?.workspaceId || null
    } catch (e) {
        return null
    }
}

// =============================================================================
// TASKS CRUD (3.11)
// =============================================================================

// GET /api/tasks - List tasks (filtered by project membership)
tasksRoutes.get('/', zValidator('query', tasksQuerySchema), async (c) => {
    try {
        const user = c.get('user') as any
        const userId = user.id

        const { projectId, status, priority, assigneeId, isArchived, type, workspaceSlug } = c.req.valid('query')

        let userWorkspaceRole: WorkspaceRole | null = null
        let projectIdsUserCanAccess: string[] | null = null

        if (workspaceSlug) {
            const ws = await db.query.workspaces.findFirst({
                where: (ws, { eq }) => eq(ws.slug, workspaceSlug)
            })
            if (ws) {
                // Check workspace membership status (blocks suspended users)
                userWorkspaceRole = await getUserWorkspaceRole(userId, ws.id)

                if (!userWorkspaceRole) {
                    return c.json({ error: 'Forbidden: No active workspace access' }, 403)
                }

                const isProjectManagerOrHigher = userWorkspaceRole && ['owner', 'admin', 'project_manager'].includes(userWorkspaceRole)

                // Get projects for this workspace
                const workspaceTeams = await db.query.teams.findMany({
                    where: (t, { eq }) => eq(t.workspaceId, ws.id)
                })
                const teamIds = workspaceTeams.map(t => t.id)

                if (teamIds.length > 0) {
                    const workspaceProjects = await db.query.projects.findMany({
                        where: (p, { inArray, and, exists }) => {
                            const wheres: any[] = [inArray(p.teamId, teamIds)]

                            if (!isProjectManagerOrHigher) {
                                wheres.push(exists(
                                    db.select()
                                        .from(projectMembers)
                                        .where(and(
                                            eq(projectMembers.projectId, p.id),
                                            eq(projectMembers.userId, userId)
                                        ))
                                ))
                            }
                            return and(...wheres)
                        }
                    })
                    projectIdsUserCanAccess = workspaceProjects.map(p => p.id)
                }
            }
        }

        let effectiveProjectId = projectId
        if (projectIdsUserCanAccess !== null) {
            if (projectId) {
                // If specific project requested, check if user has access to it
                if (projectIdsUserCanAccess.includes(projectId as string)) {
                    effectiveProjectId = projectId
                } else {
                    return c.json({ success: true, data: [] })
                }
            } else {
                // Show all accessible projects
                if (projectIdsUserCanAccess.length > 0) {
                    effectiveProjectId = projectIdsUserCanAccess as any
                } else {
                    return c.json({ success: true, data: [] })
                }
            }
        }

        // Use findMany to get relations and counts
        const result = await db.query.tasks.findMany({
            where: (t, { eq, and, inArray }) => {
                const wheres: any[] = []
                if (Array.isArray(effectiveProjectId)) {
                    wheres.push(inArray(t.projectId, effectiveProjectId))
                } else if (effectiveProjectId) {
                    wheres.push(eq(t.projectId, effectiveProjectId))
                }
                if (status) wheres.push(eq(t.status, status as any))
                if (priority) wheres.push(eq(t.priority, priority as any))

                // Use arrayContains for assignees array
                if (assigneeId) wheres.push(arrayContains(t.assignees, [assigneeId]))

                if (type) wheres.push(eq(t.type, type as any))
                if (isArchived !== undefined) wheres.push(eq(t.isArchived, isArchived === 'true'))

                return wheres.length > 0 ? and(...wheres) : undefined
            },
            with: {
                // assignee removed
                subtasks: true,
                comments: true,
            },
            orderBy: (t, { desc }) => [desc(t.createdAt)]
        })

        // Collect all assignee IDs to fetch details
        const allAssigneeIds = new Set<string>()
        result.forEach(t => {
            if (t.assignees) {
                t.assignees.forEach(id => allAssigneeIds.add(id))
            }
        })

        const usersMap = new Map<string, any>()
        if (allAssigneeIds.size > 0) {
            const usersList = await db.query.users.findMany({
                where: (u, { inArray }) => inArray(u.id, Array.from(allAssigneeIds)),
                columns: { id: true, name: true, image: true }
            })
            usersList.forEach(u => usersMap.set(u.id, u))
        }

        // Map data to include counts for frontend
        const dataWithCounts = await Promise.all(result.map(async task => {
            // Count files attached to this task
            const fileCount = await db.query.files.findMany({
                where: (f, { eq }) => eq(f.taskId, task.id),
                columns: { id: true }
            })

            const assignees = (task.assignees || []).map(id => usersMap.get(id)).filter(Boolean)

            return {
                ...task,
                subtasksCount: task.subtasks?.length || 0,
                subtasksCompleted: task.subtasks?.filter((c: any) => c.isCompleted || c.status === 'done').length || 0,
                commentsCount: task.comments?.length || 0,
                attachmentCount: fileCount.length,
                assignee: assignees.length > 0 ? assignees[0] : null, // Legacy support
                assignees: task.assignees || [], // Return IDs for compatibility if needed
                assigneeDetails: assignees // New rich info field
            }
        }))

        return c.json({ success: true, data: dataWithCounts })
    } catch (error) {
        console.error('Error fetching tasks:', error)
        return c.json({ success: false, error: 'Failed to fetch tasks' }, 500)
    }
})

// GET /api/tasks/:id - Get single task with subitems, labels, assignee, and activity
tasksRoutes.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')

        // Use query with relations
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            // assignee removed from with
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // const session = await auth.api.getSession({ headers: c.req.raw.headers })
        // if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        // const userId = session.user.id
        const user = c.get('user') as any
        const userId = user.id

        // Get teamId from project
        const teamId = await getTeamIdFromProject(task.projectId)

        let workspaceId: string | null = null
        if (teamId) {
            const team = await db.query.teams.findFirst({
                where: (t, { eq }) => eq(t.id, teamId)
            })
            workspaceId = team?.workspaceId || null
        }

        let workspaceRole: WorkspaceRole | null = null
        if (workspaceId) {
            const member = await db.query.workspaceMembers.findFirst({
                where: (wm, { eq, and }) => and(eq(wm.userId, userId), eq(wm.workspaceId, workspaceId))
            })
            workspaceRole = (member?.role as WorkspaceRole) || null
        }

        const isProjectManagerOrHigher = workspaceRole && ['owner', 'admin', 'project_manager'].includes(workspaceRole)

        if (!isProjectManagerOrHigher) {
            const isMember = await db.query.projectMembers.findFirst({
                where: (pm, { eq, and }) => and(eq(pm.projectId, task.projectId), eq(pm.userId, userId))
            })
            if (!isMember) {
                return c.json({ success: false, error: 'Access denied' }, 403)
            }
        }

        // Fetch subitems (from dedicated subtasks table)
        const taskSubitems = await db.query.subtasks.findMany({
            where: (s, { eq }) => eq(s.taskId, id),
            with: {
                assignee: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (s, { asc }) => [asc(s.position)]
        })

        // Labels are now stored directly on task.labels as text[]

        // Fetch activity log from database
        const activities = await db.query.taskActivityLog.findMany({
            where: (a, { eq }) => eq(a.taskId, id),
            with: {
                user: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (a, { desc }) => [desc(a.createdAt)],
            limit: 20
        })

        // Map activities to frontend format
        const mappedActivities = activities.map(a => ({
            id: a.id,
            user: { id: a.user?.id || '', name: a.user?.name || 'Unknown', avatar: a.user?.image },
            type: a.activityType,
            details: a.newValue || '',
            oldValue: a.oldValue,
            timestamp: formatTimeAgo(a.createdAt)
        }))

        // Build assignees array for frontend
        const assigneesIds = task.assignees || []
        let assignees: any[] = []
        if (assigneesIds.length > 0) {
            assignees = await db.query.users.findMany({
                where: (u, { inArray }) => inArray(u.id, assigneesIds),
                columns: { id: true, name: true, image: true }
            })
        }

        // Fetch comments from database
        const comments = await db.query.taskComments.findMany({
            where: (c, { eq }) => eq(c.taskId, id),
            with: {
                user: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (c, { desc }) => [desc(c.createdAt)]
        })

        // Map comments to frontend format
        const mappedComments = comments.map(c => ({
            id: c.id,
            author: { id: c.user?.id || '', name: c.user?.name || 'Unknown', avatar: c.user?.image },
            content: c.content,
            likes: JSON.parse(c.likes || '[]'),
            parentId: c.parentId,
            replies: [], // Will be built into tree on frontend
            createdAt: formatTimeAgo(c.createdAt)
        }))

        // Fetch project stages for the task's project
        console.log(`🔍 Fetching stages for task ${id}(project ${task.projectId})`)
        const stages = await db.query.projectStages.findMany({
            where: (s, { eq }) => eq(s.projectId, task.projectId),
            orderBy: (s, { asc }) => [asc(s.position)]
        })
        console.log(`✅ Found ${stages.length} stages for project ${task.projectId}`)

        return c.json({
            success: true,
            data: {
                ...task,
                subtasks: taskSubitems,
                labels: task.labels || [], // Labels are now stored directly on task as text[]
                assignees: task.assignees || [],
                assigneeDetails: assignees,
                assignee: assignees.length > 0 ? assignees[0] : null, // Legacy
                activities: mappedActivities,
                comments: mappedComments,
                stages, // Return project stages for status display
                projectStages: stages, // Duplicate to test if 'stages' key is being overwritten/stripped
                _debug_ts: new Date().toISOString() // Force new response signature
            }
        })
    } catch (error) {
        console.error('Error fetching task:', error)
        return c.json({ success: false, error: 'Failed to fetch task' }, 500)
    }
})

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'przed chwilą'
    if (minutes < 60) return `${minutes} min temu`
    if (hours < 24) return `${hours} godz.temu`
    if (days < 7) return `${days} dni temu`
    return date.toLocaleDateString('pl-PL')
}

// POST /api/tasks - Create task (requires tasks.create permission)
tasksRoutes.post('/', zValidator('json', createTaskSchema), async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const body = c.req.valid('json')

        console.log('📝 Creating task:', { userId, title: body.title, projectId: body.projectId })

        // Get teamId from project
        const teamId = await getTeamIdFromProject(body.projectId)
        if (!teamId) {
            console.error('❌ Project not found:', body.projectId)
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        let workspaceRole: WorkspaceRole | null = null
        const projectWorkspaceId = await getWorkspaceIdFromProject(body.projectId)
        if (projectWorkspaceId) {
            workspaceRole = await getUserWorkspaceRole(userId, projectWorkspaceId)
        }

        const teamLevel = await getUserTeamLevel(userId, teamId)
        console.log('👤 User permissions:', { workspaceRole, teamLevel })

        if (!canCreateTasks(workspaceRole, teamLevel) && userId !== 'temp-user-id') {
            console.warn('🚫 Unauthorized to create tasks:', { userId, workspaceRole, teamLevel })
            if (!canCreateTasks(null, teamLevel)) {
                console.warn('🚫 Unauthorized to create tasks:', { userId, teamLevel })
                return c.json({ success: false, error: 'Unauthorized to create tasks' }, 403)
            }
        }

        const assignees = body.assignees || []

        // For reporterId, if temp-user-id, try to find the first member of the team to use as reporter
        let reporterId = body.reporterId || userId
        if (reporterId === '') {
            const firstMember = await db.query.teamMembers.findFirst({
                where: (tm, { eq }) => eq(tm.teamId, teamId)
            })
            if (firstMember) {
                reporterId = firstMember.userId
                console.log('ℹ️ Using fallback reporterId:', reporterId)
            }
        }

        const newTask: NewTask = {
            projectId: body.projectId,
            type: body.type || 'task',
            title: body.title,
            description: body.description || null,
            status: body.type === 'meeting' ? 'scheduled' : (body.status || 'todo'),
            priority: body.priority || 'medium',
            // assigneeId removed
            assignees: assignees,
            reporterId,
            dependsOn: body.dependsOn || [],
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            startDate: body.startDate ? new Date(body.startDate) : null,
            meetingLink: body.meetingLink || null,
            estimatedHours: body.estimatedHours || null,
            links: body.links || [],
        }

        const [created] = await db.insert(tasks).values(newTask).returning()
        console.log('✅ Task created:', created.id)

        // Ensure assignees are members of the project
        if (assignees.length > 0) {
            for (const assigneeId of assignees) {
                const isMember = await db.query.projectMembers.findFirst({
                    where: (pm, { eq, and }) => and(eq(pm.projectId, created.projectId), eq(pm.userId, assigneeId))
                })

                if (!isMember) {
                    console.log('➕ Adding assignee to project members:', assigneeId)
                    await db.insert(projectMembers).values({
                        projectId: created.projectId,
                        userId: assigneeId,
                        role: 'member'
                    })
                }
            }
        }

        // Handle Subtasks (using the dedicated subtasks table)
        if (body.subtasks && Array.isArray(body.subtasks)) {
            console.log('🌿 Creating subtasks:', body.subtasks.length)
            for (const sub of body.subtasks) {
                await db.insert(subtasks).values({
                    taskId: created.id,
                    title: sub.title,
                    description: sub.description || null,
                    isCompleted: false,
                    assigneeId: sub.assigneeId || null,
                    dependsOn: sub.dependsOn || []
                })
            }
        }

        // Handle Labels (if provided) - update the task's labels array directly
        if (body.labels && Array.isArray(body.labels)) {
            const labelIds = body.labels.map((label: string | { id: string }) =>
                typeof label === 'string' ? label : label.id
            ).filter(Boolean)

            if (labelIds.length > 0) {
                await db.update(tasks).set({ labels: labelIds }).where(eq(tasks.id, created.id))
            }
        }

        await db.insert(taskActivityLog).values({ taskId: created.id, userId: reporterId, activityType: 'created', newValue: created.title })

        // 📅 Sync to Calendar
        if (created.dueDate) {
            await syncTaskToCalendar(created, userId)
        }

        // TRIGGER WEBHOOK
        const workspaceId = await getWorkspaceIdFromProject(created.projectId)
        if (workspaceId) {
            // Fetch status name and priorities
            const [statusStage, workspace] = await Promise.all([
                created.status ? db.query.projectStages.findFirst({
                    where: (s, { eq }) => eq(s.id, created.status!),
                    columns: { name: true }
                }) : null,
                db.query.workspaces.findFirst({
                    where: (w, { eq }) => eq(w.id, workspaceId),
                    columns: { priorities: true }
                })
            ])

            const priorityObj = workspace?.priorities?.find((p: any) => p.id === created.priority)
            const priorityName = priorityObj?.name || created.priority
            const priorityColor = priorityObj?.color

            triggerWebhook('task.created', {
                ...created,
                statusName: statusStage?.name || created.status,
                priorityName,
                priorityColor
            }, workspaceId)
        }

        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('💥 Error creating task:', error)
        return c.json({ success: false, error: 'Failed to create task', details: error instanceof Error ? error.message : String(error) }, 500)
    }
})

// PATCH /api/tasks/:id - Update task (requires tasks.update OR is assignee)
tasksRoutes.patch('/:id', zValidator('json', updateTaskSchema), async (c) => {
    try {
        const id = c.req.param('id')
        // const session = await auth.api.getSession({ headers: c.req.raw.headers })
        // if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        // const userId = session.user.id
        const user = c.get('user') as any
        const userId = user.id

        const body = c.req.valid('json')

        // Get task
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(task.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        let workspaceRole: WorkspaceRole | null = null
        const workspaceId = await getWorkspaceIdFromProject(task.projectId)
        if (workspaceId) {
            workspaceRole = await getUserWorkspaceRole(userId, workspaceId)
        }

        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: has update permission OR is assignee
        const isAssignee = task.assignees?.includes(userId)
        const hasUpdatePermission = canUpdateTasks(workspaceRole, teamLevel)

        let canProceed = hasUpdatePermission || isAssignee;

        if (!canProceed) {
            // Check if they are ONLY trying to complete/uncomplete the task
            // and they have 'complete' permission
            const changedKeys = Object.keys(body).filter(k => k !== 'id');
            const isOnlyUpdatingCompletionState = changedKeys.length === 1 && changedKeys[0] === 'isCompleted';
            const hasCompletePermission = canCompleteTasks(workspaceRole, teamLevel);

            if (isOnlyUpdatingCompletionState && hasCompletePermission) {
                canProceed = true;
            }
        }

        if (!canProceed) {
            return c.json({ success: false, error: 'Unauthorized to update task' }, 403)
        }

        // =====================================================================
        // TASK DEPENDENCIES BLOCKING LOGIC
        // =====================================================================

        let assigneesChanged = false;
        if (body.assignees !== undefined) {
            const currentAssignees = task.assignees || [];
            if (body.assignees.length !== currentAssignees.length) {
                assigneesChanged = true;
            } else {
                for (const a of body.assignees) {
                    if (!currentAssignees.includes(a)) {
                        assigneesChanged = true;
                        break;
                    }
                }
            }
        }

        const statusChanged = body.status !== undefined && body.status !== task.status;
        const completingTask = body.isCompleted !== undefined && body.isCompleted !== task.isCompleted && body.isCompleted === true;

        const isTryingToChangeBlockedFields = assigneesChanged || statusChanged || completingTask;

        if (isTryingToChangeBlockedFields && task.dependsOn && task.dependsOn.length > 0) {
            const dependentTasks = await db
                .select({ id: tasks.id, isCompleted: tasks.isCompleted })
                .from(tasks)
                .where(inArray(tasks.id, task.dependsOn));

            const hasUnmetDependencies = dependentTasks.some(dep => !dep.isCompleted);

            if (hasUnmetDependencies) {
                return c.json({
                    success: false,
                    error: 'Cannot update blocked task. Unmet dependencies must be completed first.'
                }, 403)
            }
        }
        // =====================================================================

        // Check if trying to assign - requires assign permission
        if (body.assignees !== undefined) {
            // ALlow self-assignment if the user is assigning to themselves or adding themselves
            // For simplicity, if modifying assignees, check permission unless just adding/removing self?
            // User requested "Assign to me" functionality.

            // If user is just adding themselves or removing themselves, maybe allow?
            // But generalized: check permission.
            // Re-implement self-assignment check properly for arrays if needed.
            // For now, stick to permission check.
            if (!canAssignTasks(workspaceRole, teamLevel)) {
                // Check if it's a self-assignment (adding self)
                const newAssignees = body.assignees || []
                const oldAssignees = task.assignees || []

                // If the only difference is adding/removing self, allow it?
                // Or broadly, if user is in newAssignees...

                // Let's rely on standard permissions for now or simple "assign to me" check from before
                // The previous fix allowed if body.assigneeId === userId.
                // Here body.assignees is array.

                const isSelfAssign = newAssignees.includes(userId) && newAssignees.length === oldAssignees.length + 1 && oldAssignees.every(id => newAssignees.includes(id))
                // Or just simpler: if user is not an admin, they can only assign themselves?

                if (!isSelfAssign) {
                    // Strict check
                    return c.json({ success: false, error: 'Unauthorized to assign tasks' }, 403)
                }
            }

            // Ensure new assignees are project members
            const newAssignees = body.assignees || []
            for (const assigneeId of newAssignees) {
                const isMember = await db.query.projectMembers.findFirst({
                    where: (pm, { eq, and }) => and(eq(pm.projectId, task.projectId), eq(pm.userId, assigneeId))
                })
                if (!isMember) {
                    await db.insert(projectMembers).values({
                        projectId: task.projectId,
                        userId: assigneeId,
                        role: 'member'
                    })
                }
            }
        }

        const updateData: any = { updatedAt: new Date() }
        if (body.title !== undefined) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.status !== undefined) {
            updateData.status = body.status
            // Automatic completion toggle
            if (body.isCompleted === undefined) {
                updateData.isCompleted = body.status === 'done'
            }
        }
        if (body.isCompleted !== undefined) updateData.isCompleted = body.isCompleted
        if (body.priority !== undefined) updateData.priority = body.priority
        if (body.assignees !== undefined) updateData.assignees = body.assignees
        if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
        if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
        if (body.meetingLink !== undefined) updateData.meetingLink = body.meetingLink
        if (body.links !== undefined) updateData.links = body.links
        if (body.type !== undefined) updateData.type = body.type
        if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours
        if (body.progress !== undefined) updateData.progress = body.progress
        if (body.isArchived !== undefined) updateData.isArchived = body.isArchived
        if (body.labels !== undefined) updateData.labels = body.labels
        if (body.dependsOn !== undefined) updateData.dependsOn = body.dependsOn

        const [updated] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Task not found' }, 404)

        // 📅 Sync to Calendar
        await syncTaskToCalendar(updated, userId)

        // TRIGGER WEBHOOKS
        if (workspaceId) {
            // Status Change - fetch stage names for display
            if (body.status !== undefined && body.status !== task.status) {
                // Lookup stage names
                const [oldStage, newStage] = await Promise.all([
                    task.status ? db.query.projectStages.findFirst({ where: (s, { eq }) => eq(s.id, task.status), columns: { name: true } }) : null,
                    updated.status ? db.query.projectStages.findFirst({ where: (s, { eq }) => eq(s.id, updated.status), columns: { name: true } }) : null
                ])

                triggerWebhook('task.status_changed', {
                    taskId: id,
                    oldStatus: oldStage?.name || task.status,
                    newStatus: newStage?.name || updated.status,
                    task: updated,
                    title: updated.title
                }, workspaceId)
            }

            // Assignees Change - fetch user names for display
            if (body.assignees !== undefined) {
                const oldAssignees = task.assignees || []
                const newAssignees = updated.assignees || []

                // Check if changed (naive check: different length or different items)
                const hasChanged = oldAssignees.length !== newAssignees.length || !oldAssignees.every(id => newAssignees.includes(id))

                if (hasChanged) {
                    // Fetch names for all involved users
                    const allUserIds = Array.from(new Set([...oldAssignees, ...newAssignees]))
                    let userMap = new Map<string, string>()

                    if (allUserIds.length > 0) {
                        const users = await db.query.users.findMany({
                            where: (u, { inArray }) => inArray(u.id, allUserIds),
                            columns: { id: true, name: true }
                        })
                        users.forEach(u => userMap.set(u.id, u.name || 'Unknown'))
                    }

                    const oldNames = oldAssignees.map(id => userMap.get(id) || 'Unknown').join(', ')
                    const newNames = newAssignees.map(id => userMap.get(id) || 'Unknown').join(', ')

                    triggerWebhook('task.assigned', {
                        taskId: id,
                        oldAssignees: oldNames || 'Unassigned',
                        newAssignees: newNames || 'Unassigned',
                        task: updated,
                        title: updated.title
                    }, workspaceId)
                }
            }

            // Due Date Change - use proper date comparison
            const oldDueMs = task.dueDate ? new Date(task.dueDate).getTime() : null
            const newDueMs = body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate).getTime() : null) : oldDueMs
            if (body.dueDate !== undefined && oldDueMs !== newDueMs) {
                triggerWebhook('task.due_date_changed', {
                    taskId: id,
                    oldDueDate: task.dueDate,
                    newDueDate: updated.dueDate,
                    task: updated,
                    title: updated.title
                }, workspaceId)
            }

            // Priority Change
            if (body.priority !== undefined && body.priority !== task.priority) {
                const workspace = await db.query.workspaces.findFirst({
                    where: (w, { eq }) => eq(w.id, workspaceId),
                    columns: { priorities: true }
                })
                const oldPriorityObj = workspace?.priorities?.find((p: any) => p.id === task.priority)
                const newPriorityObj = workspace?.priorities?.find((p: any) => p.id === updated.priority)

                const oldPriorityName = oldPriorityObj?.name || task.priority
                const newPriorityName = newPriorityObj?.name || updated.priority
                const oldPriorityColor = oldPriorityObj?.color
                const newPriorityColor = newPriorityObj?.color

                triggerWebhook('task.priority_changed', {
                    taskId: id,
                    oldPriority: task.priority,
                    newPriority: updated.priority,
                    oldPriorityName,
                    newPriorityName,
                    oldPriorityColor,
                    newPriorityColor,
                    task: updated,
                    title: updated.title
                }, workspaceId)
            }

            // Check for explicit "Task Updated" fields (Title, Description)
            // Only trigger task.updated if these specific fields changed
            // Check for explicit "Task Updated" fields (Title, Description)
            // Only trigger task.updated if these specific fields changed
            if ((body.title !== undefined && body.title !== task.title) ||
                (body.description !== undefined && body.description !== task.description)) {

                const updatedFields = []
                if (body.title !== undefined && body.title !== task.title) updatedFields.push('title')
                if (body.description !== undefined && body.description !== task.description) updatedFields.push('description')

                // Fetch status name for display
                const statusStage = updated.status ? await db.query.projectStages.findFirst({
                    where: (s, { eq }) => eq(s.id, updated.status!),
                    columns: { name: true }
                }) : null

                triggerWebhook('task.updated', {
                    taskId: id,
                    updatedFields,
                    task: updated,
                    title: updated.title,
                    statusName: statusStage?.name || updated.status
                }, workspaceId)
            }
        }

        if (body.assignees) {
            for (const assigneeId of body.assignees) {
                const isMember = await db.query.projectMembers.findFirst({
                    where: (pm, { eq, and }) => and(eq(pm.projectId, updated.projectId), eq(pm.userId, assigneeId))
                })

                if (!isMember) {
                    console.log('➕ Adding new assignee to project members:', assigneeId)
                    await db.insert(projectMembers).values({
                        projectId: updated.projectId,
                        userId: assigneeId,
                        role: 'member'
                    })
                }
            }
        }

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating task:', error)
        return c.json({ success: false, error: 'Failed to update task' }, 500)
    }
})

// DELETE /api/tasks/:id - Delete task (requires tasks.delete permission)
tasksRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        // const session = await auth.api.getSession({ headers: c.req.raw.headers })
        // if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        // const userId = session.user.id
        const user = c.get('user') as any
        const userId = user.id

        // Get task
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(task.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        let workspaceRole: WorkspaceRole | null = null
        const workspaceId = await getWorkspaceIdFromProject(task.projectId)
        if (workspaceId) {
            workspaceRole = await getUserWorkspaceRole(userId, workspaceId)
        }

        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canDeleteTasks(workspaceRole, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete task' }, 403)
        }

        const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Task not found' }, 404)

        // 📅 Sync to Calendar
        await deleteTaskCalendarEvent(id)

        // TRIGGER WEBHOOK
        if (workspaceId) {
            triggerWebhook('task.deleted', deleted, workspaceId)
        }

        return c.json({ success: true, message: `Task "${deleted.title}" deleted` })
    } catch (error) {
        console.error('Error deleting task:', error)
        return c.json({ success: false, error: 'Failed to delete task' }, 500)
    }
})

// =============================================================================
// TASK MOVE (3.12)
// =============================================================================

tasksRoutes.patch('/:id/move', async (c) => {
    try {
        const id = c.req.param('id')
        // const session = await auth.api.getSession({ headers: c.req.raw.headers })
        // if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        // const userId = session.user.id
        const user = c.get('user') as any
        const userId = user.id

        const body = await c.req.json()

        // Get task
        const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get teamId from project
        const teamId = await getTeamIdFromProject(task.projectId)
        if (!teamId) {
            return c.json({ success: false, error: 'Project not found' }, 404)
        }

        // Get permissions
        let workspaceRole: WorkspaceRole | null = null
        const workspaceId = await getWorkspaceIdFromProject(task.projectId)
        if (workspaceId) {
            workspaceRole = await getUserWorkspaceRole(userId, workspaceId)
        }

        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow move if can update tasks or is assignee
        const isAssignee = task.assignees?.includes(userId)
        if (!canUpdateTasks(workspaceRole, teamLevel) && !isAssignee) {
            return c.json({ success: false, error: 'Unauthorized to move task' }, 403)
        }

        const updateData: any = { updatedAt: new Date() }
        if (body.status) updateData.status = body.status
        if (body.position !== undefined) updateData.position = body.position

        const [updated] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning()
        if (!updated) return c.json({ success: false, error: 'Task not found' }, 404)

        // TRIGGER WEBHOOK - only for status change (drag-drop move)
        if (workspaceId && body.status && body.status !== task.status) {
            // Lookup stage names
            const [oldStage, newStage] = await Promise.all([
                task.status ? db.query.projectStages.findFirst({ where: (s, { eq }) => eq(s.id, task.status), columns: { name: true } }) : null,
                updated.status ? db.query.projectStages.findFirst({ where: (s, { eq }) => eq(s.id, updated.status), columns: { name: true } }) : null
            ])

            triggerWebhook('task.status_changed', {
                taskId: id,
                oldStatus: oldStage?.name || task.status,
                newStatus: newStage?.name || updated.status,
                task: updated,
                title: updated.title
            }, workspaceId)
        }

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error moving task:', error)
        return c.json({ success: false, error: 'Failed to move task' }, 500)
    }
})

// =============================================================================
// SUBTASKS CRUD (3.13) - Inherit permissions from parent task
// =============================================================================

tasksRoutes.get('/:id/subtasks', async (c) => {
    try {
        const id = c.req.param('id')
        const result = await db.query.subtasks.findMany({
            where: (s, { eq }) => eq(s.taskId, id),
            with: {
                assignee: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (s, { asc }) => [asc(s.position)]
        })
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching subtasks:', error)
        return c.json({ success: false, error: 'Failed to fetch subtasks' }, 500)
    }
})

tasksRoutes.post('/:id/subtasks', async (c) => {
    try {
        const id = c.req.param('id')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const body = await c.req.json()
        const [created] = await db.insert(subtasks).values({
            taskId: id,
            title: body.title,
            description: body.description || null,
            isCompleted: body.isCompleted || false,
            assigneeId: body.assigneeId || null,
            dependsOn: body.dependsOn || []
        } as NewSubtask).returning()

        // Log activity
        await db.insert(taskActivityLog).values({
            taskId: id,
            userId: userId === 'temp-user-id' ? (await db.query.users.findFirst())?.id || 'temp-id' : userId,
            activityType: 'subtask_created',
            newValue: created.title
        })

        // TRIGGER WEBHOOK
        const task = await db.query.tasks.findFirst({ where: (t, { eq }) => eq(t.id, id), columns: { projectId: true, title: true } })
        if (task) {
            const workspaceId = await getWorkspaceIdFromProject(task.projectId)
            if (workspaceId) {
                triggerWebhook('subtask.created', {
                    ...created,
                    taskTitle: task.title
                }, workspaceId)
            }
        }

        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating subtask:', error)
        return c.json({ success: false, error: 'Failed to create subtask' }, 500)
    }
})

tasksRoutes.patch('/:taskId/subtasks/:subtaskId', async (c) => {
    try {
        const taskId = c.req.param('taskId')
        const subtaskId = c.req.param('subtaskId')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        const body = await c.req.json()

        // Get old version for logging
        const [oldSubtask] = await db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1)
        if (!oldSubtask) return c.json({ success: false, error: 'Subtask not found' }, 404)

        const updateData: any = { updatedAt: new Date() }
        if (body.title !== undefined) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.isCompleted !== undefined) {
            updateData.isCompleted = body.isCompleted
            updateData.completedAt = body.isCompleted ? new Date() : null
        }
        if (body.position !== undefined) updateData.position = body.position
        if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId
        if (body.dependsOn !== undefined) updateData.dependsOn = body.dependsOn

        const [updated] = await db.update(subtasks).set(updateData).where(eq(subtasks.id, subtaskId)).returning()
        if (!updated) return c.json({ success: false, error: 'Subtask not found' }, 404)

        // Log activity based on what changed
        let details = ''
        const metadata: any = { subtask_id: subtaskId }

        if (body.isCompleted !== undefined && body.isCompleted !== oldSubtask.isCompleted) {
            details = body.isCompleted ? `ukończył(a) podzadanie: ${updated.title} ` : `przywrócił(a) podzadanie: ${updated.title} `
        } else if (body.title !== undefined && body.title !== oldSubtask.title) {
            details = `zmienił(a) nazwę podzadania z "${oldSubtask.title}" na "${updated.title}"`
        }

        if (details) {
            await db.insert(taskActivityLog).values({
                taskId: taskId,
                userId: userId,
                activityType: 'subtask_updated',
                newValue: details,
                oldValue: oldSubtask.title,
                metadata: JSON.stringify(metadata)
            })
        }

        // TRIGGER WEBHOOK
        const parentTask = await db.query.tasks.findFirst({ where: (t, { eq }) => eq(t.id, taskId), columns: { projectId: true, title: true } })
        if (parentTask) {
            const wsId = await getWorkspaceIdFromProject(parentTask.projectId)
            if (wsId) {
                if (body.isCompleted && !oldSubtask.isCompleted) {
                    triggerWebhook('subtask.completed', {
                        ...updated,
                        taskTitle: parentTask.title
                    }, wsId)
                } else {
                    triggerWebhook('subtask.updated', {
                        ...updated,
                        taskTitle: parentTask.title,
                        changes: metadata
                    }, wsId)
                }
            }
        }

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating subtask:', error)
        return c.json({ success: false, error: 'Failed to update subtask' }, 500)
    }
})

tasksRoutes.delete('/:taskId/subtasks/:subtaskId', async (c) => {
    try {
        const taskId = c.req.param('taskId')
        const subtaskId = c.req.param('subtaskId')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id
        const [deleted] = await db.delete(subtasks).where(eq(subtasks.id, subtaskId)).returning()
        if (!deleted) return c.json({ success: false, error: 'Subtask not found' }, 404)

        // Log activity
        await db.insert(taskActivityLog).values({
            taskId: taskId,
            userId: userId === 'temp-user-id' ? (await db.query.users.findFirst())?.id || 'temp-id' : userId,
            activityType: 'subtask_deleted',
            newValue: deleted.title
        })

        // TRIGGER WEBHOOK
        const parentTask = await db.query.tasks.findFirst({ where: (t, { eq }) => eq(t.id, taskId), columns: { projectId: true } })
        if (parentTask) {
            const wsId = await getWorkspaceIdFromProject(parentTask.projectId)
            if (wsId) {
                triggerWebhook('subtask.deleted', deleted, wsId)
            }
        }

        return c.json({ success: true, message: 'Subtask deleted' })
    } catch (error) {
        console.error('Error deleting subtask:', error)
        return c.json({ success: false, error: 'Failed to delete subtask' }, 500)
    }
})

// =============================================================================
// TASK LABELS (3.15) - Labels are now stored directly on tasks.labels text[]
// =============================================================================

tasksRoutes.post('/:id/labels', async (c) => {
    try {
        const id = c.req.param('id')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const { labelId } = await c.req.json()

        // Get current task and its labels
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            columns: { id: true, labels: true }
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Add label to the array if not already present
        const currentLabels = task.labels || []
        if (!currentLabels.includes(labelId)) {
            await db.update(tasks).set({ labels: [...currentLabels, labelId] }).where(eq(tasks.id, id))
        }

        return c.json({ success: true, message: 'Label added to task' }, 201)
    } catch (error) {
        console.error('Error adding label:', error)
        return c.json({ success: false, error: 'Failed to add label' }, 500)
    }
})

tasksRoutes.delete('/:id/labels/:labelId', async (c) => {
    try {
        const id = c.req.param('id')
        const labelId = c.req.param('labelId')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)

        // Get current task and its labels
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, id),
            columns: { id: true, labels: true }
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Remove label from the array
        const currentLabels = task.labels || []
        const newLabels = currentLabels.filter(l => l !== labelId)
        await db.update(tasks).set({ labels: newLabels }).where(eq(tasks.id, id))

        return c.json({ success: true, message: 'Label removed from task' })
    } catch (error) {
        console.error('Error removing label:', error)
        return c.json({ success: false, error: 'Failed to remove label' }, 500)
    }
})

// =============================================================================
// TASK COMMENTS (3.16)
// =============================================================================

tasksRoutes.get('/:id/comments', async (c) => {
    try {
        const id = c.req.param('id')
        const result = await db.query.taskComments.findMany({
            where: (tc, { eq }) => eq(tc.taskId, id),
            with: {
                user: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (tc, { desc }) => [desc(tc.createdAt)]
        })

        const mappedComments = result.map(c => ({
            id: c.id,
            author: { id: c.user?.id || '', name: c.user?.name || 'Unknown', avatar: c.user?.image },
            content: c.content,
            likes: JSON.parse(c.likes || '[]'),
            parentId: c.parentId,
            replies: [],
            createdAt: formatTimeAgo(c.createdAt)
        }))

        return c.json({ success: true, data: mappedComments })
    } catch (error) {
        console.error('Error fetching comments:', error)
        return c.json({ success: false, error: 'Failed to fetch comments' }, 500)
    }
})

tasksRoutes.post('/:id/comments', async (c) => {
    try {
        const id = c.req.param('id')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id
        const { content, parentId } = await c.req.json()

        if (!content) return c.json({ success: false, error: 'Content is required' }, 400)

        // For demo purposes, we'll try to get a valid user ID if "temp-user-id" is provided
        let effectiveUserId = userId
        if (effectiveUserId === 'temp-user-id') {
            const firstUser = await db.query.users.findFirst()
            if (firstUser) effectiveUserId = firstUser.id
        }

        const [created] = await db.insert(taskComments).values({
            taskId: id,
            userId: effectiveUserId,
            content,
            parentId: parentId || null,
            likes: '[]'
        } as NewTaskComment).returning()

        // Log activity
        await db.insert(taskActivityLog).values({
            taskId: id,
            userId: effectiveUserId,
            activityType: 'commented',
            newValue: content.slice(0, 50) + (content.length > 50 ? '...' : '')
        })

        // TRIGGER WEBHOOK
        const task = await db.query.tasks.findFirst({ where: (t, { eq }) => eq(t.id, id), columns: { projectId: true } })
        if (task) {
            const workspaceId = await getWorkspaceIdFromProject(task.projectId)
            if (workspaceId) {
                triggerWebhook('comment.added', { ...created, taskTitle: (await db.query.tasks.findFirst({ where: (t, { eq }) => eq(t.id, id), columns: { title: true } }))?.title }, workspaceId)
            }
        }

        // Fetch user for response
        const user = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.id, effectiveUserId),
            columns: { id: true, name: true, image: true }
        })

        const mappedComment = {
            id: created.id,
            author: { id: user?.id || '', name: user?.name || 'Unknown', avatar: user?.image },
            content: created.content,
            likes: [],
            parentId: created.parentId,
            replies: [],
            createdAt: formatTimeAgo(created.createdAt)
        }

        return c.json({ success: true, data: mappedComment }, 201)
    } catch (error) {
        console.error('Error creating comment:', error)
        return c.json({ success: false, error: 'Failed to create comment' }, 500)
    }
})

tasksRoutes.patch('/:taskId/comments/:commentId/like', async (c) => {
    try {
        const commentId = c.req.param('commentId')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        // For demo, use real user if temp
        let effectiveUserId = userId
        if (effectiveUserId === 'temp-user-id') {
            const firstUser = await db.query.users.findFirst()
            if (firstUser) effectiveUserId = firstUser.id
        }

        const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, commentId)).limit(1)
        if (!comment) return c.json({ success: false, error: 'Comment not found' }, 404)

        let likes: string[] = []
        try {
            likes = JSON.parse(comment.likes || '[]')
        } catch (e) {
            likes = []
        }

        const isLiked = likes.includes(effectiveUserId)
        const newLikes = isLiked
            ? likes.filter(id => id !== effectiveUserId)
            : [...likes, effectiveUserId]

        await db.update(taskComments)
            .set({ likes: JSON.stringify(newLikes) })
            .where(eq(taskComments.id, commentId))

        return c.json({ success: true, likes: newLikes })
    } catch (error) {
        console.error('Error liking comment:', error)
        return c.json({ success: false, error: 'Failed to like comment' }, 500)
    }
})

// =============================================================================
// TASK ACTIVITY (3.18)
// =============================================================================

tasksRoutes.get('/:id/activity', async (c) => {
    try {
        const id = c.req.param('id')
        const result = await db.select().from(taskActivityLog).where(eq(taskActivityLog.taskId, id)).orderBy(desc(taskActivityLog.createdAt))
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching activity:', error)
        return c.json({ success: false, error: 'Failed to fetch activity' }, 500)
    }
})

// =============================================================================
// BULK OPERATIONS
// =============================================================================

// POST /api/tasks/bulk/delete - Delete multiple tasks
tasksRoutes.post('/bulk/delete', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const { taskIds } = await c.req.json()

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return c.json({ success: false, error: 'taskIds array is required' }, 400)
        }

        // Delete tasks one by one
        const deleted: string[] = []
        for (const taskId of taskIds) {
            try {
                await db.delete(tasks).where(eq(tasks.id, taskId))
                deleted.push(taskId)
            } catch {
                // Skip failed deletes
            }
        }

        return c.json({
            success: true,
            data: { deleted, count: deleted.length },
            message: `${deleted.length} task(s) deleted`
        })
    } catch (error) {
        console.error('Error bulk deleting tasks:', error)
        return c.json({ success: false, error: 'Failed to delete tasks' }, 500)
    }
})

// POST /api/tasks/bulk/move - Move multiple tasks to a different status/column
tasksRoutes.post('/bulk/move', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)

        const { taskIds, status } = await c.req.json()

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return c.json({ success: false, error: 'taskIds array is required' }, 400)
        }
        if (!status) {
            return c.json({ success: false, error: 'status is required' }, 400)
        }

        // Update tasks one by one
        const updated: string[] = []
        for (const taskId of taskIds) {
            try {
                await db.update(tasks).set({ status }).where(eq(tasks.id, taskId))
                updated.push(taskId)
            } catch {
                // Skip failed updates
            }
        }

        return c.json({
            success: true,
            data: { updated, count: updated.length },
            message: `${updated.length} task(s) moved to ${status} `
        })
    } catch (error) {
        console.error('Error bulk moving tasks:', error)
        return c.json({ success: false, error: 'Failed to move tasks' }, 500)
    }
})

// POST /api/tasks/bulk/archive - Archive multiple tasks
tasksRoutes.post('/bulk/archive', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)

        const { taskIds } = await c.req.json()

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return c.json({ success: false, error: 'taskIds array is required' }, 400)
        }

        // Archive tasks one by one
        const archived: string[] = []
        for (const taskId of taskIds) {
            try {
                await db.update(tasks).set({ isArchived: true }).where(eq(tasks.id, taskId))
                archived.push(taskId)
            } catch {
                // Skip failed archives
            }
        }

        return c.json({
            success: true,
            data: { archived, count: archived.length },
            message: `${archived.length} task(s) archived`
        })
    } catch (error) {
        console.error('Error bulk archiving tasks:', error)
        return c.json({ success: false, error: 'Failed to archive tasks' }, 500)
    }
})
// Add at the end of apps/api/src/modules/tasks/routes.ts, before the export

// =============================================================================
// TASK FILES (5.33)
// =============================================================================

// GET /api/tasks/:id/files - Get all files attached to task
tasksRoutes.get('/:id/files', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)

        const id = c.req.param('id')

        // Query files where task_id = id
        const taskFiles = await db.query.files.findMany({
            where: (f, { eq }) => eq(f.taskId, id),
            with: {
                uploader: {
                    columns: { id: true, name: true, image: true }
                }
            },
            orderBy: (f, { desc }) => [desc(f.createdAt)]
        })

        return c.json({ success: true, data: taskFiles })
    } catch (error) {
        console.error('Error fetching task files:', error)
        return c.json({ success: false, error: 'Failed to fetch task files' }, 500)
    }
})

// POST /api/tasks/:id/files/:fileId - Attach existing file to task
tasksRoutes.post('/:id/files/:fileId', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)

        const taskId = c.req.param('id')
        const fileId = c.req.param('fileId')

        // Verify task exists
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId)
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Verify file exists
        const { files } = await import('../../db/schema/files')
        const file = await db.query.files.findFirst({
            where: (f, { eq }) => eq(f.id, fileId)
        })
        if (!file) return c.json({ success: false, error: 'File not found' }, 404)

        // Update file's task_id
        const [updated] = await db.update(files)
            .set({ taskId: taskId })
            .where(eq(files.id, fileId))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error attaching file to task:', error)
        return c.json({ success: false, error: 'Failed to attach file' }, 500)
    }
})

// POST /api/tasks/:id/upload - Upload new file and attach to task
tasksRoutes.post('/:id/upload', async (c) => {
    try {
        const taskId = c.req.param('id')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id

        // Verify task exists
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId),
            with: {
                project: {
                    with: {
                        team: {
                            columns: { workspaceId: true }
                        }
                    }
                }
            }
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get workspace ID from task's project's team
        const workspaceId = task.project.team?.workspaceId
        if (!workspaceId) return c.json({ success: false, error: 'Workspace not found' }, 404)

        // Parse multipart form data
        const formData = await c.req.formData()
        const file = formData.get('file') as File
        if (!file) return c.json({ success: false, error: 'No file provided' }, 400)

        // Upload to R2
        const { getUploadUrl } = await import('../../lib/r2')
        const fileExt = file.name.split('.').pop() || ''
        const r2Key = `${workspaceId}/${crypto.randomUUID()}.${fileExt}`
        const uploadUrl = await getUploadUrl(r2Key, file.type)

        // Upload file to R2
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type || 'application/octet-stream'
            }
        })

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload to R2')
        }

        // Create file record in database with taskId
        const { files } = await import('../../db/schema/files')
        const teamId = task.project.teamId

        const [created] = await db.insert(files).values({
            name: file.name,
            path: r2Key,
            r2Key: r2Key,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            fileType: fileExt.toLowerCase(),
            workspaceId: workspaceId,
            teamId: teamId, // Team ID from project
            taskId: taskId, // Attach to task
            uploadedBy: userId || null // null if no user ID provided
        }).returning()

        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error uploading file to task:', error)
        return c.json({ success: false, error: 'Failed to upload file' }, 500)
    }
})

// DELETE /api/tasks/:id/files/:fileId - Remove file from task
tasksRoutes.delete('/:id/files/:fileId', async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)

        const fileId = c.req.param('fileId')

        // Set task_id to null (keeps file in workspace)
        const { files } = await import('../../db/schema/files')
        const [updated] = await db.update(files)
            .set({ taskId: null })
            .where(eq(files.id, fileId))
            .returning()

        if (!updated) return c.json({ success: false, error: 'File not found' }, 404)

        return c.json({ success: true, message: 'File removed from task' })
    } catch (error) {
        console.error('Error removing file from task:', error)
        return c.json({ success: false, error: 'Failed to remove file' }, 500)
    }
})

// =============================================================================
// TASK LINKS (5.34)
// =============================================================================

// POST /api/tasks/:id/links - Add link to task
tasksRoutes.post('/:id/links', async (c) => {
    try {
        const taskId = c.req.param('id')
        const session = await auth.api.getSession({ headers: c.req.raw.headers })
        if (!session?.user) return c.json({ error: 'Unauthorized' }, 401)
        const userId = session.user.id
        const body = await c.req.json()

        if (!body.url) return c.json({ success: false, error: 'URL is required' }, 400)

        // Verify task exists
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId)
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Create new link object
        const newLink = {
            id: crypto.randomUUID(),
            url: body.url,
            title: body.title,
            description: body.description,
            addedBy: userId || 'unknown',
            addedAt: new Date().toISOString()
        }

        // Get current links
        const currentLinks = (task.links as any[]) || []

        // Add new link to array
        await db.update(tasks)
            .set({ links: [...currentLinks, newLink] as any })
            .where(eq(tasks.id, taskId))

        return c.json({ success: true, data: newLink }, 201)
    } catch (error) {
        console.error('Error adding link to task:', error)
        return c.json({ success: false, error: 'Failed to add link' }, 500)
    }
})

// PATCH /api/tasks/:id/links/:linkId - Update link
tasksRoutes.patch('/:id/links/:linkId', async (c) => {
    try {
        const taskId = c.req.param('id')
        const linkId = c.req.param('linkId')
        const body = await c.req.json()

        // Get task with links
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId)
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get current links
        const currentLinks = (task.links as any[]) || []

        // Find and update the link
        const linkIndex = currentLinks.findIndex(l => l.id === linkId)
        if (linkIndex === -1) return c.json({ success: false, error: 'Link not found' }, 404)

        const updatedLink = {
            ...currentLinks[linkIndex],
            ...body,
            id: linkId, // Ensure ID doesn't change
            addedBy: currentLinks[linkIndex].addedBy, // Preserve original adder
            addedAt: currentLinks[linkIndex].addedAt // Preserve original timestamp
        }

        currentLinks[linkIndex] = updatedLink

        // Update task
        await db.update(tasks)
            .set({ links: currentLinks as any })
            .where(eq(tasks.id, taskId))

        return c.json({ success: true, data: updatedLink })
    } catch (error) {
        console.error('Error updating link:', error)
        return c.json({ success: false, error: 'Failed to update link' }, 500)
    }
})

// DELETE /api/tasks/:id/links/:linkId - Remove link
tasksRoutes.delete('/:id/links/:linkId', async (c) => {
    try {
        const taskId = c.req.param('id')
        const linkId = c.req.param('linkId')

        // Get task with links
        const task = await db.query.tasks.findFirst({
            where: (t, { eq }) => eq(t.id, taskId)
        })
        if (!task) return c.json({ success: false, error: 'Task not found' }, 404)

        // Get current links
        const currentLinks = (task.links as any[]) || []

        // Filter out the link
        const newLinks = currentLinks.filter(l => l.id !== linkId)

        // Update task
        await db.update(tasks)
            .set({ links: newLinks as any })
            .where(eq(tasks.id, taskId))

        return c.json({ success: true, message: 'Link removed from task' })
    } catch (error) {
        console.error('Error removing link:', error)
        return c.json({ success: false, error: 'Failed to remove link' }, 500)
    }
})