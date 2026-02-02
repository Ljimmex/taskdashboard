import { pgTable, uuid, varchar, text, timestamp, pgEnum, pgPolicy, jsonb, boolean } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'
import { teams } from './teams'

// =============================================================================
// ENUMS
// =============================================================================

export const conversationTypeEnum = pgEnum('conversation_type', ['direct', 'group', 'channel'])

// =============================================================================
// CONVERSATIONS TABLE (with JSONB messages)
// =============================================================================

export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id'), // For workspace-level conversations
    name: varchar('name', { length: 100 }),
    description: text('description'),
    type: conversationTypeEnum('type').default('direct').notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),

    // JSONB array of message objects
    messages: jsonb('messages').default([]).$type<Array<{
        id: string
        senderId: string
        content: string
        timestamp: string
        edited: boolean
        editedAt?: string
        reactions: Array<{ emoji: string; userId: string }>
        attachments: Array<{ id: string; url: string; name: string; size?: number; mimeType?: string }>
        replyToId?: string
        isPinned?: boolean
        isDeleted?: boolean
        isSystem?: boolean
    }>>(),

    // JSONB array of participant user IDs
    participants: jsonb('participants').default([]).$type<string[]>(),

    // JSONB object mapping userId -> { readAt: string, deliveredAt: string }
    participantStates: jsonb('participant_states').default({}).$type<Record<string, { readAt?: string, deliveredAt?: string }>>(),

    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastMessageAt: timestamp('last_message_at'),
}, (_table) => [
    // RLS Policy: Members can view conversations they're part of
    pgPolicy("Members can view their conversations", {
        for: "select",
        using: sql`auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants)) OR created_by = auth.uid()::text`,
    }),
    // RLS Policy: Members can update (add messages to) their conversations
    pgPolicy("Members can add messages to their conversations", {
        for: "update",
        using: sql`auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants)) OR created_by = auth.uid()::text`,
    }),
    // RLS Policy: Workspace members can create conversations
    pgPolicy("Workspace members can create conversations", {
        for: "insert",
        withCheck: sql`EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = conversations.workspace_id AND user_id = auth.uid()::text)`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const conversationsRelations = relations(conversations, ({ one }) => ({
    team: one(teams, { fields: [conversations.teamId], references: [teams.id] }),
    createdByUser: one(users, { fields: [conversations.createdBy], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

// JSONB Message Type
export interface ConversationMessage {
    id: string
    senderId: string
    content: string
    timestamp: string
    edited: boolean
    editedAt?: string
    reactions: Array<{ emoji: string; userId: string }>
    attachments: Array<{
        id: string
        url: string
        name: string
        size?: number
        mimeType?: string
    }>
    replyToId?: string
    isPinned?: boolean
    isDeleted?: boolean
    isSystem?: boolean
}
