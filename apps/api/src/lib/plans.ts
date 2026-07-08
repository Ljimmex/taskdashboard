import type { Workspace } from '@/db/schema'

export type SubscriptionPlan = 'free' | 'plus' | 'pro' | 'enterprise'

export interface PlanLimits {
  plan: SubscriptionPlan
  displayName: string
  monthlySeatPriceCents: number | null // null for free/enterprise
  quarterlySeatPriceCents: number | null
  yearlySeatPriceCents: number | null
  maxMembers: number | null // null = unlimited
  maxProjects: number | null
  maxTeams: number | null
  maxDocs: number | null
  maxWhiteboards: number | null
  baseStorageGB: number
  storagePerSeatGB: number
  maxFileSizeMB: number
  messageHistoryDays: number | null // null = unlimited
  webhooks: number | null
  apiAccess: 'none' | 'read_only' | 'full'
  features: {
    customBranding: boolean
    advancedReporting: boolean
    ssoEnabled: boolean
    prioritySupport: boolean
    hrApproval: boolean
    revShare: boolean
    fileAnnotations: boolean
    whiteboardVersioning: boolean
  }
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    plan: 'free',
    displayName: 'Free',
    monthlySeatPriceCents: null,
    quarterlySeatPriceCents: null,
    yearlySeatPriceCents: null,
    maxMembers: 5,
    maxProjects: 5,
    maxTeams: 2,
    maxDocs: 10,
    maxWhiteboards: 1,
    baseStorageGB: 0, // 0 base; per-seat 0; total comes from workspace.maxStorageGB override
    storagePerSeatGB: 0,
    maxFileSizeMB: 10,
    messageHistoryDays: 30,
    webhooks: 0,
    apiAccess: 'none',
    features: {
      customBranding: false,
      advancedReporting: false,
      ssoEnabled: false,
      prioritySupport: false,
      hrApproval: false,
      revShare: false,
      fileAnnotations: false,
      whiteboardVersioning: false,
    },
  },
  plus: {
    plan: 'plus',
    displayName: 'Zadano Plus',
    monthlySeatPriceCents: 700,
    quarterlySeatPriceCents: 1800, // $6 / seat / mo effective
    yearlySeatPriceCents: 6000, // $5 / seat / mo effective
    maxMembers: null,
    maxProjects: null,
    maxTeams: null,
    maxDocs: null,
    maxWhiteboards: null,
    baseStorageGB: 50,
    storagePerSeatGB: 5,
    maxFileSizeMB: 100,
    messageHistoryDays: null,
    webhooks: 10,
    apiAccess: 'read_only',
    features: {
      customBranding: true,
      advancedReporting: true,
      ssoEnabled: false,
      prioritySupport: false,
      hrApproval: true,
      revShare: false,
      fileAnnotations: true,
      whiteboardVersioning: false,
    },
  },
  pro: {
    plan: 'pro',
    displayName: 'Zadano Pro',
    monthlySeatPriceCents: 1100,
    quarterlySeatPriceCents: 2700, // $9 / seat / mo effective
    yearlySeatPriceCents: 9600, // $8 / seat / mo effective
    maxMembers: null,
    maxProjects: null,
    maxTeams: null,
    maxDocs: null,
    maxWhiteboards: null,
    baseStorageGB: 50,
    storagePerSeatGB: 15,
    maxFileSizeMB: 2048,
    messageHistoryDays: null,
    webhooks: null,
    apiAccess: 'full',
    features: {
      customBranding: true,
      advancedReporting: true,
      ssoEnabled: true,
      prioritySupport: true,
      hrApproval: true,
      revShare: true,
      fileAnnotations: true,
      whiteboardVersioning: true,
    },
  },
  enterprise: {
    plan: 'enterprise',
    displayName: 'Enterprise',
    monthlySeatPriceCents: null,
    quarterlySeatPriceCents: null,
    yearlySeatPriceCents: null,
    maxMembers: null,
    maxProjects: null,
    maxTeams: null,
    maxDocs: null,
    maxWhiteboards: null,
    baseStorageGB: 0,
    storagePerSeatGB: 0,
    maxFileSizeMB: 10240,
    messageHistoryDays: null,
    webhooks: null,
    apiAccess: 'full',
    features: {
      customBranding: true,
      advancedReporting: true,
      ssoEnabled: true,
      prioritySupport: true,
      hrApproval: true,
      revShare: true,
      fileAnnotations: true,
      whiteboardVersioning: true,
    },
  },
}

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function getWorkspacePlanLimits(workspace: Pick<Workspace, 'subscriptionPlan'>): PlanLimits {
  return getPlanLimits(workspace.subscriptionPlan as SubscriptionPlan)
}

export function getWorkspaceStorageLimitGB(workspace: Workspace): number {
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

export function getWorkspaceMemberLimit(workspace: Workspace): number | null {
  if (workspace.subscriptionPlan === 'free') {
    return workspace.maxMembers ?? 5
  }
  return null
}

export function getWorkspaceProjectLimit(workspace: Workspace): number | null {
  if (workspace.subscriptionPlan === 'free') {
    return workspace.maxProjects ?? 5
  }
  return null
}

export function getWorkspaceTeamLimit(workspace: Workspace): number | null {
  if (workspace.subscriptionPlan === 'free') {
    return workspace.maxTeams ?? 2
  }
  return null
}

export function getWorkspaceDocsLimit(workspace: Workspace): number | null {
  if (workspace.subscriptionPlan === 'free') {
    return workspace.maxDocs ?? 10
  }
  return null
}

export function getWorkspaceWhiteboardsLimit(workspace: Workspace): number | null {
  if (workspace.subscriptionPlan === 'free') {
    return workspace.maxWhiteboards ?? 1
  }
  return null
}

export function getWorkspaceMaxFileSizeMB(workspace: Workspace): number {
  return workspace.maxFileSizeMB ?? getWorkspacePlanLimits(workspace).maxFileSizeMB
}

export function formatLimitError(resource: string, limit: number | null): string {
  if (limit === null) return `Resource limit exceeded for ${resource}.`
  return `You have reached the ${resource} limit for your plan (${limit}). Upgrade to add more.`
}

export function getWorkspaceDefaultsForPlan(plan: SubscriptionPlan): Partial<{
  maxMembers: number | null
  maxProjects: number | null
  maxStorageGB: number | null
  maxTeams: number | null
  maxDocs: number | null
  maxWhiteboards: number | null
  maxFileSizeMB: number
  features: ReturnType<typeof getWorkspacePlanLimits>['features'] & {
    apiAccess: 'none' | 'read_only' | 'full'
  }
}> {
  switch (plan) {
    case 'free':
      return {
        maxMembers: 5,
        maxProjects: 5,
        maxStorageGB: 0,
        maxTeams: 2,
        maxDocs: 10,
        maxWhiteboards: 1,
        maxFileSizeMB: 10,
      }
    case 'plus':
      return {
        maxMembers: null,
        maxProjects: null,
        maxStorageGB: 50,
        maxTeams: null,
        maxDocs: null,
        maxWhiteboards: null,
        maxFileSizeMB: 100,
      }
    case 'pro':
      return {
        maxMembers: null,
        maxProjects: null,
        maxStorageGB: 50,
        maxTeams: null,
        maxDocs: null,
        maxWhiteboards: null,
        maxFileSizeMB: 2048,
      }
    case 'enterprise':
      return {
        maxMembers: null,
        maxProjects: null,
        maxStorageGB: null,
        maxTeams: null,
        maxDocs: null,
        maxWhiteboards: null,
        maxFileSizeMB: 10240,
      }
  }
}
