import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, RotateCcw, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DASHBOARD_PANELS } from '@/components/dashboard/panels'
import type { DashboardLayoutItem } from '@/lib/dashboard'

interface DashboardPanelSidebarProps {
  isOpen: boolean
  layout: DashboardLayoutItem[]
  onAdd: (panelId: string) => void
  onClose: () => void
  onReset: () => void
}

export function DashboardPanelSidebar({
  isOpen,
  layout,
  onAdd,
  onClose,
  onReset,
}: DashboardPanelSidebarProps) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const activeIds = new Set(layout.map((i) => i.panelId))
  const available = DASHBOARD_PANELS.filter((p) => !activeIds.has(p.id))

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-0 z-[70] flex w-full max-w-[440px] transform flex-col overflow-hidden rounded-none border border-[var(--app-divider)] bg-[var(--app-bg-card)] font-sans shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:rounded-3xl',
          isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+3rem)]'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('dashboard.chooseTile', 'Wybierz kafelek')}
      >
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between gap-4 border-b border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-extrabold tracking-tight text-[var(--app-text-primary)]">
              {t('dashboard.chooseTile', 'Wybierz kafelek')}
            </h3>
            <p className="mt-1 truncate text-[13px] font-medium italic text-[var(--app-text-secondary)]">
              {t('dashboard.chooseTileSubtitle', 'Wybierz widżet, który chcesz dodać do pulpitu')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t('common.close', 'Zamknij')}
            className="rounded-none border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-2 text-[var(--app-text-muted)] shadow-sm transition-all hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)] sm:rounded-xl"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="custom-gantt-scroll flex-1 overflow-y-auto p-6">
          {available.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-bg-elevated)] text-[var(--app-text-muted)]">
                <Plus size={24} />
              </div>
              <p className="text-sm text-[var(--app-text-muted)]">
                {t('dashboard.allPanelsAdded', 'Wszystkie dostępne panele są już dodane')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {available.map((panel) => {
                const Icon = panel.icon
                return (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => {
                      onAdd(panel.id)
                      onClose()
                    }}
                    className="hover:border-[var(--app-accent)]/50 hover:bg-[var(--app-accent)]/5 group relative flex w-full items-center gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-4 text-left transition-all"
                  >
                    <div className="bg-[var(--app-accent)]/10 group-hover:bg-[var(--app-accent)]/20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--app-accent)] transition-colors">
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-[var(--app-text-primary)]">
                        {t(panel.titleKey)}
                      </h4>
                      {panel.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--app-text-muted)]">
                          {panel.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--app-bg-card)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-secondary)] ring-1 ring-[var(--app-border)]">
                      {panel.colSpan}/12
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6">
          <button
            type="button"
            onClick={() => {
              onReset()
              onClose()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--app-text-secondary)] transition-all hover:border-[var(--app-border)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]"
          >
            <RotateCcw size={16} />
            {t('dashboard.resetLayout', 'Przywróć domyślny układ')}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
