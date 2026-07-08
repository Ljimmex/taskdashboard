import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar, Clock, MapPin, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { CalendarEventType } from './CalendarView'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startAt: string
  endAt: string
  type?: CalendarEventType
  location?: string
  meetingLink?: string
  meetingType?: 'physical' | 'virtual'
  isAllDay?: boolean
  teamIds?: string[]
  createdBy?: string
  creator?: { id: string; name: string; image?: string }
  assignees?: { id: string; name: string; image?: string }[]
}

interface DayEventListPanelProps {
  date: Date | null
  events: CalendarEvent[]
  isOpen: boolean
  onClose: () => void
  onEventClick: (event: CalendarEvent) => void
}

function getTypeColor(type?: CalendarEventType) {
  switch (type) {
    case CalendarEventType.EVENT:
      return 'bg-amber-500'
    case CalendarEventType.MEETING:
      return 'bg-blue-500'
    case CalendarEventType.TASK:
      return 'bg-emerald-500'
    case CalendarEventType.REMINDER:
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}

function getTypeLabel(type?: CalendarEventType, t: (key: string) => string = (k) => k) {
  switch (type) {
    case CalendarEventType.EVENT:
      return t('calendar.panels.types.event')
    case CalendarEventType.MEETING:
      return t('calendar.panels.types.meeting')
    case CalendarEventType.TASK:
      return t('calendar.panels.types.task')
    case CalendarEventType.REMINDER:
      return t('calendar.panels.types.reminder')
    default:
      return t('calendar.panels.types.event')
  }
}

export function DayEventListPanel({
  date,
  events,
  isOpen,
  onClose,
  onEventClick,
}: DayEventListPanelProps) {
  const { t, i18n } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!date) return null

  const dateLocale = i18n.language === 'pl' ? pl : enUS
  const dateFormat = i18n.language === 'pl' ? 'EEEE, d MMMM yyyy' : 'EEEE, MMMM d, yyyy'
  const formattedDate = format(date, dateFormat, { locale: dateLocale })

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-bg-sidebar)] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
      >
        {/* Header */}
        <div className="flex-none rounded-t-2xl border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--app-border)] bg-[var(--app-bg-input)] sm:rounded-xl">
                <Calendar size={20} className="text-[var(--app-text-muted)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--app-text-primary)]">
                {t('calendar.panels.day_list.title')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-[var(--app-text-secondary)]">{formattedDate}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-lg bg-[var(--app-bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-secondary)]">
              {t('calendar.panels.day_list.count', { count: events.length })}
            </span>
          </div>
        </div>

        {/* Event List */}
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {events.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-sm text-[var(--app-text-muted)]">
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-none border border-[var(--app-border)] bg-[var(--app-bg-input)] sm:rounded-2xl">
                  <Calendar className="h-8 w-8 text-[var(--app-text-muted)]" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-[var(--app-text-primary)]">
                  {t('calendar.no_events')}
                </h3>
                <p className="max-w-[200px] text-xs leading-relaxed text-[var(--app-text-muted)]">
                  {t('calendar.no_events_desc')}
                </p>
              </div>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className="group cursor-pointer rounded-none border border-[var(--app-border)] bg-[var(--app-bg-card)] p-4 transition-all hover:border-amber-500/50 hover:bg-[var(--app-bg-elevated)] sm:rounded-xl"
              >
                <div className="flex items-start gap-3">
                  {/* Type indicator */}
                  <div
                    className={`w-1 self-stretch rounded-full ${getTypeColor(event.type)} mt-0.5 shrink-0`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                          event.type === CalendarEventType.MEETING
                            ? 'bg-blue-500/10 text-blue-500'
                            : event.type === CalendarEventType.TASK
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : event.type === CalendarEventType.REMINDER
                                ? 'bg-purple-500/10 text-purple-500'
                                : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {getTypeLabel(event.type, t)}
                      </span>
                    </div>
                    <h3 className="truncate text-sm font-medium text-[var(--app-text-primary)] transition-colors group-hover:text-amber-500">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--app-text-muted)]">
                        {event.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[var(--app-text-muted)]">
                      {!event.isAllDay && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span className="text-[11px]">
                            {format(parseISO(event.startAt), 'HH:mm')} –{' '}
                            {format(parseISO(event.endAt), 'HH:mm')}
                          </span>
                        </div>
                      )}
                      {event.isAllDay && (
                        <span className="text-[11px] text-amber-500/80">
                          {t('calendar.panels.all_day')}
                        </span>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span className="max-w-[100px] truncate text-[11px]">
                            {event.location}
                          </span>
                        </div>
                      )}
                      {event.meetingLink && (
                        <div className="flex items-center gap-1">
                          <Video size={12} className="text-blue-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
