import { pgTable, uuid, varchar, text, timestamp, pgEnum, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { teams } from './teams'
import { users } from './users'
import { industryTemplates, projectStages } from './pipelines'

// =============================================================================
// ENUMS
// =============================================================================

export const projectStatusEnum = pgEnum('project_status', ['pending', 'active', 'on_hold', 'completed', 'archived'])

// =============================================================================
// PROJECTS TABLE
// =============================================================================

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    industryTemplateId: uuid('industry_template_id').references(() => industryTemplates.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#F87171').notNull(), // Default coral color
    status: projectStatusEnum('status').default('active').notNull(),
    startDate: timestamp('start_date'),
    deadline: timestamp('deadline'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, () => [
    pgPolicy("Team members can view projects", {
        for: "select",
        using: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text))`,
    }),
    pgPolicy("Team members can create projects", {
        for: "insert",
        withCheck: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Team members can update projects", {
        for: "update",
        using: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text) OR id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text))`,
    }),
])

// =============================================================================
// PROJECT TEAMS JOIN TABLE (MANY-TO-MANY)
// =============================================================================

export const projectTeams = pgTable('project_teams', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, () => [
    pgPolicy("Team members can view project teams", {
        for: "select",
        using: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)`,
    }),
    pgPolicy("Team members can manage project teams", {
        for: "all",
        using: sql`team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)`,
    }),
])

// =============================================================================
// PROJECT MEMBERS TABLE
// =============================================================================

export const projectMembers = pgTable('project_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, () => [
    pgPolicy("Project members can view members", {
        for: "select",
        using: sql`project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)) OR project_id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text))`,
    }),
    pgPolicy("Project members can manage memberships", {
        for: "all",
        using: sql`project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)) OR project_id IN (SELECT project_id FROM project_teams WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text))`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
    team: one(teams, { fields: [projects.teamId], references: [teams.id] }), // Legacy/Primary Team
    projectTeams: many(projectTeams),
    industryTemplate: one(industryTemplates, { fields: [projects.industryTemplateId], references: [industryTemplates.id] }),
    stages: many(projectStages),
    members: many(projectMembers),
}))

export const projectTeamsRelations = relations(projectTeams, ({ one }) => ({
    project: one(projects, { fields: [projectTeams.projectId], references: [projects.id] }),
    team: one(teams, { fields: [projectTeams.teamId], references: [teams.id] }),
}))

export const projectStagesRelations = relations(projectStages, ({ one }) => ({
    project: one(projects, { fields: [projectStages.projectId], references: [projects.id] }),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
    project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
    user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectMember = typeof projectMembers.$inferSelect
export type NewProjectMember = typeof projectMembers.$inferInsert
