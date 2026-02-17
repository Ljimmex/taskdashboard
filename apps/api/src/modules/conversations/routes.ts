import { Hono } from 'hono'
import { db } from '../../db'
import { conversations, workspaces } from '../../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { ConversationMessage } from '@taskdashboard/types'
import { triggerWebhook } from '../webhooks/trigger'
import type { WorkspaceRole } from '../../lib/permissions'

import { type Auth } from '../../lib/auth'

import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { zSanitizedString } from '../../lib/zod-extensions'

const encryptedMessageSchema = z.object({
    v: z.number(),
    ct: z.string(),
    iv: z.string(),
    tag: z.string(),
    keys: z.record(z.string())
})

const messageContentSchema = z.union([
    zSanitizedString(),
    encryptedMessageSchema
])

const createConversationSchema = z.object({
    teamId: z.string().optional().nullable(),
    workspaceId: z.string().optional(),
    type: z.enum(['direct', 'group', 'channel']),
    name: zSanitizedString().optional(),
    description: zSanitizedString().optional(),
    isPrivate: z.boolean().optional(),
    participants: z.array(z.string()).optional()
}).refine(data => data.teamId || data.workspaceId, {
    message: "teamId or workspaceId required"
}).refine(data => data.type !== 'channel' || data.name, {
    message: "name required for channels"
})

const createDirectConversationSchema = z.object({
    workspaceId: z.string(),
    userId1: z.string(),
    userId2: z.string()
})

const typingSchema = z.object({
    isTyping: z.boolean()
})

const createMessageSchema = z.object({
    content: messageContentSchema,
    attachments: z.array(z.any()).optional(), // Define stricter attachment schema if possible
    senderId: z.string().optional(), // usually userId but can be overridden?
    replyToId: z.string().optional()
})

const appendMessageSchema = z.object({
    content: messageContentSchema,
    attachments: z.array(z.any()).optional()
})

const conversationsRoutes = new Hono<{ Variables: { user: Auth['$Infer']['Session']['user'], session: Auth['$Infer']['Session']['session'] } }>()

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

// In-memory store for typing status: ConversationId -> UserId -> Timestamp
// In a production app with multiple instances, use Redis
const typingMap = new Map<string, Map<string, number>>()

// =============================================================================
// POST /api/conversations/:id/typing - Update typing status
// =============================================================================

conversationsRoutes.post('/:id/typing', zValidator('json', typingSchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const body = c.req.valid('json')
        const { isTyping } = body

        if (!typingMap.has(conversationId)) {
            typingMap.set(conversationId, new Map())
        }

        const convoMap = typingMap.get(conversationId)!

        if (isTyping) {
            convoMap.set(userId, Date.now())
        } else {
            convoMap.delete(userId)
        }

        return c.json({ success: true })
    } catch (error) {
        return c.json({ success: false }, 500)
    }
})

// =============================================================================
// POST /api/conversations/:id/read - Mark conversation as read
// =============================================================================

conversationsRoutes.post('/:id/read', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')

        // Fetch conversation to get current states
        const [conversation] = await db.select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1)

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        // Update state
        const currentStates = conversation.participantStates || {}
        const userState = currentStates[userId] || {}

        const now = new Date().toISOString()

        const newStates = {
            ...currentStates,
            [userId]: {
                ...userState,
                readAt: now,
                // If reading, it's definitely delivered
                deliveredAt: userState.deliveredAt || now
            }
        }

        // Save back
        await db.update(conversations)
            .set({ participantStates: newStates })
            .where(eq(conversations.id, conversationId))

        return c.json({ success: true, participantStates: newStates })
    } catch (error) {
        console.error('Failed to mark read:', error)
        return c.json({ success: false }, 500)
    }
})

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

        // Use SQL to find direct conversation with exactly these participants
        const [directConversation] = await db.select()
            .from(conversations)
            .where(and(
                eq(conversations.type, 'direct'),
                // Check if participants array contains both IDs and has exactly length 2
                // Using explicit JSON string concatenation for robust containment check
                sql`${conversations.participants} @> ${JSON.stringify([userId1])}::jsonb`,
                sql`${conversations.participants} @> ${JSON.stringify([userId2])}::jsonb`,
                sql`jsonb_array_length(COALESCE(${conversations.participants}, '[]'::jsonb)) = 2`
            ))
            .limit(1)

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

conversationsRoutes.post('/direct', zValidator('json', createDirectConversationSchema), async (c) => {
    try {
        const body = c.req.valid('json')
        const { workspaceId, userId1, userId2 } = body

        // Check if conversation already exists
        const [existing] = await db.select()
            .from(conversations)
            .where(and(
                eq(conversations.type, 'direct'),
                sql`${conversations.participants} @> ${JSON.stringify([userId1])}::jsonb`,
                sql`${conversations.participants} @> ${JSON.stringify([userId2])}::jsonb`,
                sql`jsonb_array_length(COALESCE(${conversations.participants}, '[]'::jsonb)) = 2`
            ))
            .limit(1)

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
        const user = c.get('user')
        const userId = user.id
        let workspaceId = c.req.query('workspaceId')
        const workspaceSlug = c.req.query('workspaceSlug')
        const teamId = c.req.query('teamId')
        const type = c.req.query('type') as 'direct' | 'group' | 'channel' | undefined
        const includeMessages = c.req.query('includeMessages') === 'true'

        if (workspaceSlug && !workspaceId) {
            const [ws] = await db.select().from(workspaces).where(eq(workspaces.slug, workspaceSlug))
            if (ws) {
                workspaceId = ws.id
            }
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
            // Check workspace membership status (blocks suspended users)
            const workspaceRole = await getUserWorkspaceRole(userId, workspaceId)
            if (!workspaceRole) {
                return c.json({ error: 'Forbidden: No active workspace access' }, 403)
            }
            whereConditions.push(eq(conversations.workspaceId, workspaceId))
        }

        if (type) {
            whereConditions.push(eq(conversations.type, type))
        }

        // Filter for conversations where user is participant
        whereConditions.push(
            sql`${conversations.participants} @> ${JSON.stringify([userId])}::jsonb`
        )

        const result = await db.select().from(conversations).where(and(...whereConditions))

        // If includeMessages is false, remove full message history but keep last message for preview
        const sanitized = result.map(conv => {
            const msgs = (conv.messages as ConversationMessage[]) || []

            // Calculate unread count
            const userState = (conv.participantStates as any)?.[userId] || {}
            const readAt = userState.readAt ? new Date(userState.readAt) : new Date(0)
            const unreadCount = msgs.filter(m =>
                new Date(m.timestamp) > readAt &&
                m.senderId !== userId &&
                !(m as any).isSystem // Optional: Don't count system messages?
            ).length

            if (!includeMessages) {
                const { messages, ...rest } = conv
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null

                return {
                    ...rest,
                    unreadCount,
                    messageCount: msgs.length,
                    lastMessage: lastMsg ? {
                        content: lastMsg.content,
                        senderId: lastMsg.senderId,
                        timestamp: lastMsg.timestamp,
                        read: unreadCount === 0 // Helper
                    } : null
                }
            }
            return { ...conv, unreadCount }
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

conversationsRoutes.post('/', zValidator('json', createConversationSchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const body = c.req.valid('json')

        const { teamId, workspaceId, type, name, description, isPrivate, participants } = body

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
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const limit = parseInt(c.req.query('limit') || '50')
        const before = c.req.query('before') // message ID for pagination

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

        // Get active typing users (typed in last 3 seconds)
        const now = Date.now()
        const activeTypingUsers: string[] = []
        if (typingMap.has(conversationId)) {
            const convoMap = typingMap.get(conversationId)!
            for (const [uid, timestamp] of convoMap.entries()) {
                if (now - timestamp < 3000 && uid !== userId) {
                    activeTypingUsers.push(uid)
                } else if (now - timestamp >= 3000) {
                    // Cleanup old entries
                    convoMap.delete(uid)
                }
            }
        }

        return c.json({
            success: true,
            data: {
                ...conversation,
                messages,
                typingUsers: activeTypingUsers
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

conversationsRoutes.post('/:id/messages', zValidator('json', createMessageSchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const body = c.req.valid('json')

        const { content, attachments, senderId, replyToId } = body

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        // Check if user is participant
        const participants = (conversation.participants || []) as string[]
        const effectiveSenderId = senderId || userId
        if (!Array.isArray(participants) || (!participants.includes(userId) && !participants.includes(effectiveSenderId))) {
            return c.json({ success: false, error: 'Access denied' }, 403)
        }

        // Create new message
        const newMessage: any = {
            id: crypto.randomUUID(),
            senderId: senderId || userId,
            content,
            timestamp: new Date().toISOString(),
            edited: false,
            reactions: [],
            attachments: attachments || [],
            replyToId: replyToId || undefined,
            isPinned: false
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

        // TRIGGER WEBHOOK
        if (conversation.workspaceId) {
            triggerWebhook('message.sent', {
                conversationId,
                message: newMessage,
                workspaceId: conversation.workspaceId
            }, conversation.workspaceId)
        }

        return c.json({ success: true, data: newMessage })
    } catch (error) {
        console.error('Error adding message:', error)
        return c.json({ success: false, error: 'Failed to add message' }, 500)
    }
})

// =============================================================================
// PATCH /api/conversations/:id/messages - Append new message (legacy)
// =============================================================================

conversationsRoutes.patch('/:id/messages', zValidator('json', appendMessageSchema), async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const body = c.req.valid('json')

        const { content, attachments } = body

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

        // TRIGGER WEBHOOK
        if (conversation.workspaceId) {
            triggerWebhook('message.sent', {
                conversationId,
                message: newMessage,
                workspaceId: conversation.workspaceId
            }, conversation.workspaceId)
        }

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
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const messageId = c.req.param('msgId')
        const body = await c.req.json()

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

        // TRIGGER WEBHOOK
        if (conversation.workspaceId) {
            triggerWebhook('message.updated', {
                conversationId,
                message: messages[messageIndex],
                workspaceId: conversation.workspaceId
            }, conversation.workspaceId)
        }

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
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const messageId = c.req.param('msgId')

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

        // Soft delete message
        const messageIndex = messages.findIndex(m => m.id === messageId)
        if (messageIndex !== -1) {
            messages[messageIndex] = {
                ...messages[messageIndex],
                content: 'Usunięto wiadomość', // Placeholder content
                isDeleted: true,
                reactions: [], // clear reactions
                attachments: [] // clear attachments
            }
        }

        // Update conversation
        await db.update(conversations)
            .set({
                messages: messages,
                updatedAt: new Date()
            })
            .where(eq(conversations.id, conversationId))

        // TRIGGER WEBHOOK
        if (conversation.workspaceId) {
            triggerWebhook('message.deleted', {
                conversationId,
                messageId,
                message: messages[messageIndex],
                workspaceId: conversation.workspaceId
            }, conversation.workspaceId)
        }

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
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const body = await c.req.json()

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

// =============================================================================
// POST /api/conversations/:id/messages/:msgId/pin - Toggle pin status
// =============================================================================

conversationsRoutes.post('/:id/messages/:msgId/pin', async (c) => {
    try {
        const user = c.get('user')
        const userId = user.id
        const conversationId = c.req.param('id')
        const messageId = c.req.param('msgId')
        // Optional: Body to explicitly set state, otherwise toggle
        const body = await c.req.json().catch(() => ({}))
        const { isPinned } = body

        const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId))

        if (!conversation) {
            return c.json({ success: false, error: 'Conversation not found' }, 404)
        }

        const messages = (conversation.messages as ConversationMessage[]) || []
        const messageIndex = messages.findIndex(m => m.id === messageId)

        console.log(`[PIN] Toggling pin for msg: ${messageId} in conv: ${conversationId}`)
        console.log(`[PIN] Found index: ${messageIndex}. Total messages: ${messages.length}`)

        if (messageIndex === -1) {
            console.error('[PIN] Message not found in conversation')
            return c.json({ success: false, error: 'Message not found' }, 404)
        }

        // Toggle or set pin status
        const message = messages[messageIndex] as any
        const newPinState = typeof isPinned === 'boolean' ? isPinned : !message.isPinned
        message.isPinned = newPinState

        // Inject System Message
        const systemMessage = {
            id: crypto.randomUUID(),
            content: newPinState
                ? JSON.stringify({ type: 'system', action: 'pin', actorId: userId })
                : JSON.stringify({ type: 'system', action: 'unpin', actorId: userId }),
            senderId: 'system',
            timestamp: new Date().toISOString(),
            isSystem: true,
            reactions: [],
            edited: false
        }

        messages.push(systemMessage as any)

        // Update conversation
        await db.update(conversations)
            .set({
                messages,
                updatedAt: new Date()
            })
            .where(eq(conversations.id, conversationId))

        return c.json({ success: true, data: { isPinned: message.isPinned } })
    } catch (error) {
        console.error('Error toggling pin:', error)
        return c.json({ success: false, error: 'Failed to toggle pin' }, 500)
    }
})

export default conversationsRoutes
