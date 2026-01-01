import { pgTable, uuid, varchar, text, timestamp, pgEnum, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'
import { workspaces } from './workspaces'
import { projects } from './projects'

// =============================================================================
// ENUMS
// =============================================================================

// Team Levels - hierarchy within a team
export const teamLevelEnum = pgEnum('team_level', ['team_lead', 'senior', 'mid', 'junior', 'intern'])

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
}, (_table) => [
    pgPolicy("Team members can view teams", {
        for: "select",
        using: sql`id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR owner_id = auth.uid()::text`,
    }),
    pgPolicy("Owners can update teams", {
        for: "update",
        using: sql`owner_id = auth.uid()::text`,
    }),
    pgPolicy("Owners can delete teams", {
        for: "delete",
        using: sql`owner_id = auth.uid()::text`,
    }),
    pgPolicy("Authenticated users can create teams", {
        for: "insert",
        withCheck: sql`auth.uid() IS NOT NULL`,
    }),
])

// =============================================================================
// TEAM MEMBERS TABLE
// =============================================================================

export const teamMembers = pgTable('team_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // Team level - hierarchy within the team (team_lead, senior, mid, junior, intern)
    teamLevel: teamLevelEnum('team_level').default('junior').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Members can view team members", {
        for: "select",
        using: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Admins can insert members", {
        for: "insert",
        withCheck: sql`team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()::text
            UNION
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text AND team_level IN ('team_lead', 'senior')
        )`,
    }),
    pgPolicy("Admins can delete members", {
        for: "delete",
        using: sql`team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()::text
            UNION
            SELECT team_id FROM team_members WHERE user_id = auth.uid()::text AND team_level IN ('team_lead', 'senior')
        )`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const teamsRelations = relations(teams, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [teams.workspaceId], references: [workspaces.id] }),
    owner: one(users, { fields: [teams.ownerId], references: [users.id] }),
    members: many(teamMembers),
    projects: many(projects),
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
