
import { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { db } from '../db'
import { roles, rolePermissions, permissions } from '../db/schema/rbac'
import { eq, and } from 'drizzle-orm'
import { auth } from '../lib/auth'

// In-memory cache for role permissions to reduce DB hits
// RoleID -> Set<PermissionID>
const rolePermissionCache = new Map<string, Set<string>>()
const CACHE_TTL = 60 * 1000 // 1 minute
let lastCacheUpdate = 0

async function loadPermissions() {
    const now = Date.now()
    if (now - lastCacheUpdate < CACHE_TTL && rolePermissionCache.size > 0) {
        return
    }

    console.log('🔄 Refreshing RBAC Cache...')
    const allRolePerms = await db.select({
        roleId: rolePermissions.roleId,
        permissionId: rolePermissions.permissionId
    }).from(rolePermissions)

    rolePermissionCache.clear()
    for (const rp of allRolePerms) {
        if (!rolePermissionCache.has(rp.roleId)) {
            rolePermissionCache.set(rp.roleId, new Set())
        }
        rolePermissionCache.get(rp.roleId)?.add(rp.permissionId)
    }
    lastCacheUpdate = now
}

export const requirePermission = (requiredPermission: string) => createMiddleware(async (c: Context, next: Next) => {
    // 0. Ensure permissions are loaded
    await loadPermissions()

    // 1. Get User Session
    const user = c.get('user')
    const userId = user?.id

    if (!userId) {
        return c.json({ error: 'Unauthorized: No session found' }, 401)
    }

    let hasAccess = false

    // CHECK WORKSPACE CONTEXT
    // Try to find workspaceId from params or body
    const workspaceId = c.req.param('workspaceId') || c.req.param('id')
    
    // If request is strictly workspace related
    if (workspaceId) {
        const member = await db.query.workspaceMembers.findFirst({
            where: (wm, { and, eq }) => and(eq(wm.userId, userId), eq(wm.workspaceId, workspaceId))
        })

        if (member) {
            if (member.status === 'suspended') {
                return c.json({ error: 'Forbidden: Member suspended' }, 403)
            }
            
            // Check if member's role has the required permission
            // The member.role is a string like 'owner', 'admin', 'member' which matches roles.id
            const rolePerms = rolePermissionCache.get(member.role)
            if (rolePerms && rolePerms.has(requiredPermission)) {
                hasAccess = true
            }
        }
    }

    // CHECK TEAM CONTEXT
    // If accessing team resources
    const teamId = c.req.param('teamId') || (c.req.path.includes('/teams/') ? c.req.param('id') : null)
    
    if (teamId && !hasAccess) {
        const teamMember = await db.query.teamMembers.findFirst({
            where: (tm, { and, eq }) => and(eq(tm.teamId, teamId), eq(tm.userId, userId))
        })

        if (teamMember) {
            // Check team role permissions
            const rolePerms = rolePermissionCache.get(teamMember.role)
            if (rolePerms && rolePerms.has(requiredPermission)) {
                hasAccess = true
            }
        }

        // Fallback: Check if Workspace Admin has access to this team resource
        if (!hasAccess) {
             const team = await db.query.teams.findFirst({
                where: (t, { eq }) => eq(t.id, teamId),
                columns: { workspaceId: true }
            })

            if (team) {
                const wsMember = await db.query.workspaceMembers.findFirst({
                    where: (m, { and, eq }) => and(eq(m.workspaceId, team.workspaceId), eq(m.userId, userId))
                })

                if (wsMember) {
                     const rolePerms = rolePermissionCache.get(wsMember.role)
                     // Usually admins have almost all permissions, but let's check explicitly
                     if (rolePerms && rolePerms.has(requiredPermission)) {
                         hasAccess = true
                     }
                }
            }
        }
    }

    if (hasAccess) {
        await next()
    } else {
        return c.json({ error: `Forbidden: Missing permission ${requiredPermission}` }, 403)
    }
})

// Keep the SYSTEM_ROLES export for backward compatibility or seeding reference
export const SYSTEM_ROLES = {
    OWNER: {
        name: 'Workspace Owner',
        level: 'owner',
        description: 'Full access to everything in the workspace',
        type: 'global',
        permissions: {
            workspace: {
                manageSettings: true,
                manageMembers: true,
                manageBilling: true,
                deleteWorkspace: true,
                viewAuditLogs: true
            },
            projects: {
                create: true,
                delete: true,
                archive: true,
                manageSettings: true
            },
            tasks: {
                create: true,
                edit: true,
                delete: true,
                assign: true
            }
        }
    },
    ADMIN: {
        name: 'Workspace Admin',
        level: 'admin',
        description: 'Can manage members and projects',
        type: 'global',
        permissions: {
            workspace: {
                manageSettings: true,
                manageMembers: true,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: true
            },
            projects: {
                create: true,
                delete: true,
                archive: true,
                manageSettings: true
            },
            tasks: {
                create: true,
                edit: true,
                delete: true,
                assign: true
            }
        }
    },
    PROJECT_MANAGER: {
        name: 'Project Manager',
        level: 'project_manager',
        description: 'Can manage projects and tasks',
        type: 'global',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: false,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: false
            },
            projects: {
                create: true,
                delete: false,
                archive: true,
                manageSettings: true
            },
            tasks: {
                create: true,
                edit: true,
                delete: true,
                assign: true
            }
        }
    },
    HR_MANAGER: {
        name: 'HR Manager',
        level: 'hr_manager',
        description: 'Can manage workspace members',
        type: 'global',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: true,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: true
            },
            projects: {
                create: false,
                delete: false,
                archive: false,
                manageSettings: false
            },
            tasks: {
                create: false,
                edit: false,
                delete: false,
                assign: false
            }
        }
    },
    WORKSPACE_MEMBER: {
        name: 'Workspace Member',
        level: 'member',
        description: 'Regular member, can work on tasks',
        type: 'global',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: false,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: false
            },
            projects: {
                create: false,
                delete: false,
                archive: false,
                manageSettings: false
            },
            tasks: {
                create: true,
                edit: true,
                delete: false,
                assign: true
            }
        }
    },
    TEAM_LEAD: {
        name: 'Team Lead',
        level: 'team_lead',
        description: 'Leader of a specific team',
        type: 'team',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: false,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: false
            },
            projects: {
                create: true,
                delete: false,
                archive: false,
                manageSettings: true
            },
            tasks: {
                create: true,
                edit: true,
                delete: true,
                assign: true
            }
        }
    },
    SENIOR: {
        name: 'Senior Developer',
        level: 'senior',
        description: 'Senior team member',
        type: 'team',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: false,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: false
            },
            projects: {
                create: false,
                delete: false,
                archive: false,
                manageSettings: false
            },
            tasks: {
                create: true,
                edit: true,
                delete: true,
                assign: true
            }
        }
    },
    MID: {
        name: 'Mid Developer',
        level: 'mid',
        description: 'Mid-level team member',
        type: 'team',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: false,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: false
            },
            projects: {
                create: false,
                delete: false,
                archive: false,
                manageSettings: false
            },
            tasks: {
                create: true,
                edit: true,
                delete: false,
                assign: true
            }
        }
    },
    JUNIOR: {
        name: 'Junior Developer',
        level: 'junior',
        description: 'Junior team member',
        type: 'team',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: false,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: false
            },
            projects: {
                create: false,
                delete: false,
                archive: false,
                manageSettings: false
            },
            tasks: {
                create: true,
                edit: true,
                delete: false,
                assign: false
            }
        }
    },
    INTERN: {
        name: 'Intern',
        level: 'intern',
        description: 'Intern or Guest',
        type: 'team',
        permissions: {
            workspace: {
                manageSettings: false,
                manageMembers: false,
                manageBilling: false,
                deleteWorkspace: false,
                viewAuditLogs: false
            },
            projects: {
                create: false,
                delete: false,
                archive: false,
                manageSettings: false
            },
            tasks: {
                create: false,
                edit: false,
                delete: false,
                assign: false
            }
        }
    }
}

