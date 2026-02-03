import { createMiddleware } from 'hono/factory'
import { db } from '../db' // Verify path
import { SYSTEM_ROLES } from '../db/schema/roles'

// Generic permission path type (e.g., 'workspace.manageSettings')
type PermissionPath = string

// Mapping from simple DB Enums to Complex System Roles (Permissions)
const WORKSPACE_ROLE_MAP: Record<string, typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES]> = {
    'owner': SYSTEM_ROLES.OWNER,
    'admin': SYSTEM_ROLES.ADMIN,
    'project_manager': SYSTEM_ROLES.PROJECT_MANAGER,
    'hr_manager': SYSTEM_ROLES.HR_MANAGER,
    'member': SYSTEM_ROLES.WORKSPACE_MEMBER,
    'guest': SYSTEM_ROLES.INTERN // Fallback for guest
}

const TEAM_ROLE_MAP: Record<string, typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES]> = {
    'team_lead': SYSTEM_ROLES.TEAM_LEAD,
    'senior': SYSTEM_ROLES.SENIOR,
    'mid': SYSTEM_ROLES.MID,
    'junior': SYSTEM_ROLES.JUNIOR,
    'intern': SYSTEM_ROLES.INTERN
}

/**
 * Helper to get nested property from object by string path
 * e.g. getPermission(roles, 'workspace.manageMembers')
 */
function getPermissionValue(permissions: any, path: string): boolean {
    const parts = path.split('.')
    let current = permissions

    for (const part of parts) {
        if (current === undefined || current === null) return false
        current = current[part]
    }

    return !!current
}

export const requirePermission = (permission: PermissionPath) => createMiddleware(async (c, next) => {
    // 1. Get User ID (Assume auth middleware ran before)
    const userId = c.req.header('x-user-id')

    if (!userId) {
        return c.json({ error: 'Unauthorized: No user ID found' }, 401)
    }

    // Flags to check both contexts
    let hasAccess = false

    // CHECK WORKSPACE PERMISSIONS
    if (c.req.path.startsWith('/api/workspaces/') && c.req.param('id')) {
        const wsId = c.req.param('id')

        // Ensure wsId is present
        if (!wsId) return c.json({ error: 'Invalid workspace ID' }, 400)

        const member = await db.query.workspaceMembers.findFirst({
            where: (m, { and, eq }) => and(eq(m.workspaceId, wsId), eq(m.userId, userId))
        })

        if (member) {
            const roleDef = WORKSPACE_ROLE_MAP[member.role]
            if (roleDef && getPermissionValue(roleDef.permissions, permission)) {
                hasAccess = true
            }
        }
    }

    // If we are touching /api/teams/:id, then id is teamId
    // Or if we create team in workspace
    else if (c.req.path.startsWith('/api/teams/') && c.req.param('id')) {
        const tmId = c.req.param('id')

        if (!tmId) return c.json({ error: 'Invalid team ID' }, 400)

        // Check Team Membership
        const teamMember = await db.query.teamMembers.findFirst({
            where: (tm, { and, eq }) => and(eq(tm.teamId, tmId), eq(tm.userId, userId))
        })

        if (teamMember) {
            const roleDef = TEAM_ROLE_MAP[teamMember.teamLevel] // Map 'team_lead' -> TEAM_LEAD etc
            if (roleDef && getPermissionValue(roleDef.permissions, permission)) {
                hasAccess = true
            }
        }

        // Also check Workspace Admin override?
        if (!hasAccess) {
            const team = await db.query.teams.findFirst({
                where: (t, { eq }) => eq(t.id, tmId),
                columns: { workspaceId: true }
            })

            if (team) {
                const wsMember = await db.query.workspaceMembers.findFirst({
                    where: (m, { and, eq }) => and(eq(m.workspaceId, team.workspaceId), eq(m.userId, userId))
                })

                // If workspace OWNER or ADMIN, they often overrides team specific checks
                if (wsMember && (wsMember.role === 'owner' || wsMember.role === 'admin')) {
                    hasAccess = true
                }
            }
        }
    }

    if (hasAccess) {
        await next()
    } else {
        return c.json({ error: 'Forbidden: Insufficient permissions' }, 403)
    }
})
