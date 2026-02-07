import { useState, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, format, parseISO, isWeekend } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { CalendarHeader } from './CalendarHeader'
import { CalendarEventPanel } from './CalendarEventPanel'
import { cn } from '@/lib/utils'

// Enum mirroring backend - Exported so CalendarHeader can use it
export enum CalendarEventType {
    EVENT = 'event',
    TASK = 'task',
    MEETING = 'meeting',
    REMINDER = 'reminder'
}

interface Event {
    id: string
    title: string
    startAt: string
    endAt: string
    teamId: string
    type?: CalendarEventType
}

export function CalendarView() {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug/calendar' })
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<Event[]>([])

    // Filter State
    const [selectedTypes, setSelectedTypes] = useState<CalendarEventType[]>([
        CalendarEventType.EVENT,
        CalendarEventType.TASK,
        CalendarEventType.MEETING,
        CalendarEventType.REMINDER
    ])
    const [showWeekends, setShowWeekends] = useState(true)
    const [weekStartDay, setWeekStartDay] = useState<'monday' | 'sunday'>('monday')
    const [isEventPanelOpen, setIsEventPanelOpen] = useState(false)

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch(`/api/calendar?workspaceSlug=${workspaceSlug}`)
                if (res.ok) {
                    const data = await res.json()
                    setEvents(data.data || [])
                }
            } catch (error) {
                console.error('Failed to fetch calendar events', error)
            }
        }

        fetchEvents()
    }, [workspaceSlug, currentDate])

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: enUS, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
    const endDate = endOfWeek(monthEnd, { locale: enUS, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })

    let calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    if (!showWeekends) {
        calendarDays = calendarDays.filter(day => !isWeekend(day))
    }

    const weekDays = weekStartDay === 'monday'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const visibleWeekDays = showWeekends ? weekDays : weekDays.filter(d => d !== 'Sat' && d !== 'Sun')

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const goToToday = () => setCurrentDate(new Date())

    const toggleType = (type: CalendarEventType) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        )
    }

    const clearFilters = () => {
        setSelectedTypes([])
    }

    return (
        <div className="flex h-full w-full bg-[#12121a] rounded-2xl overflow-hidden font-sans">
            <div className="flex-1 flex flex-col p-6 min-w-0">
                <CalendarHeader
                    currentDate={currentDate}
                    onPrevMonth={prevMonth}
                    onNextMonth={nextMonth}
                    onToday={goToToday}
                    selectedTypes={selectedTypes}
                    toggleType={toggleType}
                    clearFilters={clearFilters}
                    showWeekends={showWeekends}
                    setShowWeekends={setShowWeekends}
                    weekStartDay={weekStartDay}
                    setWeekStartDay={setWeekStartDay}
                />

                {/* GRID KALENDARZA */}
                <div className="flex flex-col flex-1 rounded-2xl overflow-hidden bg-[#12121a]">
                    {/* Dni tygodnia */}
                    <div className={`grid grid-cols-${visibleWeekDays.length} border-b border-gray-800/50`}>
                        {visibleWeekDays.map((day) => (
                            <div key={day} className="py-3 text-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    {day}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Siatka dni */}
                    <div className={`grid grid-cols-${visibleWeekDays.length} flex-1 bg-[#12121a]`}>
                        {calendarDays.map((day, dayIdx) => {
                            const isCurrentMonth = isSameMonth(day, monthStart)
                            const isToday = isSameDay(day, new Date())
                            const isLastRow = dayIdx >= calendarDays.length - visibleWeekDays.length
                            const dayEvents = events
                                .filter(e => isSameDay(parseISO(e.startAt), day))
                                .filter(e => e.type ? selectedTypes.includes(e.type) : true)

                            return (
                                <div
                                    key={day.toString()}
                                    className={cn(
                                        "relative min-h-[100px] p-2 border-r border-gray-800/50 transition-all group hover:bg-[#16161f]",
                                        !isLastRow && "border-b",
                                        (dayIdx + 1) % visibleWeekDays.length === 0 && "border-r-0"
                                    )}
                                >
                                    <div className={cn("flex flex-col h-full", !isCurrentMonth ? "opacity-30" : "opacity-100")}>
                                        {/* Numer dnia */}
                                        <div className="flex justify-center mb-2">
                                            <span className={cn(
                                                "text-xs font-medium h-7 w-7 flex items-center justify-center rounded-full transition-all",
                                                isToday
                                                    ? "bg-[#F59E0B] text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                                    : "text-gray-500 group-hover:text-gray-300"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>

                                        {/* Kontener na eventy */}
                                        <div className="flex flex-col h-[calc(100%-2rem)]">
                                            <div className="flex-1 flex flex-col gap-1 px-1 overflow-hidden">
                                                {dayEvents.slice(0, 3).map((event) => (
                                                    <div
                                                        key={event.id}
                                                        className="bg-[#1a1a24] border border-gray-800/50 px-2 py-1.5 rounded-lg hover:border-gray-600 transition-colors cursor-pointer group/card shrink-0"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-gray-300 font-medium truncate">
                                                                {event.title}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <span className="text-[9px] text-gray-500 text-center shrink-0">+ {dayEvents.length - 3} more</span>
                                                )}
                                            </div>

                                            {/* Add Event Button (visible on hover) */}
                                            <div className="mt-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => setIsEventPanelOpen(true)}
                                                    className="w-full py-1 text-[10px] text-gray-500 border border-white/10 border-dashed rounded bg-white/5 hover:bg-white/10 hover:text-gray-300 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <span>+</span> Add event
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            <CalendarEventPanel
                isOpen={isEventPanelOpen}
                onClose={() => setIsEventPanelOpen(false)}
                workspaceSlug={workspaceSlug}
            />
        </div>
    )
}
