import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { teams } from './teams'
import { industryTemplates, projectStages } from './pipelines'

// =============================================================================
// ENUMS
// =============================================================================

export const projectStatusEnum = pgEnum('project_status', ['active', 'archived', 'completed'])

// =============================================================================
// PROJECTS TABLE
// =============================================================================

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    industryTemplateId: uuid('industry_template_id').references(() => industryTemplates.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    status: projectStatusEnum('status').default('active').notNull(),
    deadline: timestamp('deadline'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
    team: one(teams, { fields: [projects.teamId], references: [teams.id] }),
    industryTemplate: one(industryTemplates, { fields: [projects.industryTemplateId], references: [industryTemplates.id] }),
    stages: many(projectStages),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert

