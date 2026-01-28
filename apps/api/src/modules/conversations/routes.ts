import { Hono } from 'hono'
import { db } from '../../db'
import { conversations } from '../../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { ConversationMessage } from '@taskdashboard/types'

const conversationsRoutes = new Hono()

// =============================================================================
// GET /api/conversations/direct - Find or get direct conversation between 2 users
// =============================================================================

conversationsRoutes.get('/direct', async (c) => {
    try {
        const userId1 = c.req.query('userId1')
        const userId2 = c.req.query('userId2')

        if (!userId1 || !userId2) {
            return c.json({ success: false, error: 'userId1 and userId2 required' }, 400)
        }

        // Find conversation where both users are participants (and only these 2)
        const allConversations = await db.select().from(conversations)

        const directConversation = allConversations.find(conv => {
            const participants = conv.participants as string[]
            return conv.type === 'direct' &&
                participants.length === 2 &&
                participants.includes(userId1) &&
                participants.includes(userId2)
        })

        if (!directConversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        return c.json({ success: true, conversation: directConversation })
    } catch (error) {
        console.error('Error finding direct conversation:', error)
        return c.json({ success: false, error: 'Failed to find conversation' }, 500)
    }
})

// =============================================================================
// POST /api/conversations/direct - Create direct conversation between 2 users
// =============================================================================

conversationsRoutes.post('/direct', async (c) => {
    try {
        const body = await c.req.json()
        const { workspaceId, userId1, userId2 } = body

        if (!workspaceId || !userId1 || !userId2) {
            return c.json({ success: false, error: 'workspaceId, userId1, and userId2 required' }, 400)
        }

        // Check if conversation already exists
        const allConversations = await db.select().from(conversations)
        const existing = allConversations.find(conv => {
            const participants = conv.participants as string[]
            return conv.type === 'direct' &&
                participants.length === 2 &&
                participants.includes(userId1) &&
                participants.includes(userId2)
        })

        if (existing) {
            return c.json({ success: true, conversation: existing })
        }

        // Create new direct conversation
        const [newConversation] = await db.insert(conversations).values({
            teamId: null,
            workspaceId,
            type: 'direct',
            participants: [userId1, userId2],
            messages: [],
            createdBy: userId1,
            isPrivate: true
        }).returning()

        return c.json({ success: true, conversation: newConversation }, 201)
    } catch (error) {
        console.error('Error creating direct conversation:', error)
        return c.json({ success: false, error: 'Failed to create conversation' }, 500)
    }
})

// =============================================================================
// GET /api/conversations - List conversations
// =============================================================================

conversationsRoutes.get('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const workspaceId = c.req.query('workspaceId')
        const teamId = c.req.query('teamId')
        const type = c.req.query('type') as 'direct' | 'group' | 'channel' | undefined
        const includeMessages = c.req.query('includeMessages') === 'true'

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        if (!workspaceId && !teamId) {
            return c.json({ success: false, error: 'workspaceId or teamId required' }, 400)
        }

        // Build where clauses
        const whereConditions: any[] = []

        if (teamId) {
            whereConditions.push(eq(conversations.teamId, teamId))
        }

        if (workspaceId) {
            whereConditions.push(eq(conversations.workspaceId, workspaceId))
        }

        if (type) {
            whereConditions.push(eq(conversations.type, type))
        }

        // Filter for conversations where user is participant
        whereConditions.push(
            sql`${conversations.participants} @> ARRAY[${userId}]::jsonb`
        )

        const result = await db.select().from(conversations).where(and(...whereConditions))

        // If includeMessages is false, remove messages from response
        const sanitized = result.map(conv => {
            if (!includeMessages) {
                const { messages, ...rest } = conv
                return {
                    ...rest,
                    messageCount: (messages as ConversationMessage[])?.length || 0
                }
            }
            return conv
        })

        return c.json({ success: true, data: sanitized })
    } catch (error) {
        console.error('Error fetching conversations:', error)
        return c.json({ success: false, error: 'Failed to fetch conversations' }, 500)
    }
})

// =============================================================================
// POST /api/conversations - Create conversation
// =============================================================================

