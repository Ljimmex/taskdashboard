import { pgTable, uuid, varchar, text, timestamp, pgEnum, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'
import { teams } from './teams'

// =============================================================================
// ENUMS
// =============================================================================

export const conversationTypeEnum = pgEnum('conversation_type', ['direct', 'group', 'channel'])

// =============================================================================
// CONVERSATIONS TABLE
// =============================================================================

export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }),
    type: conversationTypeEnum('type').default('direct').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Team members can view conversations", {
        for: "select",
        using: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Team members can create conversations", {
        for: "insert",
        withCheck: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)`,
    }),
])

// =============================================================================
// MESSAGES TABLE
// =============================================================================

export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').notNull().references(() => users.id),
    content: text('content').notNull(),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Team members can view messages", {
        for: "select",
        using: sql`conversation_id IN (
            SELECT id FROM conversations WHERE team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
            )
        )`,
    }),
    pgPolicy("Team members can send messages", {
        for: "insert",
        withCheck: sql`sender_id = auth.uid()::text`,
    }),
    pgPolicy("Sender can delete own messages", {
        for: "delete",
        using: sql`sender_id = auth.uid()::text`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    team: one(teams, { fields: [conversations.teamId], references: [teams.id] }),
    messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
    sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
