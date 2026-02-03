// =============================================================================
// SYSTEM ROLES - Permission Definitions (Code-based, not database tables)
// =============================================================================
// 
// NOTE: Roles are NOT stored in a separate database table. Instead:
// - workspaceMembers.role uses workspaceRoleEnum (workspaces.ts)
// - teamMembers.teamLevel uses teamLevelEnum (teams.ts)
// - This file defines the permission mappings for those roles
// =============================================================================

// Permission structure type
export interface RolePermissions {
    workspace?: {
        manageSettings?: boolean
        manageBilling?: boolean
        manageMembers?: boolean
        deleteWorkspace?: boolean
    }
    teams?: {
        create?: boolean
        update?: boolean
        delete?: boolean
        manageMembers?: boolean
        viewAll?: boolean
    }
    projects?: {
        create?: boolean
        update?: boolean
        delete?: boolean
        manageMembers?: boolean
        viewAll?: boolean
    }
    tasks?: {
        create?: boolean
        update?: boolean
        delete?: boolean
        assign?: boolean
        complete?: boolean
        viewAll?: boolean
    }
    comments?: {
        create?: boolean
        update?: boolean
        delete?: boolean
        moderate?: boolean
    }
    labels?: {
        create?: boolean
        update?: boolean
        delete?: boolean
    }
    stages?: {
        create?: boolean
        update?: boolean
        delete?: boolean
        reorder?: boolean
    }
    timeTracking?: {
        create?: boolean
        update?: boolean
        delete?: boolean
        viewAll?: boolean
        manage?: boolean
    }
    files?: {
        upload?: boolean
        download?: boolean
        delete?: boolean
    }
    analytics?: {
        view?: boolean
        export?: boolean
    }
    webhooks?: {
        manage?: boolean
        viewLogs?: boolean
    }
    calendar?: {
        createEvents?: boolean
        manageEvents?: boolean
    }
    invitations?: {
        manage?: boolean
    }
    conversations?: {
        createChannels?: boolean // include private/groups
        manageChannels?: boolean // rename/archive
    }
    apiAccess?: boolean
}

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
            webhooks: {
                manage: true,
                viewLogs: true,
            },
            calendar: {
                createEvents: true,
                manageEvents: true,
            },
            invitations: {
                manage: true,
            },
            conversations: {
                createChannels: true,
                manageChannels: true,
            },
            apiAccess: true,
        } as RolePermissions,
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
            webhooks: {
                manage: true,
                viewLogs: true,
            },
            calendar: {
                createEvents: true,
                manageEvents: true,
            },
            invitations: {
                manage: true,
            },
            conversations: {
                createChannels: true,
                manageChannels: true,
            },
            apiAccess: false,
        } as RolePermissions,
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
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: true,
                manageEvents: true,
            },
            invitations: {
                manage: false,
            },
            conversations: {
                createChannels: true,
                manageChannels: true,
            },
            apiAccess: false,
        } as RolePermissions,
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
                manageMembers: true,
                deleteWorkspace: false,
            },
            teams: {
                create: true,
                update: true,
                delete: false,
                manageMembers: true,
                viewAll: true,
            },
            projects: {
                create: false,
                update: false,
                delete: false,
                manageMembers: true,
                viewAll: true,
            },
            tasks: {
                create: false,
                update: false,
                delete: false,
                assign: true,
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
                view: true,
                export: true,
            },
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: true,
                manageEvents: true,
            },
            invitations: {
                manage: true,
            },
            conversations: {
                createChannels: true,
                manageChannels: true,
            },
            apiAccess: false,
        } as RolePermissions,
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
                delete: false,
                assign: false,
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
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
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: false,
                manageEvents: false,
            },
            invitations: {
                manage: false,
            },
            conversations: {
                createChannels: true,
                manageChannels: false,
            },
            apiAccess: false,
        } as RolePermissions,
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
                update: true,
                delete: false,
                manageMembers: true,
                viewAll: false,
            },
            projects: {
                create: true,
                update: true,
                delete: true,
                manageMembers: true,
                viewAll: false,
            },
            tasks: {
                create: true,
                update: true,
                delete: true,
                assign: true,
                complete: true,
                viewAll: false,
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
                export: false,
            },
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: true,
                manageEvents: true,
            },
            invitations: {
                manage: false,
            },
            conversations: {
                createChannels: true,
                manageChannels: true,
            },
            apiAccess: false,
        } as RolePermissions,
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
                update: true,
                delete: false,
                manageMembers: false,
                viewAll: false,
            },
            tasks: {
                create: true,
                update: true,
                delete: true,
                assign: true,
                complete: true,
                viewAll: false,
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
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: true,
                manageEvents: false,
            },
            invitations: {
                manage: false,
            },
            conversations: {
                createChannels: true,
                manageChannels: false,
            },
            apiAccess: false,
        } as RolePermissions,
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
                delete: false,
                assign: false,
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
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
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: true,
                manageEvents: false,
            },
            invitations: {
                manage: false,
            },
            conversations: {
                createChannels: true,
                manageChannels: false,
            },
            apiAccess: false,
        } as RolePermissions,
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
                create: true,
                update: true,
                delete: false,
                assign: false,
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
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
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: true,
                manageEvents: false,
            },
            invitations: {
                manage: false,
            },
            conversations: {
                createChannels: true,
                manageChannels: false,
            },
            apiAccess: false,
        } as RolePermissions,
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
                create: true,
                update: true,
                delete: false,
                assign: false,
                complete: true,
                viewAll: false,
            },
            comments: {
                create: true,
                update: true,
                delete: true,
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
            webhooks: {
                manage: false,
                viewLogs: false,
            },
            calendar: {
                createEvents: false,
                manageEvents: false,
            },
            invitations: {
                manage: false,
            },
            conversations: {
                createChannels: true,
                manageChannels: false,
            },
            apiAccess: false,
        } as RolePermissions,
    },
} as const

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get permissions for a workspace role
 */
export function getWorkspaceRolePermissions(role: string): RolePermissions | null {
    const roleMap: Record<string, keyof typeof SYSTEM_ROLES> = {
        'owner': 'OWNER',
        'admin': 'ADMIN',
        'project_manager': 'PROJECT_MANAGER',
        'hr_manager': 'HR_MANAGER',
        'member': 'WORKSPACE_MEMBER',
        'guest': 'WORKSPACE_MEMBER', // Guests have same permissions as members
    }

    const systemRole = roleMap[role]
    if (!systemRole) return null

    return SYSTEM_ROLES[systemRole].permissions
}

/**
 * Get permissions for a team level
 */
export function getTeamLevelPermissions(level: string): RolePermissions | null {
    const levelMap: Record<string, keyof typeof SYSTEM_ROLES> = {
        'team_lead': 'TEAM_LEAD',
        'senior': 'SENIOR',
        'mid': 'MID',
        'junior': 'JUNIOR',
        'intern': 'INTERN',
    }

    const systemRole = levelMap[level]
    if (!systemRole) return null

    return SYSTEM_ROLES[systemRole].permissions
}
