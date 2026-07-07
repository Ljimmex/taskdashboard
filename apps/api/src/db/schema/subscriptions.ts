import { pgTable, text, varchar, timestamp, integer, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { workspaces } from './workspaces'

// =============================================================================
// ENUMS
// =============================================================================

export const subscriptionEventTypeEnum = pgEnum('subscription_event_type', [
    'seat_added',
    'seat_removed',
    'plan_changed',
    'subscription_activated',
    'subscription_cancelled',
    'subscription_past_due',
    'payment_succeeded',
    'payment_failed',
])

export const invoiceStatusEnum = pgEnum('invoice_status', [
    'pending',
    'paid',
    'failed',
    'refunded',
    'void',
])

// =============================================================================
// SUBSCRIPTIONS TABLE
// =============================================================================

export const subscriptions = pgTable('subscriptions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),

    // Polar.sh identifiers
    polarSubscriptionId: text('polar_subscription_id').notNull().unique(),
    polarCustomerId: text('polar_customer_id').notNull(),
    polarProductId: text('polar_product_id'),
    polarPriceId: text('polar_price_id'),

    // Plan details
    plan: varchar('plan', { length: 50 }).notNull(), // free, plus, pro, enterprise
    status: varchar('status', { length: 50 }).notNull(), // active, cancelled, past_due, etc.

    // Billing cycle
    billingDay: integer('billing_day').notNull(),
    billingPeriod: varchar('billing_period', { length: 20 }), // month, quarter, year
    currentSeats: integer('current_seats').default(1).notNull(),
    seatPriceCents: integer('seat_price_cents').notNull(), // monthly seat price in cents
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),

    // Periods
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// =============================================================================
// SUBSCRIPTION EVENTS TABLE
// =============================================================================

export const subscriptionEvents = pgTable('subscription_events', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    subscriptionId: text('subscription_id')
        .notNull()
        .references(() => subscriptions.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),

    type: subscriptionEventTypeEnum('type').notNull(),
    seatsDelta: integer('seats_delta').default(0).notNull(), // +1 when added, -1 when removed
    seatsAfter: integer('seats_after').notNull(),

    // Prorated amount (in cents) for this event, if applicable
    amountCents: integer('amount_cents'),
    currency: varchar('currency', { length: 3 }),

    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// INVOICES TABLE
// =============================================================================

export const invoices = pgTable('invoices', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id')
        .references(() => subscriptions.id, { onDelete: 'set null' }),

    polarInvoiceId: text('polar_invoice_id').unique(),
    polarOrderId: text('polar_order_id'),

    status: invoiceStatusEnum('status').default('pending').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).default('USD').notNull(),

    periodStart: timestamp('period_start'),
    periodEnd: timestamp('period_end'),

    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),

    paidAt: timestamp('paid_at'),
    failedAt: timestamp('failed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// WEBHOOK LOGS
// =============================================================================

export const webhookLogs = pgTable('webhook_logs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    source: varchar('source', { length: 50 }).notNull(), // e.g. 'polar'
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload').$type<Record<string, any>>().default({}).notNull(),
    signatureValid: boolean('signature_valid').default(false).notNull(),
    processingError: text('processing_error'),
    workspaceId: text('workspace_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [subscriptions.workspaceId], references: [workspaces.id] }),
    events: many(subscriptionEvents),
    invoices: many(invoices),
}))

export const subscriptionEventsRelations = relations(subscriptionEvents, ({ one }) => ({
    subscription: one(subscriptions, { fields: [subscriptionEvents.subscriptionId], references: [subscriptions.id] }),
    workspace: one(workspaces, { fields: [subscriptionEvents.workspaceId], references: [workspaces.id] }),
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
    subscription: one(subscriptions, { fields: [invoices.subscriptionId], references: [subscriptions.id] }),
    workspace: one(workspaces, { fields: [invoices.workspaceId], references: [workspaces.id] }),
}))

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
    workspace: one(workspaces, { fields: [webhookLogs.workspaceId], references: [workspaces.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect
export type NewSubscriptionEvent = typeof subscriptionEvents.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
export type WebhookLog = typeof webhookLogs.$inferSelect
export type NewWebhookLog = typeof webhookLogs.$inferInsert
