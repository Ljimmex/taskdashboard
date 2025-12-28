import { pgTable, text, varchar, timestamp, jsonb, pgEnum, boolean, uuid } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'
import { teams } from './teams'

// =============================================================================
// ENUMS
// =============================================================================

export const roleTypeEnum = pgEnum('role_type', [
    'global',      // Workspace-wide role
    'team'         // Team-specific role
])

export const roleLevelEnum = pgEnum('role_level', [
    // Global Workspace Levels
    'owner',           // Właściciel firmy
    'admin',           // Administrator workspace
    'project_manager', // Manager projektów
    'hr_manager',      // HR / Manager
    'member',          // Zwykły członek
    // Team Levels
    'team_lead',       // Lider zespołu
    'senior',          // Senior
    'mid',             // Mid-level
    'junior',          // Junior
    'intern'           // Stażysta
])

// =============================================================================
// ROLES TABLE
// =============================================================================

export const roles = pgTable('roles', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

    // Basic Info
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // Type & Scope
    type: roleTypeEnum('type').notNull(),
    level: roleLevelEnum('level').notNull(),

    // Scope (workspace for global, workspace+team for team-specific)
    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
        .references(() => teams.id, { onDelete: 'cascade' }), // NULL for global roles

    // Permissions (granular control)
    permissions: jsonb('permissions').$type<{
        // Workspace permissions
        workspace?: {
            manageSettings?: boolean
            manageBilling?: boolean
            manageMembers?: boolean
            deleteWorkspace?: boolean
        }
        // Team permissions
        teams?: {
            create?: boolean
            update?: boolean
            delete?: boolean
            manageMembers?: boolean
            viewAll?: boolean // Can see all teams
        }
        // Project permissions
        projects?: {
            create?: boolean
            update?: boolean
            delete?: boolean
            manageMembers?: boolean
            viewAll?: boolean
        }
        // Task permissions
        tasks?: {
            create?: boolean
            update?: boolean
            delete?: boolean
            assign?: boolean
            complete?: boolean
            viewAll?: boolean
        }
        // Comment permissions
        comments?: {
            create?: boolean    // Tworzenie komentarzy
            update?: boolean    // Edycja swoich komentarzy
            delete?: boolean    // Usuwanie swoich komentarzy
            moderate?: boolean  // Usuwanie/edycja cudzych komentarzy
        }
        // Label permissions
        labels?: {
            create?: boolean
            update?: boolean
            delete?: boolean
        }
        // Project stages (Kanban) permissions
        stages?: {
            create?: boolean
            update?: boolean
            delete?: boolean
            reorder?: boolean
        }
        // Time tracking permissions
        timeTracking?: {
            create?: boolean    // Tworzenie wpisów
            update?: boolean    // Edycja swoich wpisów
            delete?: boolean    // Usuwanie swoich wpisów
            viewAll?: boolean   // Widok wszystkich wpisów
            manage?: boolean    // Zarządzanie cudzymi wpisami
        }
        // File permissions
        files?: {
            upload?: boolean
            download?: boolean
            delete?: boolean
        }
        // Advanced
        analytics?: {
            view?: boolean
            export?: boolean
        }
        apiAccess?: boolean
        [key: string]: any
    }>().notNull(),

    // Metadata
    isSystem: boolean('is_system').default(false).notNull(), // System roles can't be deleted
    isActive: boolean('is_active').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// =============================================================================
// USER ROLES (assigns roles to users)
// =============================================================================

export const userRoles = pgTable('user_roles', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

    userId: text('user_id').notNull(), // FK to users
    roleId: text('role_id')
        .notNull()
        .references(() => roles.id, { onDelete: 'cascade' }),

    workspaceId: text('workspace_id')
        .notNull()
        .references(() => workspaces.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
        .references(() => teams.id, { onDelete: 'cascade' }), // NULL for global roles

    // Metadata
    assignedBy: text('assigned_by'), // FK to users
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
})

// =============================================================================
// PREDEFINED SYSTEM ROLES
// =============================================================================

export const SYSTEM_ROLES = {
    // =============================================================================
    // GLOBAL WORKSPACE ROLES
    // =============================================================================

    OWNER: {
        name: 'Owner',
        description: 'Właściciel firmy - pełna kontrola',
        type: 'global' as const,
        level: 'owner' as const,
        permissions: {
            workspace: {
                manageSettings: true,
                manageBilling: true,
                manageMembers: true,
                deleteWorkspace: true,
            },
            teams: {
                create: true,
                update: true,
                delete: true,
                manageMembers: true,
                viewAll: true,
            },
            projects: {
                create: true,
                update: true,
                delete: true,
                manageMembers: true,
                viewAll: true,
            },
            tasks: {
                create: true,
                update: true,
                delete: true,
                assign: true,
                complete: true,
                viewAll: true,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
                moderate: true,
            },
            labels: {
                create: true,
                update: true,
                delete: true,
            },
            stages: {
                create: true,
                update: true,
                delete: true,
                reorder: true,
            },
            timeTracking: {
                create: true,
                update: true,
                delete: true,
                viewAll: true,
                manage: true,
            },
            files: {
                upload: true,
                download: true,
                delete: true,
            },
            analytics: {
                view: true,
                export: true,
            },
            apiAccess: true,
        },
    },

    ADMIN: {
        name: 'Admin',
        description: 'Administrator - zarządzanie workspace bez billing',
        type: 'global' as const,
        level: 'admin' as const,
        permissions: {
            workspace: {
                manageSettings: true,
                manageBilling: false,
                manageMembers: true,
                deleteWorkspace: false,
            },
            teams: {
                create: true,
                update: true,
                delete: true,
                manageMembers: true,
                viewAll: true,
            },
            projects: {
                create: true,
                update: true,
                delete: true,
                manageMembers: true,
                viewAll: true,
            },
            tasks: {
                create: true,
                update: true,
                delete: true,
                assign: true,
                complete: true,
                viewAll: true,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
                moderate: true,
            },
            labels: {
                create: true,
                update: true,
                delete: true,
            },
            stages: {
                create: true,
                update: true,
                delete: true,
                reorder: true,
            },
            timeTracking: {
                create: true,
                update: true,
                delete: true,
                viewAll: true,
                manage: true,
            },
            files: {
                upload: true,
                download: true,
                delete: true,
            },
            analytics: {
                view: true,
                export: true,
            },
            apiAccess: false,
        },
    },

    PROJECT_MANAGER: {
        name: 'Project Manager',
        description: 'Manager projektów - focus na projekty i taski',
        type: 'global' as const,
        level: 'project_manager' as const,
        permissions: {
            workspace: {
                manageSettings: false,
                manageBilling: false,
                manageMembers: false,
                deleteWorkspace: false,
            },
            teams: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: true, // Widzi wszystkie zespoły
            },
            projects: {
                create: true,
                update: true,
                delete: true,
                manageMembers: true,
                viewAll: true,
            },
            tasks: {
                create: true,
                update: true,
                delete: true,
                assign: true,
                complete: true,
                viewAll: true,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
                moderate: true,
            },
            labels: {
                create: true,
                update: true,
                delete: true,
            },
            stages: {
                create: true,
                update: true,
                delete: true,
                reorder: true,
            },
            timeTracking: {
                create: true,
                update: true,
                delete: true,
                viewAll: true,
                manage: false,
            },
            files: {
                upload: true,
                download: true,
                delete: false,
            },
            analytics: {
                view: true,
                export: true,
            },
            apiAccess: false,
        },
    },

    HR_MANAGER: {
        name: 'HR / Manager',
        description: 'HR Manager - zarządzanie ludźmi i zespołami',
        type: 'global' as const,
        level: 'hr_manager' as const,
        permissions: {
            workspace: {
                manageSettings: false,
                manageBilling: false,
                manageMembers: true, // Może zarządzać członkami
                deleteWorkspace: false,
            },
            teams: {
                create: true,
                update: true,
                delete: false,
                manageMembers: true, // Główna kompetencja
                viewAll: true,
            },
            projects: {
                create: false,
                update: false,
                delete: false,
                manageMembers: true, // Może przypisywać ludzi
                viewAll: true,
            },
            tasks: {
                create: false,
                update: false,
                delete: false,
                assign: true, // Może przypisywać zadania
                complete: false,
                viewAll: true,
            },
            comments: {
                create: true,
                update: true,
                delete: false,
                moderate: false,
            },
            labels: {
                create: false,
                update: false,
                delete: false,
            },
            stages: {
                create: false,
                update: false,
                delete: false,
                reorder: false,
            },
            timeTracking: {
                create: true,
                update: true,
                delete: true,
                viewAll: true,
                manage: false,
            },
            files: {
                upload: true,
                download: true,
                delete: false,
            },
            analytics: {
                view: true, // Widzi metryki zespołowe
                export: true,
            },
            apiAccess: false,
        },
    },

    WORKSPACE_MEMBER: {
        name: 'Member',
        description: 'Zwykły członek workspace',
        type: 'global' as const,
        level: 'member' as const,
        permissions: {
            workspace: {
                manageSettings: false,
                manageBilling: false,
                manageMembers: false,
                deleteWorkspace: false,
            },
            teams: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false, // Widzi tylko swoje zespoły
            },
            projects: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            tasks: {
                create: true,
                update: true, // Tylko swoje taski
                delete: false,
                assign: false,
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true, // Tylko swoje
                delete: true, // Tylko swoje
                moderate: false,
            },
            labels: {
                create: false,
                update: false,
                delete: false,
            },
            stages: {
                create: false,
                update: false,
                delete: false,
                reorder: false,
            },
            timeTracking: {
                create: true,
                update: true, // Tylko swoje
                delete: true, // Tylko swoje
                viewAll: false,
                manage: false,
            },
            files: {
                upload: true,
                download: true,
                delete: false,
            },
            analytics: {
                view: false,
                export: false,
            },
            apiAccess: false,
        },
    },

    // =============================================================================
    // TEAM-SPECIFIC ROLES
    // =============================================================================

    TEAM_LEAD: {
        name: 'Team Lead',
        description: 'Lider zespołu - zarządza zespołem i projektami',
        type: 'team' as const,
        level: 'team_lead' as const,
        permissions: {
            teams: {
                create: false,
                update: true, // Może edytować swój zespół
                delete: false,
                manageMembers: true, // Zarządza członkami zespołu
                viewAll: false,
            },
            projects: {
                create: true,
                update: true,
                delete: true,
                manageMembers: true,
                viewAll: false, // Tylko projekty zespołu
            },
            tasks: {
                create: true,
                update: true,
                delete: true,
                assign: true, // Może przypisywać zadania
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
                moderate: true, // Team lead może moderować
            },
            labels: {
                create: true,
                update: true,
                delete: true,
            },
            stages: {
                create: true,
                update: true,
                delete: true,
                reorder: true,
            },
            timeTracking: {
                create: true,
                update: true,
                delete: true,
                viewAll: true, // Widzi czas zespołu
                manage: true, // Może zarządzać czasem zespołu
            },
            files: {
                upload: true,
                download: true,
                delete: true,
            },
            analytics: {
                view: true, // Widzi metryki zespołu
                export: false,
            },
            apiAccess: false,
        },
    },

    SENIOR: {
        name: 'Senior',
        description: 'Senior developer - pełne uprawnienia techniczne',
        type: 'team' as const,
        level: 'senior' as const,
        permissions: {
            teams: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            projects: {
                create: false,
                update: true, // Może modyfikować projekty
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            tasks: {
                create: true,
                update: true,
                delete: true, // Senior może usuwać taski
                assign: true, // Może przypisywać zadania juniorom
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
                moderate: true, // Senior może moderować
            },
            labels: {
                create: true,
                update: true,
                delete: false,
            },
            stages: {
                create: false,
                update: true,
                delete: false,
                reorder: true,
            },
            timeTracking: {
                create: true,
                update: true,
                delete: true,
                viewAll: false,
                manage: false,
            },
            files: {
                upload: true,
                download: true,
                delete: true,
            },
            analytics: {
                view: true,
                export: false,
            },
            apiAccess: false,
        },
    },

    MID: {
        name: 'Mid',
        description: 'Mid-level developer - standardowe uprawnienia',
        type: 'team' as const,
        level: 'mid' as const,
        permissions: {
            teams: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            projects: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            tasks: {
                create: true,
                update: true,
                delete: false, // Mid nie może usuwać
                assign: false,
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true, // Tylko swoje
                delete: true, // Tylko swoje
                moderate: false,
            },
            labels: {
                create: false,
                update: false,
                delete: false,
            },
            stages: {
                create: false,
                update: false,
                delete: false,
                reorder: false,
            },
            timeTracking: {
                create: true,
                update: true, // Tylko swoje
                delete: true, // Tylko swoje
                viewAll: false,
                manage: false,
            },
            files: {
                upload: true,
                download: true,
                delete: false,
            },
            analytics: {
                view: false,
                export: false,
            },
            apiAccess: false,
        },
    },

    JUNIOR: {
        name: 'Junior',
        description: 'Junior developer - ograniczone uprawnienia',
        type: 'team' as const,
        level: 'junior' as const,
        permissions: {
            teams: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            projects: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            tasks: {
                create: true, // Może tworzyć taski
                update: true, // Może edytować swoje
                delete: false,
                assign: false,
                complete: true, // Może oznaczać jako done
                viewAll: false,
            },
            comments: {
                create: true,
                update: true, // Tylko swoje
                delete: true, // Tylko swoje
                moderate: false,
            },
            labels: {
                create: false,
                update: false,
                delete: false,
            },
            stages: {
                create: false,
                update: false,
                delete: false,
                reorder: false,
            },
            timeTracking: {
                create: true,
                update: true, // Tylko swoje
                delete: true, // Tylko swoje
                viewAll: false,
                manage: false,
            },
            files: {
                upload: true,
                download: true,
                delete: false,
            },
            analytics: {
                view: false,
                export: false,
            },
            apiAccess: false,
        },
    },

    INTERN: {
        name: 'Intern',
        description: 'Stażysta - minimalne uprawnienia, głównie odczyt',
        type: 'team' as const,
        level: 'intern' as const,
        permissions: {
            teams: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            projects: {
                create: false,
                update: false,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            tasks: {
                create: false, // Nie może tworzyć tasków
                update: true, // Może edytować przypisane do niego
                delete: false,
                assign: false,
                complete: true, // Może oznaczać swoje jako done
                viewAll: false,
            },
            comments: {
                create: true,
                update: true, // Tylko swoje
                delete: false, // Nie może usuwać
                moderate: false,
            },
            labels: {
                create: false,
                update: false,
                delete: false,
            },
            stages: {
                create: false,
                update: false,
                delete: false,
                reorder: false,
            },
            timeTracking: {
                create: true,
                update: true, // Tylko swoje
                delete: false, // Nie może usuwać
                viewAll: false,
                manage: false,
            },
            files: {
                upload: true, // Może uploadować pliki
                download: true,
                delete: false,
            },
            analytics: {
                view: false,
                export: false,
            },
            apiAccess: false,
        },
    },
} as const

// =============================================================================
// TYPES
// =============================================================================

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert
