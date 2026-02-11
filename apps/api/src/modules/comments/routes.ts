import { Hono } from 'hono'
import { db } from '../../db'
import { taskComments, type NewTaskComment, tasks } from '../../db/schema/tasks'
import { projects } from '../../db/schema/projects'
import { teams } from '../../db/schema/teams'
// workspaceMembers accessed via db.query, no direct import needed
import { eq } from 'drizzle-orm'
import {
    canCreateComments,
    canModerateComments,
    type TeamLevel,
    type WorkspaceRole
} from '../../lib/permissions'

export const commentsRoutes = new Hono()

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

// Helper: Get teamId from taskId
async function getTeamIdFromTask(taskId: string): Promise<string | null> {
    const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (!task) return null
    const [project] = await db.select({ teamId: projects.teamId }).from(projects).where(eq(projects.id, task.projectId)).limit(1)
    return project?.teamId || null
}

// Helper: Get workspaceId from taskId
async function getWorkspaceIdFromTask(taskId: string): Promise<string | null> {
    const teamId = await getTeamIdFromTask(taskId)
    if (!teamId) return null
    const [team] = await db.select({ workspaceId: teams.workspaceId }).from(teams).where(eq(teams.id, teamId)).limit(1)
    return team?.workspaceId || null
}

// GET /api/comments - List comments for a task (anyone with project access can view)
commentsRoutes.get('/', async (c) => {
    try {
        const taskId = c.req.query('taskId')
        if (!taskId) return c.json({ success: false, error: 'taskId is required' }, 400)
        const result = await db.select().from(taskComments).where(eq(taskComments.taskId, taskId)).orderBy(taskComments.createdAt)
        return c.json({ success: true, data: result })
    } catch (error) {
        console.error('Error fetching comments:', error)
        return c.json({ success: false, error: 'Failed to fetch comments' }, 500)
    }
})

// POST /api/comments - Create comment (requires comments.create permission)
commentsRoutes.post('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get workspace context
        const workspaceId = await getWorkspaceIdFromTask(body.taskId)
        if (!workspaceId) {
            return c.json({ success: false, error: 'Task workspace not found' }, 404)
        }

        // Check workspace membership status (blocks suspended users)
        const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)
        if (!workspaceRole) {
            return c.json({ error: 'Forbidden: No active workspace access' }, 403)
        }

        // Get teamId from task
        const teamId = await getTeamIdFromTask(body.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateComments(workspaceRole, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to create comments' }, 403)
        }

        const newComment: NewTaskComment = {
            taskId: body.taskId,
            userId: body.userId || userId,
            content: body.content,
            parentId: body.parentId || null, // Support for replies
            likes: '[]', // Initialize empty likes array
        }
        const [created] = await db.insert(taskComments).values(newComment).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating comment:', error)
        return c.json({ success: false, error: 'Failed to create comment' }, 500)
    }
})

// PATCH /api/comments/:id - Update comment (author OR moderate permission)
commentsRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get comment to check author
        const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, id)).limit(1)
        if (!comment) return c.json({ success: false, error: 'Comment not found' }, 404)

        const isAuthor = comment.userId === userId

        // Get teamId from task
        const teamId = await getTeamIdFromTask(comment.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: is author OR has moderate permission
        if (!isAuthor && !canModerateComments(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to update comment' }, 403)
        }

        const [updated] = await db.update(taskComments)
            .set({ content: body.content, updatedAt: new Date() })
            .where(eq(taskComments.id, id))
            .returning()
        if (!updated) return c.json({ success: false, error: 'Comment not found' }, 404)
        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating comment:', error)
        return c.json({ success: false, error: 'Failed to update comment' }, 500)
    }
})

// DELETE /api/comments/:id - Delete comment (author OR moderate permission)
commentsRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'

        // Get comment to check author
        const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, id)).limit(1)
        if (!comment) return c.json({ success: false, error: 'Comment not found' }, 404)

        const isAuthor = comment.userId === userId

        // Get teamId from task
        const teamId = await getTeamIdFromTask(comment.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        // Allow if: is author OR has moderate permission
        if (!isAuthor && !canModerateComments(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to delete comment' }, 403)
        }

        const [deleted] = await db.delete(taskComments).where(eq(taskComments.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Comment not found' }, 404)
        return c.json({ success: true, message: 'Comment deleted' })
    } catch (error) {
        console.error('Error deleting comment:', error)
        return c.json({ success: false, error: 'Failed to delete comment' }, 500)
    }
})

// POST /api/comments/:id/like - Toggle like on comment
commentsRoutes.post('/:id/like', async (c) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
        const userId = body.userId

        if (!userId) return c.json({ success: false, error: 'userId is required' }, 400)

        // Fetch current comment
        const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, id))
        if (!comment) return c.json({ success: false, error: 'Comment not found' }, 404)

        // Parse likes array
        const likes: string[] = JSON.parse(comment.likes || '[]')

        // Toggle like
        const userIndex = likes.indexOf(userId)
        if (userIndex > -1) {
            likes.splice(userIndex, 1) // Unlike
        } else {
            likes.push(userId) // Like
        }

        // Update comment
        const [updated] = await db.update(taskComments)
            .set({ likes: JSON.stringify(likes) })
            .where(eq(taskComments.id, id))
            .returning()

        return c.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error toggling like:', error)
        return c.json({ success: false, error: 'Failed to toggle like' }, 500)
    }
})

// POST /api/comments/:id/reply - Reply to a comment
commentsRoutes.post('/:id/reply', async (c) => {
    try {
        const parentId = c.req.param('id')
        const userId = c.req.header('x-user-id') || 'temp-user-id'
        const body = await c.req.json()

        // Get parent comment to get taskId
        const [parentComment] = await db.select().from(taskComments).where(eq(taskComments.id, parentId)).limit(1)
        if (!parentComment) return c.json({ success: false, error: 'Parent comment not found' }, 404)

        // Get teamId from task
        const teamId = await getTeamIdFromTask(parentComment.taskId)
        if (!teamId) {
            return c.json({ success: false, error: 'Task not found' }, 404)
        }

        // Get permissions
        const teamLevel = await getUserTeamLevel(userId, teamId)

        if (!canCreateComments(null, teamLevel)) {
            return c.json({ success: false, error: 'Unauthorized to reply to comments' }, 403)
        }

        const newReply: NewTaskComment = {
            taskId: body.taskId || parentComment.taskId,
            userId: body.userId || userId,
            content: body.content,
            parentId: parentId,
            likes: '[]',
        }

        const [created] = await db.insert(taskComments).values(newReply).returning()
        return c.json({ success: true, data: created }, 201)
    } catch (error) {
        console.error('Error creating reply:', error)
        return c.json({ success: false, error: 'Failed to create reply' }, 500)
    }
})
