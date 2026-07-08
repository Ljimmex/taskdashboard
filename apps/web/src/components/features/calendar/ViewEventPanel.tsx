import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Calendar, Clock, MapPin, Video, Edit3, Trash2, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { CalendarEventType } from './CalendarView'
import type { CalendarEvent } from './DayEventListPanel'
import { apiFetch } from '@/lib/api'
import { useSession } from '@/lib/auth'

interface ViewEventPanelProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onDeleted?: () => void
}

function getTypeColor(type?: CalendarEventType) {
  switch (type) {
    case CalendarEventType.EVENT:
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' }
    case CalendarEventType.MEETING:
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' }
    case CalendarEventType.TASK:
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' }
    case CalendarEventType.REMINDER:
      return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' }
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' }
  }
}

function getTypeLabel(type?: CalendarEventType, t?: any) {
  switch (type) {
    case CalendarEventType.EVENT:
      return t ? t('calendar.panels.types.event') : 'Event'
    case CalendarEventType.MEETING:
      return t ? t('calendar.panels.types.meeting') : 'Meeting'
    case CalendarEventType.TASK:
      return t ? t('calendar.panels.types.task') : 'Task'
    case CalendarEventType.REMINDER:
      return t ? t('calendar.panels.types.reminder') : 'Reminder'
    default:
      return t ? t('calendar.panels.types.event') : 'Event'
  }
}

function getTypeIcon(type?: CalendarEventType) {
  switch (type) {
    case CalendarEventType.MEETING:
      return <Video size={20} className="text-blue-400" />
    case CalendarEventType.TASK:
      return <Calendar size={20} className="text-emerald-400" />
    case CalendarEventType.REMINDER:
      return <Clock size={20} className="text-purple-400" />
    default:
      return <Calendar size={20} className="text-amber-400" />
  }
}

export function ViewEventPanel({ event, isOpen, onClose, onEdit, onDeleted }: ViewEventPanelProps) {
  const { t, i18n } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const { data: session } = useSession()

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

  const handleDelete = async () => {
    if (!event) return
    if (!confirm(t('calendar.panels.view_event.delete_confirm'))) return

    try {
      const res = await apiFetch(`/api/calendar/${event.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        onClose()
        onDeleted?.()
      } else {
        alert(t('calendar.panels.view_event.delete_error'))
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert(t('calendar.panels.view_event.delete_error'))
    }
  }

  if (!event) return null

  const colors = getTypeColor(event.type)
  const isCreator = session?.user?.id === event.createdBy || session?.user?.id === event.creator?.id

  // Get locale for date-fns
  const dateLocale = i18n.language === 'pl' ? pl : enUS
  const dateFormat = i18n.language === 'pl' ? 'EEEE, d MMMM yyyy' : 'EEEE, MMMM d, yyyy'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-xl sm:rounded-2xl ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 rounded-t-2xl border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] p-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`h-10 w-10 rounded-none sm:rounded-xl ${colors.bg} flex flex-shrink-0 items-center justify-center`}
            >
              {getTypeIcon(event.type)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-[var(--app-text-primary)]">
                {t('calendar.panels.view_event.title')}
              </h2>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${colors.bg} ${colors.text} truncate`}
                >
                  {getTypeLabel(event.type, t)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCreator && (
              <>
                <button
                  onClick={() => onEdit(event)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                  title={t('calendar.panels.edit_event_title')}
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title={t('calendar.panels.delete_event')}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="scrollbar-hide flex-1 space-y-6 overflow-y-auto p-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold leading-tight text-[var(--app-text-primary)]">
              {event.title}
            </h1>
          </div>

          {/* Description */}
          {event.description && (
            <div className="rounded-none bg-[var(--app-bg-input)] p-4 sm:rounded-xl">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--app-text-secondary)]">
                {event.description}
              </p>
            </div>
          )}

          {/* Date & Time */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
              {t('calendar.panels.date_time')}
            </h3>
            <div className="space-y-3 rounded-none bg-[var(--app-bg-input)] p-4 sm:rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-[var(--app-text-muted)]" />
                <span className="text-sm text-[var(--app-text-primary)]">
                  {format(parseISO(event.startAt), dateFormat, { locale: dateLocale })}
                </span>
              </div>
              {!event.isAllDay && (
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[var(--app-text-muted)]" />
                  <span className="text-sm text-[var(--app-text-primary)]">
                    {format(parseISO(event.startAt), 'HH:mm')} –{' '}
                    {format(parseISO(event.endAt), 'HH:mm')}
                  </span>
                </div>
              )}
              {event.isAllDay && (
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">
                    {t('calendar.panels.all_day_event')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                {t('calendar.panels.location')}
              </h3>
              <div className="rounded-none bg-[var(--app-bg-input)] p-4 sm:rounded-xl">
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-[var(--app-text-muted)]" />
                  <span className="text-sm text-[var(--app-text-primary)]">{event.location}</span>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {event.meetingLink && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                {t('calendar.panels.meeting_link')}
              </h3>
              <div className="rounded-none bg-[var(--app-bg-input)] p-4 sm:rounded-xl">
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 text-blue-400 transition-colors hover:text-blue-300"
                >
                  <Video size={16} />
                  <span className="flex-1 truncate text-sm">{event.meetingLink}</span>
                  <ExternalLink
                    size={14}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </a>
              </div>
            </div>
          )}

          {/* Creator */}
          {event.creator && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                {t('calendar.panels.created_by')}
              </h3>
              <div className="rounded-none bg-[var(--app-bg-input)] p-4 sm:rounded-xl">
                <div className="flex items-center gap-3">
                  {event.creator.image ? (
                    <img
                      src={event.creator.image}
                      alt={event.creator.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-black">
                      {event.creator.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-[var(--app-text-primary)]">
                    {event.creator.name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
