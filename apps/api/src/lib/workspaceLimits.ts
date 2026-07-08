import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/db'
import { workspaceMembers, type Workspace } from '@/db/schema/workspaces'
import { projects } from '@/db/schema/projects'
import { teams } from '@/db/schema/teams'
import { documents } from '@/db/schema/documents'
import { whiteboards } from '@/db/schema/whiteboards'
import { files } from '@/db/schema/files'
import {
  getWorkspacePlanLimits,
  getWorkspaceMemberLimit,
  getWorkspaceProjectLimit,
  getWorkspaceTeamLimit,
  getWorkspaceDocsLimit,
  getWorkspaceWhiteboardsLimit,
  getWorkspaceMaxFileSizeMB,
} from './plans'

export type LimitResource =
  'members' | 'projects' | 'teams' | 'documents' | 'whiteboards' | 'storage' | 'file_size'

export interface LimitCheckResult {
  allowed: boolean
  error?: {
    message: string
    code: string
    limit: number | null
    current: number
  }
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  })
  return workspace ?? null
}

export async function countActiveWorkspaceMembers(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaceMembers)
    .where(
      and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.status, 'active'))
    )
  return result?.count ?? 0
}

export async function countWorkspaceProjects(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .innerJoin(teams, eq(projects.teamId, teams.id))
    .where(eq(teams.workspaceId, workspaceId))
  return result?.count ?? 0
}

export async function countWorkspaceTeams(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(teams)
    .where(eq(teams.workspaceId, workspaceId))
  return result?.count ?? 0
}

export async function countWorkspaceDocuments(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(and(eq(documents.workspaceId, workspaceId), eq(documents.isArchived, false)))
  return result?.count ?? 0
}

export async function countWorkspaceWhiteboards(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(whiteboards)
    .where(and(eq(whiteboards.workspaceId, workspaceId), eq(whiteboards.isArchived, false)))
  return result?.count ?? 0
}

