import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/hooks/useProjects'
import { useProjectTasks } from '@/hooks/useProjectTasks'
import { FolderKanban } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DashboardPanelProps } from '@/lib/dashboard'
import { getInitials } from '@taskdashboard/utils'
import type { Task } from '@taskdashboard/types'

function MiniTaskCard({
  task,
  workspaceSlug,
  projectId,
}: {
  task: Task
  workspaceSlug: string
  projectId: string
}) {
  const navigate = useNavigate()
  const assignees = (task as any).assigneeDetails || []
  const visibleAssignees = assignees.slice(0, 3)
  const extraAssignees = assignees.length - visibleAssignees.length

  const priorityClass =
    task.priority === 'urgent' || task.priority === 'high'
      ? 'bg-red-500/10 text-red-500'
      : task.priority === 'medium'
        ? 'bg-amber-500/10 text-amber-500'
        : 'bg-blue-500/10 text-blue-500'

  return (
    <button
      type="button"
      onClick={() => navigate({ to: `/${workspaceSlug}/projects/${projectId}?taskId=${task.id}` })}
      className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] p-2.5 text-left transition-all hover:border-amber-500/30 hover:shadow-sm"
    >
      <p className="line-clamp-2 text-xs font-medium text-[var(--app-text-primary)]">
        {task.title}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase ${priorityClass}`}>
          {task.priority}
        </span>
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {visibleAssignees.map((assignee: any) => {
              const userImage = assignee.avatar || assignee.image
              const initials = getInitials(assignee.name || '') || '?'
              return (
                <div
                  key={assignee.id}
                  className={`flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--app-bg-card)] text-[9px] font-bold text-black ${userImage ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
                  title={assignee.name}
                >
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={assignee.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              )
            })}
            {extraAssignees > 0 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--app-bg-card)] bg-[var(--app-bg-elevated)] text-[9px] font-medium text-[var(--app-text-muted)]">
                +{extraAssignees}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

export function ProjectKanbanPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t } = useTranslation()
  const { data: projects = [], isLoading: projectsLoading } = useProjects(workspaceSlug)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    const saved = localStorage.getItem(`dashboard-kanban-project-${workspaceSlug}`)
    return saved && projects.some((p) => p.id === saved) ? saved : projects[0]?.id || ''
  })

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  )

  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(selectedProjectId)

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`dashboard-kanban-project-${workspaceSlug}`, projectId)
    }
  }

  const columns = useMemo(() => {
    if (!selectedProject?.stages?.length) return []
    const sortedStages = [...selectedProject.stages].sort((a, b) => a.position - b.position)
    const tasksByStatus: Record<string, Task[]> = {}
    tasks.forEach((task) => {
      const key = task.status || 'todo'
      tasksByStatus[key] = tasksByStatus[key] || []
      tasksByStatus[key].push(task)
    })
    return sortedStages.map((stage) => ({
      stage,
      tasks: tasksByStatus[stage.id] || [],
    }))
  }, [selectedProject, tasks])

  if (projectsLoading) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-xl bg-gray-800/20" />
          <div className="h-32 animate-pulse rounded-xl bg-gray-800/20" />
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] py-12 text-center">
          <FolderKanban size={32} className="mb-2 text-[var(--app-text-muted)]" />
          <p className="text-sm font-medium text-[var(--app-text-primary)]">
            {t('dashboard.noProjects', 'Brak projektów')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full max-h-[480px] min-h-[280px] flex-col overflow-hidden rounded-2xl bg-[var(--app-bg-card)] p-5">
      <div className="mb-3">
        <Select value={selectedProjectId} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-auto min-w-[180px] border-[var(--app-border)] bg-[var(--app-bg-elevated)] !text-[var(--app-text-primary)] focus:ring-amber-500 focus:ring-offset-0">
            <SelectValue placeholder={t('dashboard.selectProject')} />
          </SelectTrigger>
          <SelectContent className="border-[var(--app-border)] bg-[var(--app-bg-elevated)] !text-[var(--app-text-primary)]">
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                className="!text-[var(--app-text-primary)] focus:bg-[var(--app-bg-card)] focus:text-[var(--app-text-primary)]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: project.color || 'var(--app-text-muted)' }}
                  />
                  {project.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tasksLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-gray-800/20" />
      ) : columns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] py-8 text-center">
          <p className="text-sm text-[var(--app-text-muted)]">
            {t('dashboard.noProjectStages', 'Brak kolumn w tym projekcie')}
          </p>
        </div>
      ) : (
        <div className="custom-gantt-scroll flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-2">
          {columns.map(({ stage, tasks }) => (
            <div
              key={stage.id}
              className="bg-[var(--app-bg-elevated)]/30 flex h-full min-h-0 w-52 shrink-0 flex-col rounded-xl border border-[var(--app-border)] p-2"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: stage.color || 'var(--app-text-muted)' }}
                  />
                  <span className="text-xs font-semibold text-[var(--app-text-primary)]">
                    {stage.name}
                  </span>
                </div>
                <span className="rounded-full bg-[var(--app-bg-card)] px-1.5 py-0.5 text-[10px] text-[var(--app-text-muted)]">
                  {tasks.length}
                </span>
              </div>
              <div className="custom-gantt-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="py-4 text-center text-[10px] text-[var(--app-text-muted)]">
                    {t('dashboard.noTasks', 'Brak zadań')}
                  </p>
                ) : (
                  tasks.map((task) => (
                    <MiniTaskCard
                      key={task.id}
                      task={task}
                      workspaceSlug={workspaceSlug}
                      projectId={selectedProjectId}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
