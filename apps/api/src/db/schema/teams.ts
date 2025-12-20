import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// =============================================================================
// ENUMS
// =============================================================================

export const teamMemberRoleEnum = pgEnum('team_member_role', ['owner', 'admin', 'member'])

// =============================================================================
// TEAMS TABLE
// =============================================================================

export const teams = pgTable('teams', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// TEAM MEMBERS TABLE
// =============================================================================

export const teamMembers = pgTable('team_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: teamMemberRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const teamsRelations = relations(teams, ({ one, many }) => ({
    owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
    members: many(teamMembers),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
    team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
    user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert
