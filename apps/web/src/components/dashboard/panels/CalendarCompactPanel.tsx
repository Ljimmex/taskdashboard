import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { CalendarEventPanel } from '@/components/features/calendar/CalendarEventPanel'
import { EditEventPanel } from '@/components/features/calendar/EditEventPanel'
import { CalendarEventType } from '@/components/dashboard/CalendarSection'
import { Calendar, Plus, Clock, MapPin, Video } from 'lucide-react'
import { isToday, isTomorrow, format, addDays, isSameDay, startOfDay } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import type { DashboardPanelProps } from '@/lib/dashboard'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startAt: string
  endAt?: string
  type: 'event' | 'meeting' | 'reminder' | 'task'
  location?: string
  meetingLink?: string
  meetingType?: 'physical' | 'virtual'
  createdBy?: string
  creator?: { id: string; name: string; image?: string }
  assignees?: { id: string; name: string; image?: string; avatar?: string }[]
}

export function CalendarCompactPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t, i18n } = useTranslation()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const dateLocale = i18n.language === 'pl' ? pl : enUS

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const { data: eventsRes, isLoading } = useQuery({
    queryKey: ['calendar_events', workspaceSlug],
    queryFn: async () =>
      apiFetchJson<{ data: CalendarEvent[] }>(`/api/calendar?workspaceSlug=${workspaceSlug}`),
  })

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug, session?.user?.id],
    queryFn: async () => {
      if (!workspaceSlug || !session?.user?.id) return null
      return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
        headers: { 'x-user-id': session.user.id },
      })
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
  })

  const canCreateCalendarEvents = workspaceData?.userRole
    ? !['member', 'guest'].includes(workspaceData.userRole)
    : true

  const userId = session?.user?.id

  const groupedEvents = useMemo(() => {
    const now = startOfDay(new Date())
    const weekEnd = addDays(now, 7)
    const allEvents = (eventsRes?.data || []).filter((e: CalendarEvent) => {
      const start = new Date(e.startAt)
      if (start < now) return false
      if (start > weekEnd) return false
      const isCreator = e.createdBy === userId || e.creator?.id === userId
      const isAssignee = e.assignees?.some((a) => a.id === userId)
      return isCreator || isAssignee
    })
    allEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

    const groups: { label: string; date: Date; events: CalendarEvent[] }[] = []
    for (let i = 0; i < 8; i++) {
      const date = addDays(now, i)
      const dayEvents = allEvents.filter((e) => isSameDay(new Date(e.startAt), date))
      if (dayEvents.length === 0) continue
      let label = format(date, 'EEEE', { locale: dateLocale })
      if (isToday(date)) label = t('dashboard.today')
      else if (isTomorrow(date)) label = t('dashboard.tomorrow')
      groups.push({ label, date, events: dayEvents })
    }
    return groups
  }, [eventsRes, userId, dateLocale, t])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['calendar_events', workspaceSlug] })
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-[var(--app-bg-card)] p-5">
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
          <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
          <div className="h-12 animate-pulse rounded-xl bg-gray-800/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-[var(--app-bg-card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        {canCreateCalendarEvents && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-black transition-colors hover:bg-amber-400"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {groupedEvents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] py-8 text-center">
          <Calendar size={32} className="mb-2 text-[var(--app-text-muted)]" />
          <p className="text-sm font-medium text-[var(--app-text-primary)]">
            {t('dashboard.noEventsThisWeek', 'Brak wydarzeń w tym tygodniu')}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {groupedEvents.map(({ label, date, events }) => (
            <div key={label}>
              <h4 className="mb-1.5 text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                {label}{' '}
                <span className="font-normal normal-case">
                  {format(date, 'd MMM', { locale: dateLocale })}
                </span>
              </h4>
              <div className="space-y-2">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setEditingEvent(event)
                      setIsEditOpen(true)
                    }}
                    className="bg-[var(--app-bg-elevated)]/40 flex w-full items-start gap-2 rounded-xl border border-transparent p-2 text-left transition-all hover:border-[var(--app-border)] hover:bg-[var(--app-bg-elevated)]"
                  >
                    <div className="mt-0.5 shrink-0 text-[var(--app-text-muted)]">
                      {event.type === 'meeting' ? (
                        <Video size={14} />
                      ) : event.type === 'reminder' ? (
                        <Clock size={14} />
                      ) : (
                        <Calendar size={14} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--app-text-primary)]">
                        {event.title}
                      </p>
                      <p className="text-xs text-[var(--app-text-muted)]">
                        {format(new Date(event.startAt), 'p', { locale: dateLocale })}
                        {event.location && (
                          <span className="ml-1 inline-flex items-center gap-0.5">
                            <MapPin size={10} />
                            {event.location}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {canCreateCalendarEvents && (
        <CalendarEventPanel
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleRefresh}
          defaultType={CalendarEventType.EVENT}
          workspaceSlug={workspaceSlug}
          canCreateEvents={canCreateCalendarEvents}
          userRole={workspaceData?.userRole}
        />
      )}
      <EditEventPanel
        event={editingEvent as any}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditingEvent(null)
        }}
        workspaceSlug={workspaceSlug}
        onUpdated={handleRefresh}
        canCreateTeamEvents={canCreateCalendarEvents}
      />
    </div>
  )
}
