import { pgTable, uuid, text, varchar, timestamp, boolean, jsonb, pgPolicy } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { workspaces } from './workspaces'
import { users } from './users'

// =============================================================================
// SAVED FILTERS TABLE (Filter Presets)
// =============================================================================

// FilterState type - matches frontend FilterState interface
export interface SavedFilterState {
    assignedToMe?: boolean
    overdue?: boolean
    priorities?: string[]
    statuses?: string[]
    labels?: string[]
    assigneeIds?: string[]
    dueDateRange?: 'all' | 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'no_date'
}

export const savedFilters = pgTable('saved_filters', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Ownership
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    // Filter data
    name: varchar('name', { length: 100 }).notNull(),
    filters: jsonb('filters').$type<SavedFilterState>().notNull(),

    // Settings
    isDefault: boolean('is_default').default(false).notNull(),
    isShared: boolean('is_shared').default(false).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (_table) => [
    pgPolicy("Users can view own filters or shared filters", {
        for: "select",
        using: sql`user_id = auth.uid()::text OR is_shared = true`,
    }),
    pgPolicy("Users can create own filters", {
        for: "insert",
        withCheck: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Users can update own filters", {
        for: "update",
        using: sql`user_id = auth.uid()::text`,
    }),
    pgPolicy("Users can delete own filters", {
        for: "delete",
        using: sql`user_id = auth.uid()::text`,
    }),
])

// =============================================================================
// RELATIONS
// =============================================================================

export const savedFiltersRelations = relations(savedFilters, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [savedFilters.workspaceId],
        references: [workspaces.id]
    }),
    user: one(users, {
        fields: [savedFilters.userId],
        references: [users.id]
    }),
}))

// =============================================================================
// TYPES
// =============================================================================

export type SavedFilter = typeof savedFilters.$inferSelect
export type NewSavedFilter = typeof savedFilters.$inferInsert
