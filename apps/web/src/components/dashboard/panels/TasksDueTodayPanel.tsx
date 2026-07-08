import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTasks, isTaskBlocked } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { useStartTimer, useCompleteTask } from '@/hooks/useTimeEntries'
import { CalendarClock, AlertCircle, Play, Check, Briefcase, ArrowRight } from 'lucide-react'
import { isToday, format, isPast } from 'date-fns'
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

export function TasksDueTodayPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: tasks = [], isLoading } = useTasks(workspaceSlug)
  const { data: projects = [] } = useProjects(workspaceSlug)
  const startTimer = useStartTimer()
  const completeTask = useCompleteTask()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const dateLocale = i18n.language === 'pl' ? pl : enUS

  const projectMap = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  const dueToday = useMemo(() => {
    return tasks
      .filter((task: Task) => {
        if (task.isCompleted || task.isArchived || !task.dueDate) return false
        return isToday(new Date(task.dueDate))
      })
      .map((task) => ({ task, blocked: isTaskBlocked(task, tasks) }))
      .sort((a, b) => {
        const pa = PRIORITY_WEIGHT[a.task.priority] || 0
        const pb = PRIORITY_WEIGHT[b.task.priority] || 0
        if (pb !== pa) return pb - pa
        return new Date(a.task.dueDate!).getTime() - new Date(b.task.dueDate!).getTime()
      })
      .slice(0, 7)
  }, [tasks])

  const handleStartTimer = async (task: Task) => {
    setProcessingId(task.id)
    try {
      await startTimer.mutateAsync({
        taskId: task.id,
        workspaceSlug,
        description: task.title,
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleComplete = async (task: Task) => {
    setProcessingId(task.id)
    try {
      await completeTask.mutateAsync({ taskId: task.id, workspaceSlug })
    } finally {
      setProcessingId(null)
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

  if (dueToday.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] py-8 text-center">
          <CalendarClock size={32} className="mb-2 text-[var(--app-text-muted)]" />
          <p className="text-sm font-medium text-[var(--app-text-primary)]">
            {t('dashboard.noTasksDueToday', 'Brak zadań na dziś')}
          </p>
          <p className="text-xs text-[var(--app-text-muted)]">
            {t('dashboard.relax', 'Możesz odetchnąć')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
      <div className="space-y-2">
        {dueToday.map(({ task, blocked }) => {
          const project = projectMap[task.projectId]
          const dueTime = task.dueDate
            ? format(new Date(task.dueDate), 'p', { locale: dateLocale })
            : null
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
                {blocked ? (
                  <span title={t('dashboard.taskBlocked')}>
                    <AlertCircle size={18} className="shrink-0 text-red-500" />
                  </span>
                ) : (
                  <CalendarClock size={18} className="shrink-0 text-amber-500" />
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
                    {dueTime && (
                      <span className={isOverdue ? 'font-medium text-red-400' : ''}>
                        {isOverdue && '• '}
                        {dueTime}
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

                <button
                  type="button"
                  onClick={() => handleStartTimer(task)}
                  disabled={processingId === task.id || blocked}
                  title={t('dashboard.startTimer')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-amber-500/10 hover:text-amber-500 disabled:opacity-50"
                >
                  <Play size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => handleComplete(task)}
                  disabled={processingId === task.id || blocked}
                  title={t('dashboard.markDone')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-green-500/10 hover:text-green-500 disabled:opacity-50"
                >
                  <Check size={14} />
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
