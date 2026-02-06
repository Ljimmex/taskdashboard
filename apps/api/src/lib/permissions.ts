import { SYSTEM_ROLES } from '../db/schema/roles'

// =============================================================================
// PERMISSION TYPES
// =============================================================================

export type WorkspaceRole = 'owner' | 'admin' | 'project_manager' | 'hr_manager' | 'member' | 'guest'
export type TeamLevel = 'team_lead' | 'senior' | 'mid' | 'junior' | 'intern'

export type PermissionCategory =
    | 'workspace'
    | 'teams'
    | 'projects'
    | 'tasks'
    | 'comments'
    | 'labels'
    | 'stages'
    | 'timeTracking'
    | 'files'
    | 'analytics'
    | 'webhooks'
    | 'calendar'
    | 'invitations'
    | 'conversations'

export type PermissionAction = string // e.g., 'create', 'update', 'delete', 'manageMembers', etc.

// =============================================================================
// GET PERMISSIONS BY ROLE
// =============================================================================

/**
 * Get permissions for a workspace role
 */
export function getWorkspaceRolePermissions(role: WorkspaceRole) {
    const roleMap: Record<WorkspaceRole, typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES]> = {
        owner: SYSTEM_ROLES.OWNER,
        admin: SYSTEM_ROLES.ADMIN,
        project_manager: SYSTEM_ROLES.PROJECT_MANAGER,
        hr_manager: SYSTEM_ROLES.HR_MANAGER,
        member: SYSTEM_ROLES.WORKSPACE_MEMBER,
        guest: SYSTEM_ROLES.WORKSPACE_MEMBER, // Guest uses member permissions but can be stricter
    }
    return roleMap[role]?.permissions || {}
}

/**
 * Get permissions for a team level
 */
export function getTeamLevelPermissions(level: TeamLevel) {
    const levelMap: Record<TeamLevel, typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES]> = {
        team_lead: SYSTEM_ROLES.TEAM_LEAD,
        senior: SYSTEM_ROLES.SENIOR,
        mid: SYSTEM_ROLES.MID,
        junior: SYSTEM_ROLES.JUNIOR,
        intern: SYSTEM_ROLES.INTERN,
    }
    return levelMap[level]?.permissions || {}
}

// =============================================================================
// PERMISSION CHECKING
// =============================================================================

/**
 * Check if a workspace role has a specific permission
 */
export function hasWorkspacePermission(
    role: WorkspaceRole,
    category: PermissionCategory,
    action: PermissionAction
): boolean {
    const permissions = getWorkspaceRolePermissions(role)
    const categoryPerms = permissions[category as keyof typeof permissions]
    if (!categoryPerms) return false

    if (typeof categoryPerms === 'boolean') return categoryPerms
    return (categoryPerms as Record<string, boolean>)[action] === true
}

/**
 * Check if a team level has a specific permission
 */
export function hasTeamPermission(
    level: TeamLevel,
    category: PermissionCategory,
    action: PermissionAction
): boolean {
    const permissions = getTeamLevelPermissions(level)
    const categoryPerms = permissions[category as keyof typeof permissions]
    if (!categoryPerms) return false

    if (typeof categoryPerms === 'boolean') return categoryPerms
    return (categoryPerms as Record<string, boolean>)[action] === true
}

/**
 * Check combined permissions (workspace role OR team level)
 * User has permission if EITHER their workspace role OR team level grants it
 */
export function hasPermission(
    workspaceRole: WorkspaceRole | null,
    teamLevel: TeamLevel | null,
    category: PermissionCategory,
    action: PermissionAction
): boolean {
    // Check workspace role permission
    if (workspaceRole && hasWorkspacePermission(workspaceRole, category, action)) {
        return true
    }

    // Check team level permission
    if (teamLevel && hasTeamPermission(teamLevel, category, action)) {
        return true
    }

    return false
}

// =============================================================================
// PERMISSION GUARDS - WORKSPACE
// =============================================================================

/** Check if user can manage workspace settings */
export function canManageWorkspaceSettings(workspaceRole: WorkspaceRole | null): boolean {
    if (!workspaceRole) return false
    return hasWorkspacePermission(workspaceRole, 'workspace', 'manageSettings')
}

/** Check if user can manage workspace members */
export function canManageWorkspaceMembers(workspaceRole: WorkspaceRole | null): boolean {
    if (!workspaceRole) return false
    return hasWorkspacePermission(workspaceRole, 'workspace', 'manageMembers')
}

/** Check if user can delete workspace */
export function canDeleteWorkspace(workspaceRole: WorkspaceRole | null): boolean {
    if (!workspaceRole) return false
    return hasWorkspacePermission(workspaceRole, 'workspace', 'deleteWorkspace')
}

// =============================================================================
// PERMISSION GUARDS - TEAMS
// =============================================================================

/** Check if user can manage team members */
export function canManageTeamMembers(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'teams', 'manageMembers')
}

// =============================================================================
// PERMISSION GUARDS - PROJECTS
// =============================================================================

/** Check if user can create projects */
export function canCreateProjects(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'projects', 'create')
}

/** Check if user can update projects */
export function canUpdateProjects(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'projects', 'update')
}

/** Check if user can delete projects */
export function canDeleteProjects(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'projects', 'delete')
}

// =============================================================================
// PERMISSION GUARDS - TASKS
// =============================================================================

/** Check if user can create tasks */
export function canCreateTasks(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'tasks', 'create')
}

/** Check if user can update tasks */
export function canUpdateTasks(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'tasks', 'update')
}

/** Check if user can delete tasks */
export function canDeleteTasks(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'tasks', 'delete')
}

/** Check if user can assign tasks */
export function canAssignTasks(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'tasks', 'assign')
}

// =============================================================================
// PERMISSION GUARDS - COMMENTS
// =============================================================================

/** Check if user can create comments */
export function canCreateComments(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'comments', 'create')
}

/** Check if user can moderate comments (edit/delete others' comments) */
export function canModerateComments(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'comments', 'moderate')
}

// =============================================================================
// PERMISSION GUARDS - LABELS
// =============================================================================

/** Check if user can create labels */
export function canCreateLabels(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'labels', 'create')
}

/** Check if user can update labels */
export function canUpdateLabels(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'labels', 'update')
}

/** Check if user can delete labels */
export function canDeleteLabels(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'labels', 'delete')
}

// =============================================================================
// PERMISSION GUARDS - STAGES (Kanban)
// =============================================================================

/** Check if user can create stages */
export function canCreateStages(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'stages', 'create')
}

/** Check if user can update stages */
export function canUpdateStages(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'stages', 'update')
}

/** Check if user can delete stages */
export function canDeleteStages(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'stages', 'delete')
}

/** Check if user can reorder stages */
export function canReorderStages(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'stages', 'reorder')
}

// =============================================================================
// PERMISSION GUARDS - TIME TRACKING
// =============================================================================

/** Check if user can create time entries */
export function canCreateTimeEntries(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'timeTracking', 'create')
}

/** Check if user can view all time entries (not just their own) */
export function canViewAllTimeEntries(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'timeTracking', 'viewAll')
}

/** Check if user can manage time entries (edit/delete others' entries) */
export function canManageTimeEntries(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'timeTracking', 'manage')
}

// =============================================================================
// PERMISSION GUARDS - ANALYTICS
// =============================================================================

/** Check if user can view analytics */
export function canViewAnalytics(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'analytics', 'view')
}

// =============================================================================
// PERMISSION GUARDS - WEBHOOKS
// =============================================================================

export function canManageWebhooks(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'webhooks', 'manage')
}

export function canViewWebhookLogs(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'webhooks', 'viewLogs')
}

// =============================================================================
// PERMISSION GUARDS - CALENDAR
// =============================================================================

export function canViewCalendarEvents(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'calendar', 'view')
}

export function canCreateCalendarEvents(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'calendar', 'createEvents')
}

export function canManageCalendarEvents(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'calendar', 'manageEvents')
}

// =============================================================================
// PERMISSION GUARDS - INVITATIONS
// =============================================================================

export function canManageInvitations(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'invitations', 'manage')
}

// =============================================================================
// PERMISSION GUARDS - CONVERSATIONS
// =============================================================================

export function canCreateChannels(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'conversations', 'createChannels')
}

export function canManageChannels(workspaceRole: WorkspaceRole | null, teamLevel: TeamLevel | null): boolean {
    return hasPermission(workspaceRole, teamLevel, 'conversations', 'manageChannels')
}

// =============================================================================
// ROLE HIERARCHY HELPERS
// =============================================================================

const WORKSPACE_ROLE_HIERARCHY: WorkspaceRole[] = ['owner', 'admin', 'project_manager', 'hr_manager', 'member', 'guest']
const TEAM_LEVEL_HIERARCHY: TeamLevel[] = ['team_lead', 'senior', 'mid', 'junior', 'intern']

/** Check if roleA is higher or equal to roleB in workspace hierarchy */
export function isWorkspaceRoleAtLeast(role: WorkspaceRole, minimumRole: WorkspaceRole): boolean {
    return WORKSPACE_ROLE_HIERARCHY.indexOf(role) <= WORKSPACE_ROLE_HIERARCHY.indexOf(minimumRole)
}

/** Check if levelA is higher or equal to levelB in team hierarchy */
export function isTeamLevelAtLeast(level: TeamLevel, minimumLevel: TeamLevel): boolean {
    return TEAM_LEVEL_HIERARCHY.indexOf(level) <= TEAM_LEVEL_HIERARCHY.indexOf(minimumLevel)
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export const permissions = {
    // Core functions
    getWorkspaceRolePermissions,
    getTeamLevelPermissions,
    hasWorkspacePermission,
    hasTeamPermission,
    hasPermission,
    // Workspace
    canManageWorkspaceSettings,
    canManageWorkspaceMembers,
    canDeleteWorkspace,
    // Teams
    canManageTeamMembers,
    // Projects
    canCreateProjects,
    canUpdateProjects,
    canDeleteProjects,
    // Tasks
    canCreateTasks,
    canUpdateTasks,
    canDeleteTasks,
    canAssignTasks,
    // Comments
    canCreateComments,
    canModerateComments,
    // Labels
    canCreateLabels,
    canUpdateLabels,
    canDeleteLabels,
    // Stages
    canCreateStages,
    canUpdateStages,
    canDeleteStages,
    canReorderStages,
    // Time Tracking
    canCreateTimeEntries,
    canViewAllTimeEntries,
    canManageTimeEntries,
    // Analytics
    canViewAnalytics,
    // Calendar
    canViewCalendarEvents,
    canCreateCalendarEvents,
    canManageCalendarEvents,
    // Hierarchy
    isWorkspaceRoleAtLeast,
    isTeamLevelAtLeast,
}

export default permissions
