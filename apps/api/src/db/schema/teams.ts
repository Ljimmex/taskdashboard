import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { workspaces } from './workspaces'

// =============================================================================
// ENUMS
// =============================================================================

export const teamMemberRoleEnum = pgEnum('team_member_role', ['owner', 'admin', 'member'])

// =============================================================================
// TEAMS TABLE
// =============================================================================

export const teams = pgTable('teams', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Workspace relationship (hierarchical)
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),

    // Team info
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    avatarUrl: text('avatar_url'),
    color: varchar('color', { length: 7 }).default('#3B82F6').notNull(), // Hex color for UI

    // Ownership (DEPRECATED - use team_members with owner role instead)
    // Keeping for backward compatibility
    ownerId: text('owner_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// TEAM MEMBERS TABLE
// =============================================================================

export const teamMembers = pgTable('team_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: teamMemberRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const teamsRelations = relations(teams, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [teams.workspaceId], references: [workspaces.id] }),
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
