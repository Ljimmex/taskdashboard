import { useRef, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, Video, Edit3, Trash2, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { CalendarEventType } from './CalendarView'
import type { CalendarEvent } from './DayEventListPanel'
import { apiFetch } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { useTranslation } from 'react-i18next'

interface ViewEventPanelProps {
    event: CalendarEvent | null
    isOpen: boolean
    onClose: () => void
    onEdit: (event: CalendarEvent) => void
    onDeleted?: () => void
}

function getTypeColor(type?: CalendarEventType) {
    switch (type) {
        case CalendarEventType.EVENT: return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' }
        case CalendarEventType.MEETING: return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' }
        case CalendarEventType.TASK: return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' }
        case CalendarEventType.REMINDER: return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' }
        default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' }
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

function getTypeIcon(type?: CalendarEventType) {
    switch (type) {
        case CalendarEventType.MEETING: return <Video size={20} className="text-blue-400" />
        case CalendarEventType.TASK: return <Calendar size={20} className="text-emerald-400" />
        case CalendarEventType.REMINDER: return <Clock size={20} className="text-purple-400" />
        default: return <Calendar size={20} className="text-amber-400" />
    }
}

export function ViewEventPanel({
    event,
    isOpen,
    onClose,
    onEdit,
    onDeleted,
}: ViewEventPanelProps) {
    const { t } = useTranslation()
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
        if (!confirm(t('calendar.panels.delete_event_confirm'))) return

        try {
            const res = await apiFetch(`/api/calendar/${event.id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                onClose()
                onDeleted?.()
            } else {
                alert(t('calendar.panels.delete_error'))
            }
        } catch (err) {
            console.error('Delete error:', err)
            alert(t('calendar.panels.delete_error'))
        }
    }

    if (!event) return null

    const colors = getTypeColor(event.type)
    const isCreator = session?.user?.id === event.createdBy || session?.user?.id === event.creator?.id

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-xl bg-[#12121a] rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-800/50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#14141b] rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                            {getTypeIcon(event.type)}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{t('calendar.panels.event_details_title')}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider ${colors.bg} ${colors.text}`}>
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
                                    className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                    title={t('calendar.panels.edit_event_title')}
                                >
                                    <Edit3 size={18} />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title={t('calendar.panels.delete_event')}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {/* Title */}
                    <div>
                        <h1 className="text-2xl font-bold text-white leading-tight">{event.title}</h1>
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="bg-[#1a1a24] rounded-xl p-4">
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                        </div>
                    )}

                    {/* Date & Time */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('calendar.panels.date_time')}</h3>
                        <div className="bg-[#1a1a24] rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-gray-400" />
                                <span className="text-sm text-white">
                                    {format(parseISO(event.startAt), 'EEEE, MMMM d, yyyy')}
                                </span>
                            </div>
                            {!event.isAllDay && (
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-gray-400" />
                                    <span className="text-sm text-white">
                                        {format(parseISO(event.startAt), 'HH:mm')} – {format(parseISO(event.endAt), 'HH:mm')}
                                    </span>
                                </div>
                            )}
                            {event.isAllDay && (
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-amber-400" />
                                    <span className="text-sm text-amber-400 font-medium">{t('calendar.panels.all_day_event')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('calendar.panels.location')}</h3>
                            <div className="bg-[#1a1a24] rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="text-sm text-white">{event.location}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Meeting Link */}
                    {event.meetingLink && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('calendar.panels.meeting_link')}</h3>
                            <div className="bg-[#1a1a24] rounded-xl p-4">
                                <a
                                    href={event.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-blue-400 hover:text-blue-300 transition-colors group"
                                >
                                    <Video size={16} />
                                    <span className="text-sm truncate flex-1">{event.meetingLink}</span>
                                    <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Creator */}
                    {event.creator && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('calendar.panels.created_by')}</h3>
                            <div className="bg-[#1a1a24] rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    {event.creator.image ? (
                                        <img src={event.creator.image} alt={event.creator.name} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black text-xs font-bold">
                                            {event.creator.name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <span className="text-sm text-white font-medium">{event.creator.name}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
