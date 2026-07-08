import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import type { DashboardPanelProps } from '@/lib/dashboard'

export function NotificationsPanel(_props: DashboardPanelProps) {
  const { t, i18n } = useTranslation()
  const { notifications = [], isLoading } = useNotifications()
  const dateLocale = i18n.language === 'pl' ? pl : enUS

  const items = useMemo(() => {
    return [...notifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [notifications])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        {t('dashboard.noNotifications', 'Brak powiadomień')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <a
          key={n.id}
          href={n.link || '#'}
          className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-[var(--app-bg-elevated)]"
        >
          <Bell size={18} className={n.read ? 'text-gray-500' : 'text-amber-500'} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--app-text-primary)]">{t(n.title)}</p>
            <p className="truncate text-xs text-[var(--app-text-muted)]">{t(n.message)}</p>
            <p className="mt-1 text-[10px] text-gray-500">
              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: dateLocale })}
            </p>
          </div>
          {!n.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />}
        </a>
      ))}
    </div>
  )
}
