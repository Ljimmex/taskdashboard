import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { teams } from './teams'

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
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    status: projectStatusEnum('status').default('active').notNull(),
    deadline: timestamp('deadline'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const projectsRelations = relations(projects, ({ one }) => ({
    team: one(teams, { fields: [projects.teamId], references: [teams.id] }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
