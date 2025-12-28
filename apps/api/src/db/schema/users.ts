import { pgTable, varchar, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

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
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    birthDate: timestamp('birth_date'),
    gender: varchar('gender', { length: 50 }),
    position: varchar('position', { length: 100 }), // e.g. "Web Designer", "Programmer"
    role: userRoleEnum('role').default('member').notNull(),
    status: userStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastActiveAt: timestamp('last_active_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// =============================================================================
// TYPES
// =============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
