import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function ProjectsViewPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: projects = [], isLoading } = useProjects(workspaceSlug)

  const visibleProjects = projects.slice(0, 5)

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--app-text-primary)]">
          {t('dashboard.projectsView')}
        </h3>
        <button
          type="button"
          onClick={() => navigate({ to: `/${workspaceSlug}/projects` })}
          className="text-xs text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
        >
          {t('dashboard.seeAll')}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--app-bg-elevated)]" />
          ))}
        </div>
      ) : visibleProjects.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--app-text-muted)]">
          {t('dashboard.noProjects')}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => navigate({ to: `/${workspaceSlug}/projects/${project.id}` })}
              className="hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-bg-elevated)]/80 flex w-full items-center gap-3 rounded-xl border border-transparent bg-[var(--app-bg-elevated)] p-3 transition-all"
            >
              <div
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: project.color || 'var(--app-accent)' }}
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
                  {project.name}
                </p>
                <p className="text-xs text-[var(--app-text-muted)]">
                  {t(`dashboard.projectStatus.${project.status}`, project.status)}
                </p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-[var(--app-text-muted)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
