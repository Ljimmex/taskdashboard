import { pgTable, text, varchar, timestamp, jsonb, pgEnum, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'

// =============================================================================
// ENUMS
// =============================================================================

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
    'free',
    'starter',
    'professional',
    'enterprise'
])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
    'active',
    'trial',
    'expired',
    'cancelled',
    'past_due'
])

// =============================================================================
// WORKSPACES TABLE
// =============================================================================

export const workspaces = pgTable('workspaces', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

    // Basic Info
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    logo: text('logo'), // URL to logo image
    website: varchar('website', { length: 500 }),
    industry: varchar('industry', { length: 100 }), // e.g. "IT", "Marketing"
    teamSize: varchar('team_size', { length: 50 }), // e.g. "1-10", "11-50"

    // Ownership
    ownerId: text('owner_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    // Subscription & Billing
    subscriptionPlan: subscriptionPlanEnum('subscription_plan').default('free').notNull(),
    subscriptionStatus: subscriptionStatusEnum('subscription_status').default('trial').notNull(),
    trialEndsAt: timestamp('trial_ends_at'),
    billingEmail: varchar('billing_email', { length: 255 }),

    // Limits (enforced by plan)
    maxMembers: integer('max_members').default(5).notNull(), // Free: 5, Starter: 10, Pro: 50, Enterprise: unlimited
    maxProjects: integer('max_projects').default(3).notNull(),
    maxStorageGB: integer('max_storage_gb').default(1).notNull(), // GB

    // Features (JSON flags)
    features: jsonb('features').$type<{
        customBranding?: boolean
        advancedReporting?: boolean
        apiAccess?: boolean
        ssoEnabled?: boolean
        prioritySupport?: boolean
        [key: string]: any
    }>().default({
        customBranding: false,
        advancedReporting: false,
        apiAccess: false,
        ssoEnabled: false,
        prioritySupport: false
    }),

    // Settings
    settings: jsonb('settings').$type<{
        defaultLanguage?: string
        timezone?: string
        dateFormat?: string
        timeFormat?: '12h' | '24h'
        weekStartsOn?: 'monday' | 'sunday'
        currency?: string
        workingHours?: {
            start: string // e.g., "09:00"
            end: string   // e.g., "17:00"
        }
        notifications?: {
            email?: boolean
            inApp?: boolean
        }
        [key: string]: any
    }>().default({
        defaultLanguage: 'pl',
        timezone: 'Europe/Warsaw',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        weekStartsOn: 'monday',
        currency: 'PLN',
        notifications: {
            email: true,
            inApp: true
        }
    }),

    // Metadata
    isActive: boolean('is_active').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// =============================================================================
// WORKSPACE MEMBERS (M:N relationship between workspaces and users)
// =============================================================================

export const workspaceRoleEnum = pgEnum('workspace_role', [
    'owner',           // Właściciel - pełna kontrola, może usunąć workspace
    'admin',           // Administrator - zarządzanie bez billing
    'project_manager', // Manager projektów - focus na projekty
    'hr_manager',      // HR Manager - zarządzanie ludźmi
    'member',          // Zwykły członek
    'guest'            // Gość - ograniczony dostęp
])

export const workspaceMembers = pgTable('workspace_members', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').default('member').notNull(),
    invitedBy: text('invited_by').references(() => users.id),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
})

// =============================================================================
// TYPES
// =============================================================================

export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert
export type WorkspaceMember = typeof workspaceMembers.$inferSelect
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert
