
import { db } from '../index'
import { roles, permissions, rolePermissions } from '../schema/rbac'
import { SYSTEM_ROLES } from '../schema/roles'
import { sql } from 'drizzle-orm'

export async function seedRBAC() {
    console.log('🌱 Seeding RBAC...')

    // 1. Collect all unique permissions from SYSTEM_ROLES
    const allPermissions = new Set<string>()
    const permissionDetails: Record<string, { category: string, description: string }> = {}

    // Helper to traverse object
    function traverse(obj: any, path: string = '') {
        for (const key in obj) {
            if (typeof obj[key] === 'boolean') {
                const fullPath = path ? `${path}.${key}` : key
                allPermissions.add(fullPath)
                
                // Extract category
                const category = fullPath.split('.')[0]
                permissionDetails[fullPath] = {
                    category,
                    description: `Permission to ${fullPath.replace('.', ' ')}`
                }
            } else if (typeof obj[key] === 'object') {
                traverse(obj[key], path ? `${path}.${key}` : key)
            }
        }
    }

    // Scan all roles to find all possible permissions
    Object.values(SYSTEM_ROLES).forEach(role => {
        traverse(role.permissions)
    })

    // 2. Insert Permissions
    console.log(`Found ${allPermissions.size} unique permissions`)
    
    // UPSERT Permissions (update description/category if exists)
    for (const permId of allPermissions) {
        await db.insert(permissions).values({
            id: permId,
            name: permId,
            category: permissionDetails[permId].category,
            description: permissionDetails[permId].description
        }).onConflictDoUpdate({
            target: permissions.id,
            set: {
                category: permissionDetails[permId].category,
                description: permissionDetails[permId].description,
                updatedAt: new Date()
            }
        })
    }

    // 3. Insert Roles and Role Permissions
    for (const roleDef of Object.values(SYSTEM_ROLES)) {
        const roleId = roleDef.level
        console.log(`Processing role: ${roleDef.name} (${roleId})`)

        // UPSERT Role
        await db.insert(roles).values({
            id: roleId,
            name: roleDef.name,
            description: roleDef.description,
            type: roleDef.type
        }).onConflictDoUpdate({
            target: roles.id,
            set: {
                name: roleDef.name,
                description: roleDef.description,
                type: roleDef.type,
                updatedAt: new Date()
            }
        })

        // Collect current role permissions
        const rolePerms = new Set<string>()
        function traverseRolePerms(obj: any, path: string = '') {
            for (const key in obj) {
                if (typeof obj[key] === 'boolean' && obj[key] === true) {
                    rolePerms.add(path ? `${path}.${key}` : key)
                } else if (typeof obj[key] === 'object') {
                    traverseRolePerms(obj[key], path ? `${path}.${key}` : key)
                }
            }
        }
        traverseRolePerms(roleDef.permissions)

        // SYNC Role Permissions (Delete old, Insert new)
        if (rolePerms.size > 0) {
            // First, delete existing permissions for this role to ensure clean state
            // (onConflictDoNothing doesn't handle removals of revoked permissions)
            await db.delete(rolePermissions).where(sql`${rolePermissions.roleId} = ${roleId}`)
            
            // Then insert fresh ones
            await db.insert(rolePermissions).values(
                Array.from(rolePerms).map(permId => ({
                    roleId,
                    permissionId: permId
                }))
            )
        }
    }

    console.log('✅ RBAC Seeding Completed')
}