conversationsRoutes.post('/', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const body = await c.req.json()

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const { teamId, workspaceId, type, name, description, isPrivate, participants } = body

        if (!teamId && !workspaceId) {
            return c.json({ success: false, error: 'teamId or workspaceId required' }, 400)
        }

        if (!type) {
            return c.json({ success: false, error: 'type required' }, 400)
        }

        // For channels, name is required
        if (type === 'channel' && !name) {
            return c.json({ success: false, error: 'name required for channels' }, 400)
        }

        // Ensure creator is in participants
        const allParticipants = participants ? [...new Set([userId, ...participants])] : [userId]

        const [newConversation] = await db.insert(conversations).values({
            teamId: teamId || null,
            workspaceId: workspaceId || null,
            type,
            name: name || null,
            description: description || null,
            isPrivate: isPrivate || false,
            participants: allParticipants,
            messages: [],
            createdBy: userId,
        }).returning()

        return c.json({ success: true, data: newConversation }, 201)
    } catch (error) {
        console.error('Error creating conversation:', error)
        return c.json({ success: false, error: 'Failed to create conversation' }, 500)
    }
})

// =============================================================================
// GET /api/conversations/:id - Get conversation with messages
// =============================================================================

conversationsRoutes.get('/:id', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const conversationId = c.req.param('id')
        const limit = parseInt(c.req.query('limit') || '50')
        const before = c.req.query('before') // message ID for pagination

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        // Check if user is participant
        const participants = conversation.participants as string[]
        if (!participants.includes(userId)) {
            return c.json({ success: false, error: 'Access denied' }, 403)
        }

        // Get messages with pagination
        let messages = (conversation.messages as ConversationMessage[]) || []

        if (before) {
            const beforeIndex = messages.findIndex(m => m.id === before)
            if (beforeIndex > 0) {
                messages = messages.slice(Math.max(0, beforeIndex - limit), beforeIndex)
            }
        } else {
            messages = messages.slice(-limit) // Get last N messages
        }

        return c.json({
            success: true,
            data: {
                ...conversation,
                messages
            }
        })
    } catch (error) {
        console.error('Error fetching conversation:', error)
        return c.json({ success: false, error: 'Failed to fetch conversation' }, 500)
    }
})

// =============================================================================
// POST /api/conversations/:id/messages - Add new message (new endpoint)
// =============================================================================

conversationsRoutes.post('/:id/messages', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const conversationId = c.req.param('id')
        const body = await c.req.json()

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const { content, attachments, senderId } = body

        if (!content) {
            return c.json({ success: false, error: 'content required' }, 400)
        }

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        // Check if user is participant
        const participants = conversation.participants as string[]
        if (!participants.includes(userId) && !participants.includes(senderId)) {
            return c.json({ success: false, error: 'Access denied' }, 403)
        }

        // Create new message
        const newMessage: ConversationMessage = {
            id: crypto.randomUUID(),
            senderId: senderId || userId,
            content,
            timestamp: new Date().toISOString(),
            edited: false,
            reactions: [],
            attachments: attachments || []
        }

        // Append to messages array
        const currentMessages = (conversation.messages as ConversationMessage[]) || []
        const updatedMessages = [...currentMessages, newMessage]

        // Update conversation
        await db.update(conversations)
            .set({
                messages: updatedMessages,
                lastMessageAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(conversations.id, conversationId))

        return c.json({ success: true, data: newMessage })
    } catch (error) {
        console.error('Error adding message:', error)
        return c.json({ success: false, error: 'Failed to add message' }, 500)
    }
})

// =============================================================================
// PATCH /api/conversations/:id/messages - Append new message (legacy)
// =============================================================================

conversationsRoutes.patch('/:id/messages', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const conversationId = c.req.param('id')
        const body = await c.req.json()

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const { content, attachments } = body

        if (!content) {
            return c.json({ success: false, error: 'content required' }, 400)
        }

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        // Check if user is participant
        const participants = conversation.participants as string[]
        if (!participants.includes(userId)) {
            return c.json({ success: false, error: 'Access denied' }, 403)
        }

        // Create new message
        const newMessage: ConversationMessage = {
            id: crypto.randomUUID(),
            senderId: userId,
            content,
            timestamp: new Date().toISOString(),
            edited: false,
            reactions: [],
            attachments: attachments || []
        }

        // Append to messages array
        const currentMessages = (conversation.messages as ConversationMessage[]) || []
        const updatedMessages = [...currentMessages, newMessage]

        // Update conversation
        await db.update(conversations)
            .set({
                messages: updatedMessages,
                lastMessageAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(conversations.id, conversationId))

        return c.json({ success: true, data: newMessage })
    } catch (error) {
        console.error('Error adding message:', error)
        return c.json({ success: false, error: 'Failed to add message' }, 500)
    }
})

