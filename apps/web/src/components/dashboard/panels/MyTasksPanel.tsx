import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/auth'
import { useTasks } from '@/hooks/useTasks'
import { CheckCircle2, Circle } from 'lucide-react'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function MyTasksPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: session } = useSession()
  const { data: tasks = [], isLoading } = useTasks(workspaceSlug)
  const dateLocale = i18n.language === 'pl' ? pl : enUS

  const myTasks = useMemo(() => {
    const userId = session?.user?.id
    if (!userId) return []
    return tasks
      .filter((task: any) => {
        if (task.isCompleted || task.isArchived) return false
        const assignees = task.assignees || []
        return assignees.includes(userId) || task.assigneeId === userId
      })
      .sort((a: any, b: any) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      .slice(0, 5)
  }, [tasks, session?.user?.id])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
      </div>
    )
  }

  if (myTasks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        {t('dashboard.noMyTasks', 'Brak przypisanych zadań')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {myTasks.map((task: any) => (
        <button
          key={task.id}
          type="button"
          onClick={() =>
            navigate({ to: `/${workspaceSlug}/projects/${task.projectId}?taskId=${task.id}` })
          }
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--app-bg-elevated)]"
        >
          {task.isCompleted ? (
            <CheckCircle2 size={18} className="text-green-500" />
          ) : (
            <Circle size={18} className="text-[var(--app-text-muted)]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
              {task.title}
            </p>
            {task.dueDate && (
              <p className="text-xs text-[var(--app-text-muted)]">
                {format(new Date(task.dueDate), 'PPP', { locale: dateLocale })}
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
              task.priority === 'high' || task.priority === 'urgent'
                ? 'bg-red-500/10 text-red-500'
                : task.priority === 'medium'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-blue-500/10 text-blue-500'
            }`}
          >
            {task.priority}
          </span>
        </button>
      ))}
    </div>
  )
}
