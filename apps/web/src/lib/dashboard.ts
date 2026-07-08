import type { LucideIcon } from 'lucide-react'

export interface DashboardLayoutItem {
  panelId: string
  order: number
  config?: Record<string, any>
}

export interface DashboardPreferences {
  dashboard?: {
    layout: DashboardLayoutItem[]
  }
}

export interface DashboardPanelProps {
  workspaceSlug: string
  config?: Record<string, any>
  isEditing?: boolean
}

export interface DashboardPanelDefinition {
  id: string
  titleKey: string
  icon: LucideIcon
  colSpan: number
  component: React.ComponentType<DashboardPanelProps>
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutItem[] = [
  { panelId: 'upcoming-meetings', order: 0 },
  { panelId: 'overall-progress', order: 1 },
  { panelId: 'projects', order: 2 },
  { panelId: 'chat-section', order: 3 },
  { panelId: 'calendar', order: 4 },
  { panelId: 'last-resources', order: 5 },
]

export function normalizeLayout(saved: DashboardLayoutItem[] | undefined): DashboardLayoutItem[] {
  if (!Array.isArray(saved)) return []
  // Deduplicate and keep only panels that have valid IDs; default config
  const seen = new Set<string>()
  const result: DashboardLayoutItem[] = []
  saved
    .filter((item) => item && typeof item.panelId === 'string')
    .forEach((item) => {
      if (seen.has(item.panelId)) return
      seen.add(item.panelId)
      result.push({
        panelId: item.panelId,
        order: item.order ?? result.length,
        config: item.config && typeof item.config === 'object' ? item.config : {},
      })
    })
  return result
}

export function getInitialLayout(saved: DashboardLayoutItem[] | undefined): DashboardLayoutItem[] {
  const normalized = normalizeLayout(saved)
  return normalized.length > 0 ? normalized : DEFAULT_DASHBOARD_LAYOUT
}
