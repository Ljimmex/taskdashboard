import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, format, parseISO, isWeekend } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { ChevronLeft, ChevronRight, Filter, SlidersHorizontal } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { CalendarEventPanel } from '@/components/features/calendar/CalendarEventPanel'
import { DayEventListPanel, type CalendarEvent } from '@/components/features/calendar/DayEventListPanel'
import { ViewEventPanel } from '@/components/features/calendar/ViewEventPanel'
import { EditEventPanel } from '@/components/features/calendar/EditEventPanel'
import { TaskDetailsPanel } from '@/components/features/tasks/panels/TaskDetailsPanel'

// Enum mirroring backend
export enum CalendarEventType {
    EVENT = 'event',
    TASK = 'task',
    MEETING = 'meeting',
    REMINDER = 'reminder'
}

interface Event {
    id: string
    title: string
    description?: string
    startAt: string
    endAt: string
    teamId: string
    teamIds?: string[]
    type?: CalendarEventType
    taskId?: string
    task?: { id: string; title: string; status: string; priority: string }
    location?: string
    meetingLink?: string
    meetingType?: 'physical' | 'virtual'
    isAllDay?: boolean
    createdBy?: string
    creator?: { id: string; name: string; image?: string }
}

// Custom Checkbox Component matching Teams page style
const CustomCheckbox = ({ checked, onClick, colorClass = "bg-amber-500 border-amber-500" }: { checked: boolean; onClick?: () => void; colorClass?: string }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
            checked ? colorClass : "border-gray-600 bg-transparent hover:border-gray-500"
        )}
    >
        {checked && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        )}
    </div>
)

export function CalendarSection() {
    const params = useParams({ strict: false }) as any
    const workspaceSlug = params.workspaceSlug

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

    // Panel states
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [isDayPanelOpen, setIsDayPanelOpen] = useState(false)
    const [isViewPanelOpen, setIsViewPanelOpen] = useState(false)
    const [isEditPanelOpen, setIsEditPanelOpen] = useState(false)

    // Task detail panel state
    const [selectedTask, setSelectedTask] = useState<any | null>(null)
    const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false)

    const fetchEvents = useCallback(async () => {
        if (!workspaceSlug) return
        try {
            const res = await apiFetch(`/api/calendar?workspaceSlug=${workspaceSlug}`)
            if (res.ok) {
                const data = await res.json()
                setEvents(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch calendar events', error)
        }
    }, [workspaceSlug])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents, currentDate])

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

    const openEventOrTask = async (event: Event) => {
        if (event.type === 'task' && event.taskId) {
            try {
                const data = await apiFetchJson<any>(`/api/tasks/${event.taskId}`)
                if (data.success) {
                    setSelectedTask(data.data)
                    setIsTaskPanelOpen(true)
                }
            } catch (err) {
                console.error('Failed to fetch task details:', err)
            }
        } else {
            setSelectedEvent(event as CalendarEvent)
            setIsViewPanelOpen(true)
        }
    }

    const handleEventClick = (event: Event, dayEvents: Event[]) => {
        if (dayEvents.length > 1) {
            setSelectedDay(parseISO(event.startAt))
            setIsDayPanelOpen(true)
        } else {
            openEventOrTask(event)
        }
    }

    const handleDayEventClick = (event: CalendarEvent) => {
        setIsDayPanelOpen(false)
        openEventOrTask(event as Event)
    }

    const handleEditEvent = (event: CalendarEvent) => {
        setIsViewPanelOpen(false)
        setSelectedEvent(event)
        setIsEditPanelOpen(true)
    }

    const getDayEvents = (day: Date) => events
        .filter(e => isSameDay(parseISO(e.startAt), day))
        .filter(e => e.type ? selectedTypes.includes(e.type) : true)

    return (
        <div className="flex flex-col h-full w-full bg-[#12121a] rounded-2xl p-6 font-sans relative overflow-hidden">

            {/* HEADER KALENDARZA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                {/* Lewa strona: Ikonka + Miesiąc/Rok */}
                <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <h2 className="text-lg font-semibold text-white tracking-wide">
                        {format(currentDate, 'MMMM yyyy', { locale: enUS })}
                    </h2>
                </div>

                {/* Prawa strona: Przyciski Funkcyjne i Nawigacja */}
                <div className="flex items-center gap-3">
                    {/* Przycisk Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all outline-none focus:ring-1 focus:ring-white/10",
                                selectedTypes.length < 4 ? "bg-[#1E2029] text-white" : "bg-[#1a1a24] text-gray-400 hover:text-white"
                            )}>
                                <Filter className="w-3.5 h-3.5" />
                                <span>Filter</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[#16161f] p-2 text-gray-300 shadow-2xl rounded-xl border-none">
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Type
                            </div>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.EVENT); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.EVENT)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.EVENT) ? "text-white" : "text-gray-400")}>Events</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.TASK); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.TASK)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.TASK) ? "text-white" : "text-gray-400")}>Tasks</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.REMINDER); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.REMINDER)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.REMINDER) ? "text-white" : "text-gray-400")}>Reminders</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.MEETING); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.MEETING)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.MEETING) ? "text-white" : "text-gray-400")}>Meetings</span>
                            </DropdownMenuItem>

                            <div className="p-2 mt-2">
                                <button
                                    onClick={clearFilters}
                                    className="w-full py-1.5 bg-[#1a1a24] hover:bg-[#20202b] text-gray-400 hover:text-white text-xs font-medium rounded-lg transition-colors border border-white/5"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Przycisk Schedule setting */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a24] hover:bg-[#20202b] rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-all mr-2 outline-none focus:ring-1 focus:ring-white/10">
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Schedule setting</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 bg-[#16161f] p-2 text-gray-300 shadow-2xl rounded-xl border-none">
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                View Options
                            </div>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); setShowWeekends(!showWeekends); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={showWeekends} />
                                <span className="text-gray-300">Show weekends</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-gray-800 my-2" />

                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Start of week
                            </div>
                            <DropdownMenuRadioGroup value={weekStartDay} onValueChange={(v) => setWeekStartDay(v as 'monday' | 'sunday')}>
                                <DropdownMenuRadioItem value="monday" className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-[#20202b] focus:bg-[#20202b] cursor-pointer outline-none data-[state=checked]:text-amber-500 text-gray-400 hover:text-gray-200 group transition-colors">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all", weekStartDay === 'monday' ? "border-amber-500" : "border-gray-600 group-hover:border-gray-500")}>
                                            {weekStartDay === 'monday' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                        </div>
                                        <span>Monday</span>
                                    </div>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="sunday" className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-[#20202b] focus:bg-[#20202b] cursor-pointer outline-none data-[state=checked]:text-amber-500 text-gray-400 hover:text-gray-200 group transition-colors">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all", weekStartDay === 'sunday' ? "border-amber-500" : "border-gray-600 group-hover:border-gray-500")}>
                                            {weekStartDay === 'sunday' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                        </div>
                                        <span>Sunday</span>
                                    </div>
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Separator */}
                    <div className="h-6 w-px bg-gray-800 hidden md:block mx-1"></div>

                    {/* Nawigacja */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-amber-500 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

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
                        const dayEvents = getDayEvents(day)

                        return (
                            <div
                                key={day.toString()}
                                className={cn(
                                    "relative min-h-[100px] p-2 border-r border-gray-800/50 transition-all group hover:bg-[#16161f]",
                                    !isLastRow && "border-b",
                                    (dayIdx + 1) % visibleWeekDays.length === 0 && "border-r-0"
                                )}
                            >
                                <div className="flex flex-col h-full" style={{ opacity: !isCurrentMonth ? 0.3 : 1 }}>
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
                                            {dayEvents.slice(0, 2).map((event) => (
                                                <div
                                                    key={event.id}
                                                    onClick={(e) => { e.stopPropagation(); handleEventClick(event, dayEvents) }}
                                                    className="bg-[#1a1a24] px-2 py-1.5 rounded-lg hover:bg-[#22222e] transition-colors cursor-pointer group/card shrink-0"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-300 font-medium truncate">
                                                            {event.title}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <span
                                                    onClick={(e) => { e.stopPropagation(); setSelectedDay(day); setIsDayPanelOpen(true) }}
                                                    className="text-[9px] text-gray-500 text-center shrink-0 cursor-pointer hover:text-amber-400 transition-colors"
                                                >
                                                    + {dayEvents.length - 2} more
                                                </span>
                                            )}
                                        </div>

                                        {/* Add Event Button (visible on hover) - Fixed positioning to avoid overflow */}
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

            {/* Side Panel - Create Event */}
            <CalendarEventPanel
                isOpen={isEventPanelOpen}
                onClose={() => setIsEventPanelOpen(false)}
                workspaceSlug={workspaceSlug}
                onCreate={fetchEvents}
            />

            {/* Day Event List Panel */}
            {isDayPanelOpen && selectedDay && (
                <DayEventListPanel
                    date={selectedDay}
                    events={getDayEvents(selectedDay) as CalendarEvent[]}
                    isOpen={isDayPanelOpen}
                    onClose={() => setIsDayPanelOpen(false)}
                    onEventClick={handleDayEventClick}
                />
            )}

            {/* View Event Panel */}
            {isViewPanelOpen && selectedEvent && (
                <ViewEventPanel
                    event={selectedEvent}
                    isOpen={isViewPanelOpen}
                    onClose={() => { setIsViewPanelOpen(false); setSelectedEvent(null) }}
                    onEdit={handleEditEvent}
                    onDeleted={fetchEvents}
                />
            )}

            {/* Edit Event Panel */}
            {isEditPanelOpen && selectedEvent && (
                <EditEventPanel
                    event={selectedEvent}
                    isOpen={isEditPanelOpen}
                    onClose={() => { setIsEditPanelOpen(false); setSelectedEvent(null) }}
                    workspaceSlug={workspaceSlug}
                    onUpdated={fetchEvents}
                />
            )}

            {/* Task Details Panel (for task-type calendar events) */}
            <TaskDetailsPanel
                task={selectedTask}
                isOpen={isTaskPanelOpen}
                onClose={() => { setIsTaskPanelOpen(false); setSelectedTask(null) }}
                subtasks={selectedTask?.subtasks}
                comments={selectedTask?.comments}
                activities={selectedTask?.activities}
                stages={selectedTask?.stages}
            />
        </div>
    )
}