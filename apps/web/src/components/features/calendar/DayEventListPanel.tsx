import { useRef, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { CalendarEventType } from './CalendarView'
import { useTranslation } from 'react-i18next'

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
        case CalendarEventType.EVENT: return 'bg-amber-500'
        case CalendarEventType.MEETING: return 'bg-blue-500'
        case CalendarEventType.TASK: return 'bg-emerald-500'
        case CalendarEventType.REMINDER: return 'bg-purple-500'
        default: return 'bg-gray-500'
    }
}

function getTypeLabel(type?: CalendarEventType, t?: any) {
    switch (type) {
        case CalendarEventType.EVENT: return t ? t('calendar.panels.types.event') : 'Event'
        case CalendarEventType.MEETING: return t ? t('calendar.panels.types.meeting') : 'Meeting'
        case CalendarEventType.TASK: return t ? t('calendar.panels.types.task') : 'Task'
        case CalendarEventType.REMINDER: return t ? t('calendar.panels.types.reminder') : 'Reminder'
        default: return t ? t('calendar.panels.types.event') : 'Event'
    }
}

export function DayEventListPanel({
    date,
    events,
    isOpen,
    onClose,
    onEventClick,
}: DayEventListPanelProps) {
    const { t } = useTranslation()
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

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#16161f] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out border border-gray-800 ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 rounded-t-2xl bg-[#1e1e29]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Calendar size={20} className="text-amber-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{t('calendar.panels.daily_events_title')}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-400">{formattedDate}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-xs font-medium text-gray-300">
                            {t('calendar.panels.event_count', { count: events.length })}
                        </span>
                    </div>
                </div>

                {/* Event List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                            <p>{t('calendar.panels.no_events_day')}</p>
                        </div>
                    ) : (
                        events.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className="group p-4 rounded-xl bg-[#1a1a24] border border-gray-800/50 hover:border-gray-600 cursor-pointer transition-all hover:bg-[#1e1e2a]"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Type indicator */}
                                    <div className={`w-1 self-stretch rounded-full ${getTypeColor(event.type)} shrink-0 mt-0.5`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider ${event.type === CalendarEventType.MEETING ? 'bg-blue-500/10 text-blue-400' :
                                                event.type === CalendarEventType.TASK ? 'bg-emerald-500/10 text-emerald-400' :
                                                    event.type === CalendarEventType.REMINDER ? 'bg-purple-500/10 text-purple-400' :
                                                        'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {getTypeLabel(event.type, t)}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-medium text-white group-hover:text-amber-200 transition-colors truncate">
                                            {event.title}
                                        </h3>
                                        {event.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-gray-500">
                                            {!event.isAllDay && (
                                                <div className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    <span className="text-[11px]">
                                                        {format(parseISO(event.startAt), 'HH:mm')} – {format(parseISO(event.endAt), 'HH:mm')}
                                                    </span>
                                                </div>
                                            )}
                                            {event.isAllDay && (
                                                <span className="text-[11px] text-amber-500/80">{t('calendar.panels.all_day')}</span>
                                            )}
                                            {event.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    <span className="text-[11px] truncate max-w-[100px]">{event.location}</span>
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
