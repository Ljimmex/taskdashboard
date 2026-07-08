import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useTasks } from '@/hooks/useTasks'
import { Users, MessageCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function TeamMembersPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { members, isLoading } = useTeamMembers(workspaceSlug)
  const { data: tasks = [] } = useTasks(workspaceSlug)
  const dateLocale = i18n.language === 'pl' ? pl : enUS

  const activeTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach((task: any) => {
      if (task.isCompleted || task.isArchived) return
      const assignees = task.assignees || []
      assignees.forEach((userId: string) => {
        counts[userId] = (counts[userId] || 0) + 1
      })
      if (task.assigneeId) {
        counts[task.assigneeId] = (counts[task.assigneeId] || 0) + 1
      }
    })
    return counts
  }, [tasks])

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

  if (members.length === 0) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] py-8 text-center">
          <Users size={32} className="mb-2 text-[var(--app-text-muted)]" />
          <p className="text-sm font-medium text-[var(--app-text-primary)]">
            {t('dashboard.noTeamMembers', 'Brak członków zespołu')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
      <div className="space-y-2">
        {members.slice(0, 8).map((member) => {
          const activeTasks = activeTaskCounts[member.id] || 0
          const lastActive = member.lastActiveAt
            ? formatDistanceToNow(new Date(member.lastActiveAt), {
                addSuffix: true,
                locale: dateLocale,
              })
            : null

          return (
            <div
              key={member.id}
              className="bg-[var(--app-bg-elevated)]/40 group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-[var(--app-border)] hover:bg-[var(--app-bg-elevated)]"
            >
              <div className="relative shrink-0">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--app-bg-elevated)]">
                    <Users size={18} className="text-[var(--app-text-muted)]" />
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--app-bg-card)] ${
                    member.isOnline ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
                  {member.name}
                </p>
                <p className="truncate text-xs text-[var(--app-text-muted)]">
                  {member.position || member.email}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--app-text-muted)]">
                  {activeTasks > 0 && (
                    <span>
                      {activeTasks}{' '}
                      {t(activeTasks === 1 ? 'dashboard.activeTask' : 'dashboard.activeTasks')}
                    </span>
                  )}
                  {lastActive && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock size={10} />
                      {lastActive}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: `/${workspaceSlug}/messages` })}
                title={t('dashboard.sendMessage')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-text-muted)] opacity-0 transition-colors hover:bg-[var(--app-bg-card)] hover:text-amber-500 group-hover:opacity-100"
              >
                <MessageCircle size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
