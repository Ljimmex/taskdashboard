import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTasks } from '@/hooks/useTasks'
import { CalendarClock } from 'lucide-react'
import { isToday, format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function TasksDueTodayPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: tasks = [], isLoading } = useTasks(workspaceSlug)
  const dateLocale = i18n.language === 'pl' ? pl : enUS

  const dueToday = useMemo(() => {
    return tasks
      .filter((task: any) => {
        if (task.isCompleted || task.isArchived || !task.dueDate) return false
        return isToday(new Date(task.dueDate))
      })
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [tasks])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
      </div>
    )
  }

  if (dueToday.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        {t('dashboard.noTasksDueToday', 'Brak zadań na dziś')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {dueToday.map((task: any) => (
        <button
          key={task.id}
          type="button"
          onClick={() =>
            navigate({ to: `/${workspaceSlug}/projects/${task.projectId}?taskId=${task.id}` })
          }
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--app-bg-elevated)]"
        >
          <CalendarClock size={18} className="text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
              {task.title}
            </p>
            <p className="text-xs text-[var(--app-text-muted)]">
              {format(new Date(task.dueDate), 'p', { locale: dateLocale })}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