// =============================================================================
// PATCH /api/conversations/:id/messages/:msgId - Edit message
// =============================================================================

conversationsRoutes.patch('/:id/messages/:msgId', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const conversationId = c.req.param('id')
        const messageId = c.req.param('msgId')
        const body = await c.req.json()

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const { content } = body

        if (!content) {
            return c.json({ success: false, error: 'content required' }, 400)
        }

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        const messages = (conversation.messages as ConversationMessage[]) || []
        const messageIndex = messages.findIndex(m => m.id === messageId)

        if (messageIndex === -1) {
            return c.json({ success: false, error: 'Message not found' }, 404)
        }

        // Check if user is the sender
        if (messages[messageIndex].senderId !== userId) {
            return c.json({ success: false, error: 'Can only edit own messages' }, 403)
        }

        // Update message
        messages[messageIndex] = {
            ...messages[messageIndex],
            content,
            edited: true,
            editedAt: new Date().toISOString()
        }

        // Save updated messages
        await db.update(conversations)
            .set({
                messages,
                updatedAt: new Date()
            })
            .where(eq(conversations.id, conversationId))

        return c.json({ success: true, data: messages[messageIndex] })
    } catch (error) {
        console.error('Error editing message:', error)
        return c.json({ success: false, error: 'Failed to edit message' }, 500)
    }
})

// =============================================================================
// DELETE /api/conversations/:id/messages/:msgId - Delete message
// =============================================================================

conversationsRoutes.delete('/:id/messages/:msgId', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const conversationId = c.req.param('id')
        const messageId = c.req.param('msgId')

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        const messages = (conversation.messages as ConversationMessage[]) || []
        const message = messages.find(m => m.id === messageId)

        if (!message) {
            return c.json({ success: false, error: 'Message not found' }, 404)
        }

        // Check if user is the sender
        if (message.senderId !== userId) {
            return c.json({ success: false, error: 'Can only delete own messages' }, 403)
        }

        // Remove message from array
        const updatedMessages = messages.filter(m => m.id !== messageId)

        // Update conversation
        await db.update(conversations)
            .set({
                messages: updatedMessages,
                updatedAt: new Date()
            })
            .where(eq(conversations.id, conversationId))

        return c.json({ success: true })
    } catch (error) {
        console.error('Error deleting message:', error)
        return c.json({ success: false, error: 'Failed to delete message' }, 500)
    }
})

// =============================================================================
// POST /api/conversations/:id/reactions - Add/remove reaction
// =============================================================================

conversationsRoutes.post('/:id/reactions', async (c) => {
    try {
        const userId = c.req.header('x-user-id')
        const conversationId = c.req.param('id')
        const body = await c.req.json()

        if (!userId) {
            return c.json({ success: false, error: 'Unauthorized' }, 401)
        }

        const { messageId, emoji } = body

        if (!messageId || !emoji) {
            return c.json({ success: false, error: 'messageId and emoji required' }, 400)
        }

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        const messages = (conversation.messages as ConversationMessage[]) || []
        const messageIndex = messages.findIndex(m => m.id === messageId)

        if (messageIndex === -1) {
            return c.json({ success: false, error: 'Message not found' }, 404)
        }

        // Toggle reaction
        const message = messages[messageIndex]
        const existingReactionIndex = message.reactions.findIndex(
            r => r.emoji === emoji && r.userId === userId
        )

        if (existingReactionIndex >= 0) {
            // Remove reaction
            message.reactions.splice(existingReactionIndex, 1)
        } else {
            // Add reaction
            message.reactions.push({ emoji, userId })
        }

        // Update conversation
        await db.update(conversations)
            .set({
                messages,
                updatedAt: new Date()
            })
            .where(eq(conversations.id, conversationId))

        return c.json({ success: true, data: message.reactions })
    } catch (error) {
        console.error('Error toggling reaction:', error)
        return c.json({ success: false, error: 'Failed to toggle reaction' }, 500)
    }
})

export default conversationsRoutes
