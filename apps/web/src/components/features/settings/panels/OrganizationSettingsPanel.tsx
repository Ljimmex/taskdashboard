import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetchJson } from '@/lib/api'
import { GeneralSettingsTab } from '../tabs/GeneralSettingsTab'
import { MembersSettingsTab } from '../tabs/MembersSettingsTab'
import { LabelsSettingsTab } from '../tabs/LabelsSettingsTab'
import { WorkspaceDefaultsTab } from '../tabs/WorkspaceDefaultsTab'
import { IntegrationsTab } from '../tabs/IntegrationsTab'
import { PlanSettingsTab } from '../tabs/PlanSettingsTab'

interface OrganizationSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function OrganizationSettingsPanel({ isOpen, onClose }: OrganizationSettingsPanelProps) {
  const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // We can fetch the workspace details here to pass to tabs
  const [activeTab, setActiveTab] = useState<
    'general' | 'members' | 'labels' | 'defaults' | 'integrations' | 'plan'
  >('general')

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return null
      const res = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
      return res
    },
    enabled: !!workspaceSlug && isOpen,
  })

  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current
      // Use a small buffer (5px) to handle sub-pixel issues
      setShowLeftArrow(scrollLeft > 5)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5)
    }
  }

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100)
    window.addEventListener('resize', checkScroll)
    return () => {
      window.removeEventListener('resize', checkScroll)
      clearTimeout(timer)
    }
  }, [workspace, isOpen, activeTab])

  const scroll = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = tabsRef.current.clientWidth * 0.6
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel - Floating Card Style */}
      <div
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[560px] sm:max-w-xl sm:rounded-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--app-text-primary)]">
              {t('dashboard.settings_panel.title')}
            </h2>
            <p className="text-sm text-[var(--app-text-secondary)]">
              {t('dashboard.settings_panel.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)]"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="group/tabs relative border-b border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-6">
          {/* Left Mask & Arrow */}
          <div
            className={cn(
              'pointer-events-none absolute bottom-0 left-0 top-0 z-20 w-12 bg-gradient-to-r from-[var(--app-bg-elevated)] to-transparent transition-opacity duration-300',
              showLeftArrow ? 'opacity-100' : 'opacity-0'
            )}
          />
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-card)] text-[var(--app-text-muted)] shadow-xl transition-all hover:scale-110 hover:text-[var(--app-text-primary)] active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div
            ref={tabsRef}
            onScroll={checkScroll}
            className="scrollbar-none no-scrollbar flex w-full gap-1 overflow-x-auto py-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`
                            .no-scrollbar::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
            <TabButton
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              label={t('dashboard.settings_tabs.general')}
            />
            <TabButton
              active={activeTab === 'members'}
              onClick={() => setActiveTab('members')}
              label={t('dashboard.settings_tabs.members')}
            />
            <TabButton
              active={activeTab === 'labels'}
              onClick={() => setActiveTab('labels')}
              label={t('dashboard.settings_tabs.labels')}
            />
            <TabButton
              active={activeTab === 'defaults'}
              onClick={() => setActiveTab('defaults')}
              label={t('dashboard.settings_tabs.defaults')}
            />
            <TabButton
              active={activeTab === 'integrations'}
              onClick={() => setActiveTab('integrations')}
              label={t('dashboard.settings_tabs.integrations')}
            />
            <TabButton
              active={activeTab === 'plan'}
              onClick={() => setActiveTab('plan')}
              label={t('dashboard.settings_tabs.plan')}
            />
          </div>

          {/* Right Mask & Arrow */}
          <div
            className={cn(
              'pointer-events-none absolute bottom-0 right-0 top-0 z-20 w-12 bg-gradient-to-l from-[var(--app-bg-elevated)] to-transparent transition-opacity duration-300',
              showRightArrow ? 'opacity-100' : 'opacity-0'
            )}
          />
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-2 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-card)] text-[var(--app-text-muted)] shadow-xl transition-all hover:scale-110 hover:text-[var(--app-text-primary)] active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="scrollbar-thin scrollbar-thumb-[var(--app-border)] scrollbar-track-transparent flex-1 overflow-y-auto overflow-x-hidden p-6">
          {isLoading ? (
            <div className="text-[var(--app-text-muted)]">{t('common.loading')}</div>
          ) : workspace ? (
            <>
              {activeTab === 'general' && <GeneralSettingsTab workspace={workspace} />}
              {activeTab === 'members' && <MembersSettingsTab workspace={workspace} />}
              {activeTab === 'labels' && <LabelsSettingsTab workspace={workspace} />}
              {activeTab === 'defaults' && <WorkspaceDefaultsTab workspace={workspace} />}
              {activeTab === 'integrations' && <IntegrationsTab workspace={workspace} />}
              {activeTab === 'plan' && <PlanSettingsTab workspace={workspace} />}
            </>
          ) : (
            <div className="text-red-500">{t('dashboard.settings_panel.error')}</div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? 'border-[var(--app-accent)] text-[var(--app-text-primary)]'
          : 'border-transparent text-[var(--app-text-secondary)] hover:border-[var(--app-border)] hover:text-[var(--app-text-primary)]'
      }`}
    >
      {label}
    </button>
  )
}
