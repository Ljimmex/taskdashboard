import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, pgEnum, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { workspaces } from './workspaces'
import { users } from './users'

// =============================================================================
// ENUMS
// =============================================================================

export const webhookStatusEnum = pgEnum('webhook_queue_status', [
    'pending',
    'processing',
    'failed',
    'completed'
])

export const webhookTypeEnum = pgEnum('webhook_type', [
    'generic',
    'discord',
    'slack'
])

// =============================================================================
// WEBHOOKS CONFIGURATION TABLE
// =============================================================================

export const webhooks = pgTable('webhooks', {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    type: webhookTypeEnum('type').default('generic').notNull(),
    secret: text('secret').notNull(), // Shared secret for HMAC signing
    events: jsonb('events').$type<string[]>().default([]).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    description: text('description'),
    failureCount: integer('failure_count').default(0).notNull(), // For circuit breaking
    createdBy: text('created_by')
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Workspace members can view webhooks", {
        for: "select",
        using: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Workspace admins can manage webhooks", {
        for: "all",
        using: sql`workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text AND role IN ('owner', 'admin'))`,
    }),
])

// =============================================================================
// WEBHOOK QUEUE TABLE (Persistent Job Queue)
// =============================================================================

export const webhookQueue = pgTable('webhook_queue', {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id')
        .notNull()
        .references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    payload: jsonb('payload').notNull(),
    status: webhookStatusEnum('status').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    nextRunAt: timestamp('next_run_at').defaultNow().notNull(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    // Internal queue - usually no RLS or restricted to service role
    // Adding workspace-based RLS for visibility in logs/debugging if needed
    pgPolicy("Workspace members can view their webhook jobs", {
        for: "select",
        using: sql`webhook_id IN (SELECT id FROM webhooks WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text))`,
    }),
])

// =============================================================================
// WEBHOOK DELIVERIES TABLE (Logs)
// =============================================================================

export const webhookDeliveries = pgTable('webhook_deliveries', {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id')
        .notNull()
        .references(() => webhooks.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    payload: jsonb('payload').notNull(),
    requestHeaders: jsonb('request_headers'),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    durationMs: integer('duration_ms'),
    attemptIndex: integer('attempt_index').default(0).notNull(), // Which attempt was this
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Workspace members can view delivery logs", {
        for: "select",
        using: sql`webhook_id IN (SELECT id FROM webhooks WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()::text))`,
    }),
])

// =============================================================================
// TYPES
// =============================================================================

export type Webhook = typeof webhooks.$inferSelect
export type NewWebhook = typeof webhooks.$inferInsert
export type WebhookJob = typeof webhookQueue.$inferSelect
export type NewWebhookJob = typeof webhookQueue.$inferInsert
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert
