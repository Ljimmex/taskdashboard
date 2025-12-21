import { Hono } from 'hono'
import { db } from '../../db'
import { taskComments, type NewTaskComment } from '../../db/schema/tasks'
import { eq } from 'drizzle-orm'

export const commentsRoutes = new Hono()

// GET /api/comments
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

// POST /api/comments
commentsRoutes.post('/', async (c) => {
    try {
        const body = await c.req.json()
        const newComment: NewTaskComment = {
            taskId: body.taskId,
            userId: body.userId,
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

// PATCH /api/comments/:id
commentsRoutes.patch('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
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

// DELETE /api/comments/:id
commentsRoutes.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const [deleted] = await db.delete(taskComments).where(eq(taskComments.id, id)).returning()
        if (!deleted) return c.json({ success: false, error: 'Comment not found' }, 404)
        return c.json({ success: true, message: 'Comment deleted' })
    } catch (error) {
        console.error('Error deleting comment:', error)
        return c.json({ success: false, error: 'Failed to delete comment' }, 500)
    }
})

// POST /api/comments/:id/like
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

// POST /api/comments/:id/reply
commentsRoutes.post('/:id/reply', async (c) => {
    try {
        const parentId = c.req.param('id')
        const body = await c.req.json()

        const newReply: NewTaskComment = {
            taskId: body.taskId,
            userId: body.userId,
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
