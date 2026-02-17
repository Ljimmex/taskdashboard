import { pgTable, varchar, text, timestamp, boolean, pgEnum, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// =============================================================================
// ENUMS
// =============================================================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'member'])
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending'])

// =============================================================================
// USERS TABLE (Compatible with Better Auth)
// =============================================================================

export const users = pgTable('users', {
    id: text('id').primaryKey(), // Better Auth generates string IDs
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    name: varchar('name', { length: 255 }),
    image: text('image'),
    // Custom fields
    phoneNumber: varchar('phone_number', { length: 20 }),
    phoneNumberVerified: boolean('phone_number_verified').default(false).notNull(),
    twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
    
    // E2E Encryption Keys
    publicKey: text('public_key'), // PEM format
    encryptedPrivateKey: text('encrypted_private_key'), // Encrypted with user password (client-side)
    keySalt: text('key_salt'), // Salt for password -> key derivation
    keyIv: text('key_iv'), // IV for private key encryption

    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    description: text('description'),
    birthDate: timestamp('birth_date'),
    gender: varchar('gender', { length: 50 }),
    position: varchar('position', { length: 100 }), // e.g. "Web Designer", "Programmer"
    city: varchar('city', { length: 100 }), // Location - City
    country: varchar('country', { length: 100 }), // Location - Country
    timezone: varchar('timezone', { length: 100 }),
    role: userRoleEnum('role').default('member').notNull(),
    status: userStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastActiveAt: timestamp('last_active_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Users can view own profile", {
        for: "select",
        using: sql`auth.uid()::text = id`,
    }),
    pgPolicy("Users can update own profile", {
        for: "update",
        using: sql`auth.uid()::text = id`,
    }),
])

// =============================================================================
// TYPES
// =============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
