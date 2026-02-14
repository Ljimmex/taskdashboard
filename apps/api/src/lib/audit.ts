
import { db } from '../db'
import { auditLogs } from '../db/schema/audit'
import { nanoid } from 'nanoid'

export type AuditAction = 
    | 'workspace.create' | 'workspace.update' | 'workspace.delete'
    | 'member.invite' | 'member.update_role' | 'member.remove'
    | 'project.create' | 'project.update' | 'project.delete'
    | 'task.create' | 'task.update' | 'task.delete'
    | 'webhook.create' | 'webhook.update' | 'webhook.delete'

interface LogEntry {
    workspaceId: string
    actorId: string | null
    action: AuditAction | string
    entityType: string
    entityId: string
    details?: any
    ipAddress?: string
    userAgent?: string
}

export const auditLogger = {
    log: async (entry: LogEntry) => {
        try {
            await db.insert(auditLogs).values({
                id: nanoid(),
                workspaceId: entry.workspaceId,
                actorId: entry.actorId,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                details: entry.details,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent
            })
        } catch (error) {
            console.error('Failed to write audit log:', error)
            // Don't crash the request if logging fails, but alert in real production
        }
    }
}
