import { pgTable, varchar, text, timestamp, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// =============================================================================
// BETTER AUTH TABLES
// =============================================================================

/**
 * Sessions table - stores active user sessions
 */
export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Users can view own sessions", {
        for: "select",
        using: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Users can delete own sessions", {
        for: "delete",
        using: sql`user_id = auth.uid()::text`,
    }),
])

/**
 * Accounts table - stores OAuth provider connections
 */
export const accounts = pgTable('accounts', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Users can view own accounts", {
        for: "select",
        using: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Users can delete own accounts", {
        for: "delete",
        using: sql`user_id = auth.uid()::text`,
    }),
])

/**
 * Verifications table - email verification, password reset tokens
 */
export const verifications = pgTable('verifications', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Backend can manage verifications", {
        for: "all",
        using: sql`true`,
    }),
])

export const twoFactors = pgTable('two_factors', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(), // stored as comma-separated or JSON string usually
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Users can view own two factor", {
        for: "select",
        using: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Users can update own two factor", {
        for: "update",
        using: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Users can insert own two factor", {
        for: "insert",
        withCheck: sql`user_id = auth.uid()::text`,
    }),
])

// =============================================================================
// TYPES
// =============================================================================

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert
export type TwoFactor = typeof twoFactors.$inferSelect
export type NewTwoFactor = typeof twoFactors.$inferInsert
