import { useTranslation } from 'react-i18next'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { Users } from 'lucide-react'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function TeamMembersPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t } = useTranslation()
  const { members, isLoading } = useTeamMembers(workspaceSlug)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        {t('dashboard.noTeamMembers', 'Brak członków zespołu')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {members.slice(0, 6).map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[var(--app-bg-elevated)]"
        >
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-bg-elevated)]">
              <Users size={16} className="text-[var(--app-text-muted)]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
              {member.name}
            </p>
            <p className="text-xs text-[var(--app-text-muted)]">{member.position}</p>
          </div>
          {member.isOnline ? (
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" title="Online" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-gray-600" title="Offline" />
          )}
        </div>
      ))}
    </div>
  )
}
