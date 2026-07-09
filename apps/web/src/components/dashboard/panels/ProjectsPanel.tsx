import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { CreateProjectPanel } from '@/components/features/projects/CreateProjectPanel'
import type { DashboardPanelProps } from '@/lib/dashboard'

function getUniqueAssignees(
  members: any[] | undefined
): { id: string; name: string; avatar?: string }[] {
  const map = new Map<string, { id: string; name: string; avatar?: string }>()
  for (const m of members || []) {
    const user = m?.user
    const id = user?.id || m?.id
    const name = user?.name || m?.name
    if (!id || !name) continue
    map.set(id, {
      id,
      name,
      avatar: user?.image || m?.image || undefined,
    })
  }
  return Array.from(map.values())
}

export function ProjectsPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [projectFilter, setProjectFilter] = useState<'active' | 'pending'>('active')
  const [projectPage, setProjectPage] = useState(0)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)

  const {
    data: projectsRes,
    isLoading: isLoadingProjects,
    error: projectsQueryError,
  } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      const json = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`)
      if (json?.success === false) throw new Error(json.error || 'Failed to fetch projects')
      return json?.data || []
    },
  })

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug, session?.user?.id],
    queryFn: async () => {
      if (!workspaceSlug || !session?.user?.id) return null
      return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
        headers: { 'x-user-id': session.user.id },
      })
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
  })

  const projectsError = projectsQueryError?.message || null
  const projects = Array.isArray(projectsRes) ? projectsRes : []
  const now = new Date()

  const { ongoingProjects, pendingProjects } = useMemo(() => {
    if (!projects.length) return { ongoingProjects: [], pendingProjects: [] }
    const pending = projects.filter(
      (p: any) =>
        p.status === 'pending' ||
        (p.status === 'active' && p.startDate && new Date(p.startDate) > now)
    )
    const ongoing = projects.filter(
      (p: any) =>
        (p.status === 'active' || p.status === 'on_hold') &&
        (!p.startDate || new Date(p.startDate) <= now)
    )
    return { ongoingProjects: ongoing, pendingProjects: pending }
  }, [projects])

  const filteredProjects = projectFilter === 'active' ? ongoingProjects : pendingProjects
  const projectsPerPage = 2
  const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / projectsPerPage))
  const currentProjectPage = Math.min(projectPage, totalProjectPages - 1)
  const visibleProjects = filteredProjects.slice(
    currentProjectPage * projectsPerPage,
    currentProjectPage * projectsPerPage + projectsPerPage
  )

  const handleProjectCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ['projects', workspaceSlug] })
    setIsCreateProjectOpen(false)
  }

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-[var(--app-text-primary)]">
            {t('dashboard.projects')}
          </h3>
          {filteredProjects.length > projectsPerPage && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setProjectPage((p) => Math.max(0, p - 1))}
                disabled={currentProjectPage === 0}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalProjectPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setProjectPage(i)}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${i === currentProjectPage ? 'w-3 bg-amber-500' : 'bg-gray-600 hover:bg-gray-400'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setProjectPage((p) => Math.min(totalProjectPages - 1, p + 1))}
                disabled={currentProjectPage >= totalProjectPages - 1}
                className="rounded-lg p-1 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="flex rounded-full bg-[var(--app-bg-elevated)] p-1">
          <button
            onClick={() => {
              setProjectFilter('active')
              setProjectPage(0)
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              projectFilter === 'active'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-lg shadow-amber-500/10'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
            }`}
          >
            {t('dashboard.ongoing')} ({ongoingProjects.length})
          </button>
          <button
            onClick={() => {
              setProjectFilter('pending')
              setProjectPage(0)
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              projectFilter === 'pending'
                ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-lg shadow-amber-500/10'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]'
            }`}
          >
            {t('dashboard.pending')} ({pendingProjects.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {isLoadingProjects ? (
          <>
            <div className="h-[180px] animate-pulse rounded-2xl bg-gray-800/20" />
            <div className="h-[180px] animate-pulse rounded-2xl bg-gray-800/20" />
          </>
        ) : projectsError ? (
          <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-red-500/10 bg-red-500/5 py-12">
            <p className="mb-2 font-medium text-red-500">
              {t('dashboard.projectsError', 'Nie udało się wczytać projektów')}
            </p>
            <p className="text-sm text-gray-500">{projectsError}</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          visibleProjects.map((p: any) => (
            <ProjectCard
              key={p.id}
              id={p.id}
              title={p.name}
              timeRange={
                p.deadline
                  ? `${t('dashboard.until')} ${new Date(p.deadline).toLocaleDateString()}`
                  : t('dashboard.noDeadline')
              }
              progress={p.status === 'completed' ? 100 : 0}
              daysLeft={
                p.deadline
                  ? Math.max(
                      0,
                      Math.ceil(
                        (new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      )
                    )
                  : 0
              }
              assignees={getUniqueAssignees(p.members)}
              onViewProject={() => navigate({ to: `/${workspaceSlug}/projects/${p.id}` })}
            />
          ))
        ) : (
          <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl py-12">
            <p className="mb-4 text-gray-500">
              {projects.length === 0
                ? t('dashboard.noProjects')
                : projectFilter === 'active'
                  ? t('dashboard.noProjectsActive')
                  : t('dashboard.noProjectsPending')}
            </p>
            {projects.length === 0 &&
              workspaceData?.userRole &&
              !['member', 'guest'].includes(workspaceData.userRole) && (
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black"
                >
                  {t('dashboard.createProject')}
                </button>
              )}
            {projects.length > 0 && (
              <div className="flex gap-3">
                {projectFilter === 'active' && pendingProjects.length > 0 && (
                  <button
                    onClick={() => {
                      setProjectFilter('pending')
                      setProjectPage(0)
                    }}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--app-text-primary)] transition-colors hover:border-[var(--app-accent)]"
                  >
                    {t('dashboard.showPendingProjects')} ({pendingProjects.length})
                  </button>
                )}
                {projectFilter === 'pending' && ongoingProjects.length > 0 && (
                  <button
                    onClick={() => {
                      setProjectFilter('active')
                      setProjectPage(0)
                    }}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--app-text-primary)] transition-colors hover:border-[var(--app-accent)]"
                  >
                    {t('dashboard.showActiveProjects')} ({ongoingProjects.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateProjectPanel
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
        workspaceId={workspaceData?.id}
      />
    </div>
  )
}
