import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/auth'
import { useTasks, isTaskBlocked } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { useStartTimer } from '@/hooks/useTimeEntries'
import { CheckCircle2, Circle, AlertCircle, Play, Timer, ArrowRight, Briefcase } from 'lucide-react'
import { format, isPast, isToday, isTomorrow, type Locale } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import type { DashboardPanelProps } from '@/lib/dashboard'
import type { Task } from '@taskdashboard/types'

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function getPriorityClass(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'medium':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    default:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  }
}

function getStatusClass(status: string, isCompleted: boolean) {
  if (isCompleted) return 'bg-green-500/10 text-green-500 border-green-500/20'
  if (status === 'in_progress' || status === 'in-progress') {
    return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  }
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
}

function formatDueDate(date: Date, locale: Locale) {
  if (isToday(date)) return 'dashboard.today'
  if (isTomorrow(date)) return 'dashboard.tomorrow'
  return format(date, 'PPP', { locale })
}

export function MyTasksPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: session } = useSession()
  const { data: tasks = [], isLoading } = useTasks(workspaceSlug)
  const { data: projects = [] } = useProjects(workspaceSlug)
  const startTimer = useStartTimer()
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null)
  const dateLocale = i18n.language === 'pl' ? pl : enUS

  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  const myTasks = useMemo(() => {
    const userId = session?.user?.id
    if (!userId) return []
    return tasks
      .filter((task: Task) => {
        if (task.isCompleted || task.isArchived) return false
        const assignees = (task as any).assignees || []
        const assigneeId = (task as any).assigneeId
        return assignees.includes(userId) || assigneeId === userId
      })
      .map((task) => ({ task, blocked: isTaskBlocked(task, tasks) }))
      .sort((a, b) => {
        const pa = PRIORITY_WEIGHT[a.task.priority] || 0
        const pb = PRIORITY_WEIGHT[b.task.priority] || 0
        if (pb !== pa) return pb - pa
        if (!a.task.dueDate && !b.task.dueDate) return 0
        if (!a.task.dueDate) return 1
        if (!b.task.dueDate) return -1
        return new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime()
      })
      .slice(0, 7)
  }, [tasks, session?.user?.id])

  const handleStartTimer = async (task: Task) => {
    setStartingTaskId(task.id)
    try {
      await startTimer.mutateAsync({
        taskId: task.id,
        workspaceSlug,
        description: task.title,
      })
    } finally {
      setStartingTaskId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded-xl bg-gray-800/20" />
          <div className="h-14 animate-pulse rounded-xl bg-gray-800/20" />
          <div className="h-14 animate-pulse rounded-xl bg-gray-800/20" />
        </div>
      </div>
    )
  }

  if (myTasks.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] py-8 text-center">
          <CheckCircle2 size={32} className="mb-2 text-[var(--app-text-muted)]" />
          <p className="text-sm font-medium text-[var(--app-text-primary)]">
            {t('dashboard.noMyTasks', 'Brak przypisanych zadań')}
          </p>
          <p className="text-xs text-[var(--app-text-muted)]">
            {t('dashboard.allCaughtUp', 'Wszystko załatwione!')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
      <div className="space-y-2">
        {myTasks.map(({ task, blocked }) => {
          const project = projectMap[task.projectId]
          const dueDateText = task.dueDate ? t(formatDueDate(task.dueDate, dateLocale)) : null
          const isOverdue =
            task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))

          return (
            <div
              key={task.id}
              className="bg-[var(--app-bg-elevated)]/40 group relative flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-[var(--app-border)] hover:bg-[var(--app-bg-elevated)]"
            >
              <button
                type="button"
                onClick={() =>
                  navigate({ to: `/${workspaceSlug}/projects/${task.projectId}?taskId=${task.id}` })
                }
                className="flex flex-1 items-center gap-3 overflow-hidden text-left"
              >
                {task.isCompleted ? (
                  <CheckCircle2 size={18} className="shrink-0 text-green-500" />
                ) : blocked ? (
                  <span title={t('dashboard.taskBlocked')}>
                    <AlertCircle size={18} className="shrink-0 text-red-500" />
                  </span>
                ) : (
                  <Circle size={18} className="shrink-0 text-[var(--app-text-muted)]" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
                    {task.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-muted)]">
                    {project && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase size={10} />
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: project.color || 'var(--app-text-muted)' }}
                        />
                        {project.name}
                      </span>
                    )}
                    {dueDateText && (
                      <span className={isOverdue ? 'font-medium text-red-400' : ''}>
                        {isOverdue && '• '}
                        {dueDateText}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${getPriorityClass(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
                <span
                  className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase sm:inline-block ${getStatusClass(
                    task.status,
                    task.isCompleted
                  )}`}
                >
                  {task.status}
                </span>

                <button
                  type="button"
                  onClick={() => handleStartTimer(task)}
                  disabled={startingTaskId === task.id || blocked}
                  title={t('dashboard.startTimer')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-amber-500/10 hover:text-amber-500 disabled:opacity-50"
                >
                  {startingTaskId === task.id ? (
                    <Timer size={14} className="animate-pulse" />
                  ) : (
                    <Play size={14} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: `/${workspaceSlug}/projects/${task.projectId}?taskId=${task.id}`,
                    })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-muted)] opacity-0 transition-colors hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)] group-hover:opacity-100"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
