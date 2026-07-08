import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { X, CheckCircle2, BellOff, Clock, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { sidebarIcons } from '@/components/dashboard/icons/SidebarIcons'
import { useNotifications, NotificationItem } from '@/hooks/useNotifications'

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'All' | 'Tasks' | 'Messages' | 'Comments' | 'Assets' | 'Time'
  >('All')

  const { notifications, isLoading, markRead, markAllRead } = useNotifications()

  const currentLocale = i18n.language === 'pl' ? pl : enUS

  useEffect(() => {
    setMounted(true)
  }, [])

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'All') return notifications
    const mapping: Record<string, string[]> = {
      Tasks: ['task_created', 'task_assigned', 'task_status_changed', 'subtask_assigned'],
      Messages: ['message_new', 'message_pinned', 'conversation_message'],
      Comments: ['task_comment'],
      Assets: ['file_uploaded'],
      Time: ['time_entry_approved', 'time_entry_rejected'],
    }
    const types = mapping[activeTab] || []
    return notifications.filter((n) => types.includes(n.type))
  }, [notifications, activeTab])

  const groupedNotifications = useMemo(() => {
    const groups: { key: string; label: string; items: NotificationItem[] }[] = []
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const todayItems = filteredNotifications.filter(
      (n) => new Date(n.createdAt).toDateString() === today
    )
    const yesterdayItems = filteredNotifications.filter(
      (n) => new Date(n.createdAt).toDateString() === yesterday
    )
    const earlierItems = filteredNotifications.filter((n) => {
      const date = new Date(n.createdAt).toDateString()
      return date !== today && date !== yesterday
    })

    if (todayItems.length > 0)
      groups.push({ key: 'today', label: t('notifications.groups.today'), items: todayItems })
    if (yesterdayItems.length > 0)
      groups.push({
        key: 'yesterday',
        label: t('notifications.groups.yesterday'),
        items: yesterdayItems,
      })
    if (earlierItems.length > 0)
      groups.push({ key: 'earlier', label: t('notifications.groups.earlier'), items: earlierItems })

    return groups
  }, [filteredNotifications, t])

  const translateTitle = (item: NotificationItem): string => {
    if (item.title.startsWith('notifications.')) {
      return t(item.title, (item.metadata as any) || {}) as string
    }
    return item.title as string
  }

  const translateMessage = (item: NotificationItem): string | null => {
    if (item.message && item.message.startsWith('notifications.')) {
      const interpolationData = {
        ...((item.metadata as any) || {}),
        actor: item.actor?.name || t('common.someone'),
      }

      // Handle new_message preview from metadata
      if (
        item.message === 'notifications.messages.new_message' &&
        (item.metadata as any)?.preview
      ) {
        ;(interpolationData as any).preview = (item.metadata as any).preview
      }

      return t(item.message, interpolationData) as string
    }

    if (item.message && typeof item.message === 'string') {
      if (item.message.includes('przypisał Cię do zadania:')) {
        const title = item.message.split('zadańia:')[1] || (item.metadata as any)?.title || ''
        return t('notifications.messages.task_assigned', {
          actor: item.actor?.name,
          title,
        }) as string
      }
      if (item.message.includes('skomentował zadanie:')) {
        const title = item.message.split('zadanie:')[1] || (item.metadata as any)?.title || ''
        return t('notifications.messages.new_comment', { actor: item.actor?.name, title }) as string
      }
    }

    return item.message as string | null
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'fixed inset-0 z-[70] flex w-full max-w-[440px] transform flex-col overflow-hidden rounded-none border border-[var(--app-divider)] bg-[var(--app-bg-card)] font-sans shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:rounded-3xl',
          isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+3rem)]'
        )}
      >
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between gap-4 border-b border-[var(--app-divider)] bg-[var(--app-bg-card)] p-6">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-extrabold tracking-tight text-[var(--app-text-primary)]">
              {t('notifications.title')}
            </h3>
            <p className="mt-1 truncate text-[13px] font-medium italic text-[var(--app-text-secondary)]">
              {t('notifications.unreadCount', {
                count: notifications.filter((n) => !n.read).length,
              })}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                markAllRead()
              }}
              title={t('notifications.markAllReadTitle')}
              disabled={isLoading || notifications.length === 0}
              className="group rounded-none border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-2 text-[var(--app-text-muted)] shadow-sm transition-all hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-accent)] disabled:opacity-50 sm:rounded-xl"
            >
              <CheckCircle2 size={16} className="transition-transform group-hover:scale-110" />
            </button>
            <button
              onClick={onClose}
              title={t('notifications.closePanel')}
              className="rounded-none border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-2 text-[var(--app-text-muted)] shadow-sm transition-all hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)] sm:rounded-xl"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="custom-scrollbar no-scrollbar flex gap-6 overflow-x-auto border-b border-[var(--app-divider)] bg-[var(--app-bg-card)] px-6">
          {['All', 'Tasks', 'Messages', 'Comments', 'Assets', 'Time'].map((tab) => {
            const label = t(`notifications.tabs.${tab.toLowerCase()}`)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={clsx(
                  'relative flex items-center gap-2 whitespace-nowrap py-4 text-[13px] font-bold transition-all',
                  activeTab === tab
                    ? 'text-[var(--app-accent)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'
                )}
              >
                {label}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[var(--app-accent)] shadow-[0_-2px_10px_var(--app-accent)]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Content List */}
        <div className="custom-scrollbar bg-[var(--app-bg-sidebar)]/30 flex-1 space-y-8 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--app-text-muted)]">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--app-accent)] border-t-transparent" />
              <p className="text-sm font-bold tracking-tight">{t('notifications.loading')}</p>
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center text-[var(--app-text-muted)]">
              <div className="shadow-card mb-6 flex h-20 w-20 rotate-3 items-center justify-center rounded-none border border-[var(--app-border)] bg-[var(--app-bg-elevated)] sm:rounded-2xl">
                <BellOff size={32} className="text-[var(--app-text-muted)]/30 -rotate-3" />
              </div>
              <p className="text-lg font-extrabold tracking-tight text-[var(--app-text-primary)]">
                {t('notifications.noNotifications')}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--app-text-secondary)]">
                {t('notifications.noNotificationsDesc')}
              </p>
            </div>
          ) : (
            groupedNotifications.map((group) => (
              <div
                key={group.key}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="mb-4 flex items-center gap-4 px-2">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)]">
                    {group.label}
                  </h4>
                  <div className="h-[1px] flex-1 bg-[var(--app-divider)]" />
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={clsx(
                        'group relative flex cursor-pointer gap-4 rounded-none border p-4 transition-all sm:rounded-2xl',
                        !item.read
                          ? 'border-[var(--app-divider)] bg-[var(--app-bg-card)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.18)]'
                          : 'hover:bg-[var(--app-bg-card)]/40 border-transparent bg-transparent hover:border-[var(--app-divider)]'
                      )}
                      onClick={() => {
                        markRead(item.id)
                        if (item.link) {
                          const finalLink = item.link.startsWith('/') ? item.link : `/${item.link}`
                          navigate({ to: finalLink })
                        }
                        onClose()
                      }}
                    >
                      {!item.read && (
                        <div className="absolute right-5 top-5 z-10 h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent)]" />
                      )}

                      <div className="mt-0.5 flex-shrink-0">
                        <NotificationIcon type={item.type} />
                      </div>

                      <div className="min-w-0 flex-1 pr-4">
                        <div className="text-[14px] leading-tight text-[var(--app-text-primary)]">
                          {item.actor && (
                            <span className="mr-1.5 font-black text-[var(--app-accent)]">
                              {item.actor.name}
                            </span>
                          )}
                          <span className={clsx('font-medium', !item.read && 'font-bold')}>
                            {highlightKeywords(translateTitle(item))}
                          </span>
                        </div>

                        {item.message && (
                          <div className="border-[var(--app-accent)]/30 mt-2.5 line-clamp-2 border-l-2 py-0.5 pl-3 text-[12.5px] font-medium italic leading-relaxed text-[var(--app-text-secondary)] opacity-80 transition-opacity group-hover:opacity-100">
                            {translateMessage(item)}
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--app-text-muted)]">
                            <Clock size={12} className="opacity-50" />
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                              locale: currentLocale,
                            })}
                          </span>
                          {item.metadata?.taskId && (
                            <span className="bg-[var(--app-accent)]/10 border-[var(--app-accent)]/20 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--app-accent)]">
                              {t('notifications.types.task')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

function NotificationIcon({ type }: { type: string }) {
  const isTask = type.includes('task')
  const isComment = type.includes('comment')
  const isFile = type.includes('file') || type.includes('asset')
  const isTime = type.includes('time')
  const isMeeting = type.includes('meeting') || type.includes('event') || type.includes('reminder')
  const isMessage = type.includes('message') || type.includes('conversation')
  const isProject = type.includes('project')
  const isTeam = type.includes('team')

  let Icon: any = Bell
  let colorClass = 'text-gray-400 bg-gray-500/10 border-gray-500/20'

  if (isTask) {
    Icon = sidebarIcons.dashboard
    colorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  } else if (isComment) {
    Icon = sidebarIcons.messages
    colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  } else if (isMessage) {
    Icon = sidebarIcons.messages
    colorClass = 'text-blue-400 bg-blue-400/10 border-blue-400/20'
  } else if (isFile) {
    Icon = sidebarIcons.files
    colorClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20'
  } else if (isTime) {
    Icon = sidebarIcons.timetracker
    colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  } else if (isMeeting) {
    Icon = sidebarIcons.calendar
    colorClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  } else if (isProject) {
    Icon = sidebarIcons.product
    colorClass = 'text-[var(--app-accent)] bg-[var(--app-accent)]/10 border-[var(--app-accent)]/20'
  } else if (isTeam) {
    Icon = sidebarIcons.team
    colorClass = 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20'
  }

  return (
    <div
      className={clsx(
        'flex h-10 w-10 items-center justify-center rounded-none border shadow-sm transition-transform group-hover:scale-105 sm:rounded-2xl',
        colorClass
      )}
    >
      {typeof Icon === 'function' ? <Icon size={18} /> : Icon.gold}
    </div>
  )
}

function highlightKeywords(text: string) {
  if (!text) return null
  const parts = text.split(/([\[\(].*?[\]\)])/g)
  return parts.map((part, i) => {
    if (
      (part.startsWith('(') && part.endsWith(')')) ||
      (part.startsWith('[') && part.endsWith(']'))
    ) {
      return (
        <span
          key={i}
          className="bg-[var(--app-accent)]/5 mx-0.5 rounded px-1 font-extrabold text-[var(--app-accent)]"
        >
          {part}
        </span>
      )
    }
    return part
  })
}
