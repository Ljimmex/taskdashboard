import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

// =============================================================================
// ENUMS
// =============================================================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'member'])
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending'])

// =============================================================================
// USERS TABLE
// =============================================================================

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').default('member').notNull(),
    status: userStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// =============================================================================
// TYPES
// =============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
