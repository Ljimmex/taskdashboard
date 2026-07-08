import { Plus, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DASHBOARD_PANELS } from '@/components/dashboard/panels'
import type { DashboardLayoutItem } from '@/lib/dashboard'

interface DashboardPanelAddBarProps {
  layout: DashboardLayoutItem[]
  onAdd: (panelId: string) => void
  onReset: () => void
}

export function DashboardPanelAddBar({ layout, onAdd, onReset }: DashboardPanelAddBarProps) {
  const { t } = useTranslation()
  const activeIds = new Set(layout.map((i) => i.panelId))
  const available = DASHBOARD_PANELS.filter((p) => !activeIds.has(p.id))

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-medium text-[var(--app-text-primary)]">
          {t('dashboard.addPanel', 'Dodaj panel')}
        </h4>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--app-bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-secondary)] transition-colors hover:text-[var(--app-text-primary)]"
        >
          <RotateCcw size={14} />
          {t('dashboard.resetLayout', 'Przywróć domyślny układ')}
        </button>
      </div>

      {available.length === 0 ? (
        <p className="text-sm text-[var(--app-text-muted)]">
          {t('dashboard.allPanelsAdded', 'Wszystkie dostępne panele są już dodane')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((panel) => {
            const Icon = panel.icon
            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => onAdd(panel.id)}
                className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-3 py-2 text-sm text-[var(--app-text-primary)] transition-colors hover:border-amber-500/50 hover:text-amber-500"
              >
                <Plus size={14} />
                <Icon size={16} />
                <span>{t(panel.titleKey)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