export async function getWorkspaceUsedStorageBytes(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(${files.size}), 0)::int` })
    .from(files)
    .where(and(eq(files.workspaceId, workspaceId), eq(files.isArchived, false)))
  return result?.total ?? 0
}

export async function checkWorkspaceMemberLimit(workspaceId: string): Promise<LimitCheckResult> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace)
    return {
      allowed: false,
      error: { message: 'Workspace not found', code: 'NOT_FOUND', limit: null, current: 0 },
    }

  const limit = getWorkspaceMemberLimit(workspace)
  if (limit === null) return { allowed: true }

  const current = await countActiveWorkspaceMembers(workspaceId)
  if (current >= limit) {
    return {
      allowed: false,
      error: {
        message: `Member limit reached. Upgrade to add more than ${limit} members.`,
        code: 'MEMBER_LIMIT_REACHED',
        limit,
        current,
      },
    }
  }
  return { allowed: true }
}

export async function checkWorkspaceProjectLimit(workspaceId: string): Promise<LimitCheckResult> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace)
    return {
      allowed: false,
      error: { message: 'Workspace not found', code: 'NOT_FOUND', limit: null, current: 0 },
    }

  const limit = getWorkspaceProjectLimit(workspace)
  if (limit === null) return { allowed: true }

  const current = await countWorkspaceProjects(workspaceId)
  if (current >= limit) {
    return {
      allowed: false,
      error: {
        message: `Project limit reached. Upgrade to create more than ${limit} projects.`,
        code: 'PROJECT_LIMIT_REACHED',
        limit,
        current,
      },
    }
  }
  return { allowed: true }
}

export async function checkWorkspaceTeamLimit(workspaceId: string): Promise<LimitCheckResult> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace)
    return {
      allowed: false,
      error: { message: 'Workspace not found', code: 'NOT_FOUND', limit: null, current: 0 },
    }

  const limit = getWorkspaceTeamLimit(workspace)
  if (limit === null) return { allowed: true }

  const current = await countWorkspaceTeams(workspaceId)
  if (current >= limit) {
    return {
      allowed: false,
      error: {
        message: `Team limit reached. Upgrade to create more than ${limit} teams.`,
        code: 'TEAM_LIMIT_REACHED',
        limit,
        current,
      },
    }
  }
  return { allowed: true }
}

export async function checkWorkspaceDocumentLimit(workspaceId: string): Promise<LimitCheckResult> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace)
    return {
      allowed: false,
      error: { message: 'Workspace not found', code: 'NOT_FOUND', limit: null, current: 0 },
    }

  const limit = getWorkspaceDocsLimit(workspace)
  if (limit === null) return { allowed: true }

  const current = await countWorkspaceDocuments(workspaceId)
  if (current >= limit) {
    return {
      allowed: false,
      error: {
        message: `Document limit reached. Upgrade to create more than ${limit} documents.`,
        code: 'DOCUMENT_LIMIT_REACHED',
        limit,
        current,
      },
    }
  }
  return { allowed: true }
}

export async function checkWorkspaceWhiteboardLimit(
  workspaceId: string
): Promise<LimitCheckResult> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace)
    return {
      allowed: false,
      error: { message: 'Workspace not found', code: 'NOT_FOUND', limit: null, current: 0 },
    }

  const limit = getWorkspaceWhiteboardsLimit(workspace)
  if (limit === null) return { allowed: true }

  const current = await countWorkspaceWhiteboards(workspaceId)
  if (current >= limit) {
    return {
      allowed: false,
      error: {
        message: `Whiteboard limit reached. Upgrade to create more than ${limit} whiteboards.`,
        code: 'WHITEBOARD_LIMIT_REACHED',
        limit,
        current,
      },
    }
  }
  return { allowed: true }
}

export async function checkWorkspaceStorageLimit(
  workspaceId: string,
  additionalBytes: number = 0
): Promise<LimitCheckResult> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace)
    return {
      allowed: false,
      error: { message: 'Workspace not found', code: 'NOT_FOUND', limit: null, current: 0 },
    }

  const limitGB = getWorkspaceStorageLimitGB(workspace)
  const limitBytes = limitGB * 1024 * 1024 * 1024
  const used = await getWorkspaceUsedStorageBytes(workspaceId)
  const projected = used + additionalBytes

  if (projected > limitBytes) {
    return {
      allowed: false,
      error: {
        message: `Storage limit reached. You are using ${formatBytes(used)} of ${limitGB} GB.`,
        code: 'STORAGE_LIMIT_REACHED',
        limit: limitBytes,
        current: used,
      },
    }
  }
  return { allowed: true }
}

export async function checkFileSizeLimit(
  workspaceId: string,
  fileSizeBytes: number
): Promise<LimitCheckResult> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace)
    return {
      allowed: false,
      error: { message: 'Workspace not found', code: 'NOT_FOUND', limit: null, current: 0 },
    }

  const maxFileSizeMB = getWorkspaceMaxFileSizeMB(workspace)
  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024

  if (fileSizeBytes > maxFileSizeBytes) {
    return {
      allowed: false,
      error: {
        message: `File too large. Maximum file size for your plan is ${maxFileSizeMB} MB.`,
        code: 'FILE_TOO_LARGE',
        limit: maxFileSizeBytes,
        current: fileSizeBytes,
      },
    }
  }
  return { allowed: true }
}

export function getWorkspaceStorageLimitGB(
  workspace: Pick<Workspace, 'subscriptionPlan' | 'maxStorageGB' | 'currentSeatCount'>
): number {
  const limits = getWorkspacePlanLimits(workspace)
  if (workspace.subscriptionPlan === 'free') {
    // Free uses the workspace override column (0.5 GB by default)
    return workspace.maxStorageGB || 0.5
  }
  if (workspace.subscriptionPlan === 'enterprise') {
    return workspace.maxStorageGB || 0
  }
  return limits.baseStorageGB + limits.storagePerSeatGB * (workspace.currentSeatCount || 1)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function isFeatureEnabled(
  workspace: Workspace,
  feature: keyof ReturnType<typeof getWorkspacePlanLimits>['features']
): boolean {
  const limits = getWorkspacePlanLimits(workspace)
  return limits.features[feature] === true
}

export function getApiAccessLevel(workspace: Workspace): 'none' | 'read_only' | 'full' {
  const limits = getWorkspacePlanLimits(workspace)
  return workspace.features?.apiAccess ?? limits.apiAccess
}
