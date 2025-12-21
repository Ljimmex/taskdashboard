import { pgTable, uuid, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// =============================================================================
// INDUSTRY TEMPLATES TABLE (System templates)
// =============================================================================

export const industryTemplates = pgTable('industry_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 50 }).notNull().unique(), // 'hr_hiring', 'software_dev'
    name: varchar('name', { length: 100 }).notNull(), // 'Rekrutacja (HR & Hiring)'
    nameEn: varchar('name_en', { length: 100 }), // English name
    description: text('description'),
    icon: varchar('icon', { length: 10 }), // emoji
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// INDUSTRY TEMPLATE STAGES (Predefined stages per template)
// =============================================================================

export const industryTemplateStages = pgTable('industry_template_stages', {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id').notNull().references(() => industryTemplates.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(), // Polish name
    nameEn: varchar('name_en', { length: 100 }), // English name
    color: varchar('color', { length: 7 }).default('#6B7280').notNull(),
    position: integer('position').notNull(),
    isFinal: boolean('is_final').default(false).notNull(), // marks "done" stages
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// PROJECT STAGES (Custom stages per project) - projectId added via relation
// =============================================================================

export const projectStages = pgTable('project_stages', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull(), // FK added in migration, not here to avoid circular
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }).default('#6B7280').notNull(),
    position: integer('position').notNull(),
    isFinal: boolean('is_final').default(false).notNull(), // marks completion stage
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

// =============================================================================
// RELATIONS
// =============================================================================

export const industryTemplatesRelations = relations(industryTemplates, ({ many }) => ({
    stages: many(industryTemplateStages),
}))

export const industryTemplateStagesRelations = relations(industryTemplateStages, ({ one }) => ({
    template: one(industryTemplates, { fields: [industryTemplateStages.templateId], references: [industryTemplates.id] }),
}))

// Note: projectStages relations defined in projects.ts to avoid circular dependency

// =============================================================================
// TYPES
// =============================================================================

export type IndustryTemplate = typeof industryTemplates.$inferSelect
export type NewIndustryTemplate = typeof industryTemplates.$inferInsert
export type IndustryTemplateStage = typeof industryTemplateStages.$inferSelect
export type NewIndustryTemplateStage = typeof industryTemplateStages.$inferInsert
export type ProjectStage = typeof projectStages.$inferSelect
export type NewProjectStage = typeof projectStages.$inferInsert
