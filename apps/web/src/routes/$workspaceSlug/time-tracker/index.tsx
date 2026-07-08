import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { ChevronDown } from 'lucide-react'
import { sidebarIcons } from '@/components/dashboard/icons/SidebarIcons'

// Import modular components
import { MemberTimerView } from './components/MemberTimerView'
import { ManualEntryView } from './components/ManualEntryView'
import { HRApprovalView } from './components/HRApprovalView'
import { MemberContributionView } from './components/MemberContributionView'
import { OwnerDashboardView } from './components/OwnerDashboardView'
import { WeeklyCalendarView } from './components/WeeklyCalendarView'

export interface TimeTrackerSearch {
  view?: 'timer' | 'manual' | 'approval' | 'contribution' | 'dashboard' | 'calendar'
}

export const Route = createFileRoute('/$workspaceSlug/time-tracker/')({
  component: TimeTrackerPage,
  validateSearch: (search: Record<string, unknown>): TimeTrackerSearch => {
    const validViews: TimeTrackerSearch['view'][] = [
      'timer',
      'manual',
      'approval',
      'contribution',
      'dashboard',
      'calendar',
    ]
    const view = search.view as string | undefined
    return {
      view: validViews.includes(view as any) ? (view as any) : undefined,
    }
  },
})

export function TimeTrackerPage() {
  const { workspaceSlug } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const { t } = useTranslation()

  // Auth & Permissions
  const { data: sessionData } = useSession()
  const user = sessionData?.user
  const userId = user?.id

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug],
    queryFn: () =>
      apiFetchJson<{ success: boolean; data: any; userRole: string }>(
        `/api/workspaces/slug/${workspaceSlug}`
      ),
    enabled: !!workspaceSlug,
  })
  const role = workspaceData?.userRole

  const canManageEntries = ['owner', 'admin', 'hr_manager'].includes(role || '')
  const canApproveEntries = ['owner', 'admin', 'hr_manager', 'project_manager'].includes(role || '')

  // Navigation state
  const [view, setView] = useState<
    'timer' | 'manual' | 'approval' | 'contribution' | 'dashboard' | 'calendar'
  >(search.view || 'timer')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false)

  // Fetch projects
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsQueryError,
  } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      const json = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`)
      if (json?.success === false) throw new Error(json.error || 'Failed to fetch projects')
      return json?.data || []
    },
    enabled: !!workspaceSlug,
  })
  const projects = Array.isArray(projectsData) ? projectsData : []
  const projectsError = projectsQueryError?.message || null

  // Auto-select first project if only one exists or if none selected
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId)

  if (!user || !workspaceSlug) return null

  const navItems = [
    {
      id: 'timer',
      label: t('timeTracker.myTimer', 'My Timer'),
      iconKey: 'timetracker',
      show: true,
    },
    {
      id: 'manual',
      label: t('timeTracker.manualEntry', 'Manual Entry'),
      iconKey: 'timetracker',
      show: true,
    },
    {
      id: 'approval',
      label: t('timeTracker.approvals', 'Approvals'),
      iconKey: 'board',
      show: canApproveEntries,
    },
    {
      id: 'contribution',
      label: t('timeTracker.myContribution', 'My Contribution'),
      iconKey: 'team',
      show: true,
    },
    {
      id: 'dashboard',
      label: t('timeTracker.ownerDashboard', 'Owner Dashboard'),
      iconKey: 'dashboard',
      show: canManageEntries,
    },
    {
      id: 'calendar',
      label: t('timeTracker.weeklyCalendar', 'Weekly Calendar'),
      iconKey: 'calendar',
      show: true,
    },
  ]

  return (
    <div className="-m-4 -mb-24 min-h-[calc(100vh-64px)] bg-[var(--app-bg-deepest)] pb-20 pt-4 text-[var(--app-text-primary)] lg:-m-6 lg:-mb-6 lg:pt-0">
      {/* Header - Minimalist & Compact */}
      <div className="relative mb-4 pb-2 lg:mb-0 lg:pb-0">
        <div className="mx-auto flex h-auto max-w-7xl flex-col items-start justify-between gap-4 px-4 py-2 lg:h-16 lg:flex-row lg:items-center lg:gap-0 lg:py-0">
          <div className="flex w-full flex-col items-start gap-4">
            {/* View Switcher - Labeled, Pill Style, positioned on the left */}
            <div className="w-full max-w-full overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex w-fit gap-0.5 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-card)] p-1 shadow-sm">
                {navItems
                  .filter((i) => i.show)
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setView(item.id as any)
                        navigate({
                          to: '.',
                          search: { view: item.id as TimeTrackerSearch['view'] },
                        })
                      }}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        view === item.id
                          ? 'bg-[var(--app-bg-elevated)] text-[var(--app-accent)] shadow-md'
                          : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)]'
                      }`}
                    >
                      <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        {view === item.id
                          ? sidebarIcons[item.iconKey as keyof typeof sidebarIcons].gold
                          : sidebarIcons[item.iconKey as keyof typeof sidebarIcons].gray}
                      </div>
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex w-full justify-end lg:w-auto">
            {/* Project Selector - visible in Contribution and Dashboard when projects exist */}
            {projects.length > 0 && (view === 'contribution' || view === 'dashboard') && (
              <div className="relative">
                <button
                  onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}
                  className="hover:border-[var(--app-accent)]/50 flex h-9 min-w-[140px] items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-card)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] transition-all"
                >
                  <div className="h-1 w-1 rounded-full bg-[var(--app-accent)]" />
                  <span className="truncate">
                    {selectedProject?.name || t('common.selectProject', 'Select Project')}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${projectsDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {projectsDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-[var(--app-bg-elevated)] shadow-2xl">
                    <div className="p-1.5">
                      {projects.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedProjectId(p.id)
                            setProjectsDropdownOpen(false)
                          }}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                            selectedProjectId === p.id
                              ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)]'
                              : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-deepest)] hover:text-[var(--app-text-primary)]'
                          }`}
                        >
                          <div
                            className={`h-1 w-1 rounded-full ${selectedProjectId === p.id ? 'bg-white' : 'bg-[var(--app-accent)]'}`}
                          />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="mx-auto mt-8 max-w-7xl px-4">
        {isLoadingProjects && (view === 'contribution' || view === 'dashboard') ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
          </div>
        ) : projectsError && (view === 'contribution' || view === 'dashboard') ? (
          <div className="bg-[var(--app-bg-card)]/50 flex flex-col items-center justify-center rounded-3xl border border-red-500/10 py-16">
            <p className="mb-2 font-medium text-red-500">
              {t('timeTracker.projectsError', 'Nie udało się wczytać projektów')}
            </p>
            <p className="text-sm text-[var(--app-text-muted)]">{projectsError}</p>
          </div>
        ) : projects.length === 0 && (view === 'contribution' || view === 'dashboard') ? (
          <div className="bg-[var(--app-bg-card)]/50 flex flex-col items-center justify-center rounded-3xl border border-[var(--app-divider)] py-16">
            <p className="mb-1 font-medium text-[var(--app-text-primary)]">
              {t('timeTracker.noProjects', 'Brak projektów')}
            </p>
            <p className="text-sm text-[var(--app-text-muted)]">
              {t('timeTracker.noProjectsToTrack', 'W tym workspace nie ma jeszcze projektów.')}
            </p>
          </div>
        ) : (
          <>
            {view === 'timer' && userId && (
              <MemberTimerView workspaceSlug={workspaceSlug} userId={userId} />
            )}
            {view === 'manual' && userId && (
              <ManualEntryView
                workspaceSlug={workspaceSlug}
                userId={userId}
                canManage={canManageEntries}
              />
            )}
            {view === 'approval' && <HRApprovalView workspaceSlug={workspaceSlug} />}
            {view === 'contribution' && userId && (
              <MemberContributionView
                userId={userId}
                selectedProjectId={selectedProjectId}
                workspaceSlug={workspaceSlug}
              />
            )}
            {view === 'dashboard' && (
              <OwnerDashboardView
                selectedProjectId={selectedProjectId}
                projects={projects}
                workspaceSlug={workspaceSlug}
              />
            )}
            {view === 'calendar' && (
              <WeeklyCalendarView workspaceSlug={workspaceSlug} userId={userId} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
