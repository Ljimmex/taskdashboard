import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, format, parseISO, isWeekend } from 'date-fns'
import { enUS, pl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
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
import { useSession } from '@/lib/auth'

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
            checked ? colorClass : "border-[var(--app-border)] bg-transparent hover:border-[var(--app-text-muted)]"
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
    const { t, i18n } = useTranslation()
    const dateLocale = i18n.language === 'pl' ? pl : enUS
    const params = useParams({ strict: false }) as any
    const workspaceSlug = params.workspaceSlug
    const { data: session } = useSession()
    const [userRole, setUserRole] = useState<string | null>(null)

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

    useEffect(() => {
        const fetchWorkspaceRole = async () => {
            if (!workspaceSlug || !session?.user?.id) return
            try {
                const data = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
                    headers: { 'x-user-id': session?.user?.id || '' }
                })
                setUserRole(data?.userRole || null)
            } catch {
                setUserRole(null)
            }
        }

        fetchWorkspaceRole()
    }, [workspaceSlug, session?.user?.id])

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: dateLocale, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
    const endDate = endOfWeek(monthEnd, { locale: dateLocale, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })

    let calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    if (!showWeekends) {
        calendarDays = calendarDays.filter(day => !isWeekend(day))
    }



    // Adjust weekDays for showWeekends logic
    // If showWeekends is false, we need to filter out Sat/Sun from the generated array
    // However, the generated array index relies on 7 days.
    // Better way: Generate the 7 days, then filter if needed.
    const allWeekDays = eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: weekStartDay === 'monday' ? 1 : 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
    })

    const visibleWeekDaysObj = allWeekDays.filter(d => showWeekends || !isWeekend(d))
    const visibleWeekDays = visibleWeekDaysObj.map(d => format(d, 'EEE', { locale: dateLocale }))


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

    const canCreateTeamEvents = userRole ? !['member', 'guest'].includes(userRole) : true
    const canCreatePersonalEvents = userRole === 'member'
    const canCreateCalendarEvents = canCreateTeamEvents || canCreatePersonalEvents


    return (
        <div className="flex flex-col h-full w-full bg-[var(--app-bg-card)] rounded-2xl p-6 font-sans relative overflow-hidden transition-all duration-300">

            {/* HEADER KALENDARZA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                {/* Lewa strona: Ikonka + Miesiąc/Rok */}
                <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <h2 className="text-lg font-semibold text-[var(--app-text-primary)] tracking-wide capitalize">
                        {format(currentDate, 'LLLL yyyy', { locale: dateLocale })}
                    </h2>
                </div>

                {/* Prawa strona: Przyciski Funkcyjne i Nawigacja */}
                <div className="flex items-center gap-3">
                    {/* Przycisk Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all outline-none focus:ring-1 focus:ring-[var(--app-border)]",
                                selectedTypes.length < 4 ? "bg-amber-500/10 text-amber-500" : "bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]"
                            )}>
                                <Filter className="w-3.5 h-3.5" />
                                <span>{t('dashboard.filter')}</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-[var(--app-bg-card)] p-2 text-[var(--app-text-secondary)] shadow-2xl rounded-xl border border-[var(--app-border)] z-50">
                            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">
                                {t('dashboard.type')}
                            </div>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.EVENT); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.EVENT)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.EVENT) ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]")}>{t('dashboard.eventType.event')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.TASK); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.TASK)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.TASK) ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]")}>{t('dashboard.eventType.task')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.REMINDER); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.REMINDER)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.REMINDER) ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]")}>{t('dashboard.eventType.reminder')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.MEETING); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.MEETING)} />
                                <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.MEETING) ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-secondary)]")}>{t('dashboard.eventType.meeting')}</span>
                            </DropdownMenuItem>

                            <div className="p-2 mt-2">
                                <button
                                    onClick={clearFilters}
                                    className="w-full py-1.5 bg-[var(--app-bg-elevated)] hover:bg-amber-500/10 text-[var(--app-text-secondary)] hover:text-amber-500 text-xs font-medium rounded-lg transition-colors border border-[var(--app-border)]"
                                >
                                    {t('dashboard.clearFilters')}
                                </button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Przycisk Schedule setting */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-card)] rounded-lg text-xs font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-all mr-2 border border-[var(--app-border)] shadow-sm outline-none focus:ring-1 focus:ring-[var(--app-border)]">
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>{t('dashboard.scheduleSetting')}</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 bg-[var(--app-bg-card)] p-2 text-[var(--app-text-secondary)] shadow-2xl rounded-xl border border-[var(--app-border)] z-50">
                            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">
                                {t('dashboard.viewOptions')}
                            </div>

                            <DropdownMenuItem
                                onClick={(e) => { e.preventDefault(); setShowWeekends(!showWeekends); }}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                            >
                                <CustomCheckbox checked={showWeekends} />
                                <span className="text-[var(--app-text-secondary)]">{t('dashboard.showWeekends')}</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-[var(--app-border)] my-2" />

                            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">
                                {t('dashboard.startOfWeek')}
                            </div>
                            <DropdownMenuRadioGroup value={weekStartDay} onValueChange={(v) => setWeekStartDay(v as 'monday' | 'sunday')}>
                                <DropdownMenuRadioItem value="monday" className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)] cursor-pointer outline-none data-[state=checked]:text-amber-500 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] group transition-colors">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all", weekStartDay === 'monday' ? "border-amber-500" : "border-gray-600 group-hover:border-gray-500")}>
                                            {weekStartDay === 'monday' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                        </div>
                                        <span>{t('dashboard.monday')}</span>
                                    </div>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="sunday" className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-[var(--app-bg-elevated)] focus:bg-[var(--app-bg-elevated)] cursor-pointer outline-none data-[state=checked]:text-amber-500 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] group transition-colors">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all", weekStartDay === 'sunday' ? "border-amber-500" : "border-[var(--app-border)] group-hover:border-[var(--app-text-muted)]")}>
                                            {weekStartDay === 'sunday' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                        </div>
                                        <span>{t('dashboard.sunday')}</span>
                                    </div>
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Separator */}
                    <div className="h-6 w-px bg-[var(--app-border)] hidden md:block mx-1"></div>

                    {/* Nawigacja */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-3 py-1 text-xs font-medium text-[var(--app-text-muted)] hover:text-amber-500 transition-colors"
                        >
                            {t('dashboard.today')}
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* GRID KALENDARZA */}
            <div className="flex flex-col flex-1 rounded-2xl overflow-hidden bg-[var(--app-bg-card)] border border-[var(--app-border)] shadow-sm">
                {/* Dni tygodnia */}
                <div className={`grid grid-cols-${visibleWeekDays.length} border-b border-[var(--app-border)]`}>
                    {visibleWeekDays.map((day) => (
                        <div key={day} className="py-3 text-center transition-colors bg-[var(--app-bg-deepest)]/50">
                            <span className="text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider">
                                {day}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Siatka dni */}
                <div className={`grid grid-cols-${visibleWeekDays.length} flex-1 bg-[var(--app-bg-card)]`}>
                    {calendarDays.map((day, dayIdx) => {
                        const isCurrentMonth = isSameMonth(day, monthStart)
                        const isToday = isSameDay(day, new Date())
                        const isLastRow = dayIdx >= calendarDays.length - visibleWeekDays.length
                        const dayEvents = getDayEvents(day)

                        return (
                            <div
                                key={day.toString()}
                                className={cn(
                                    "relative min-h-[100px] p-2 border-r border-[var(--app-border)] transition-all group hover:bg-[var(--app-bg-deepest)]/30",
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
                                                : "text-[var(--app-text-muted)] group-hover:text-[var(--app-text-secondary)]"
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
                                                    className="bg-[var(--app-bg-elevated)] px-2 py-1.5 rounded-lg hover:bg-amber-500/10 border border-[var(--app-border)] transition-colors cursor-pointer group/card shrink-0"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-[var(--app-text-secondary)] font-medium truncate">
                                                            {event.title}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <span
                                                    onClick={(e) => { e.stopPropagation(); setSelectedDay(day); setIsDayPanelOpen(true) }}
                                                    className="text-[9px] text-[var(--app-text-muted)] text-center shrink-0 cursor-pointer hover:text-amber-500 transition-colors"
                                                >
                                                    {t('dashboard.moreEvents', { count: dayEvents.length - 2 })}
                                                </span>
                                            )}
                                        </div>

                                        {/* Add Event Button (visible on hover) - Fixed positioning to avoid overflow */}
                                        {canCreateCalendarEvents && (
                                            <div className="mt-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => setIsEventPanelOpen(true)}
                                                    className="w-full py-1 text-[10px] text-[var(--app-text-muted)] border border-[var(--app-border)] border-dashed rounded bg-[var(--app-bg-deepest)]/50 hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50 transition-all flex items-center justify-center gap-1"
                                                >
                                                    <span>+</span> {t('dashboard.addEvent')}
                                                </button>
                                            </div>
                                        )}
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
                canCreateEvents={canCreateTeamEvents}
                userRole={userRole || undefined}
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
                onSubtaskToggle={async (subtaskId) => {
                    if (!selectedTask) return
                    const subtask = selectedTask.subtasks?.find((s: any) => s.id === subtaskId)
                    if (!subtask) return
                    try {
                        await apiFetch(`/api/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
                            method: 'PATCH',
                            headers: { 'x-user-id': session?.user?.id || '' },
                            body: JSON.stringify({ isCompleted: !subtask.isCompleted })
                        })
                        // Refresh task details
                        const data = await apiFetchJson<any>(`/api/tasks/${selectedTask.id}`)
                        if (data.success) {
                            setSelectedTask(data.data)
                        }
                    } catch (err) {
                        console.error('Failed to toggle subtask:', err)
                    }
                }}
                onToggleStatus={async () => {
                    if (!selectedTask) return
                    try {
                        const res = await apiFetch(`/api/tasks/${selectedTask.id}`, {
                            method: 'PATCH',
                            headers: { 'x-user-id': session?.user?.id || '' },
                            body: JSON.stringify({ isCompleted: !selectedTask.isCompleted })
                        })
                        if (res.ok) {
                            const data = await apiFetchJson<any>(`/api/tasks/${selectedTask.id}`)
                            if (data.success) {
                                setSelectedTask(data.data)
                                fetchEvents()
                            }
                        }
                    } catch (error) {
                        console.error('Error toggling status:', error)
                    }
                }}
                onDeleteTask={async () => {
                    if (!selectedTask) return
                    if (window.confirm('Are you sure you want to delete this task?')) {
                        try {
                            const res = await apiFetch(`/api/tasks/${selectedTask.id}`, {
                                method: 'DELETE',
                                headers: { 'x-user-id': session?.user?.id || '' }
                            })
                            if (res.ok) {
                                setIsTaskPanelOpen(false)
                                setSelectedTask(null)
                                fetchEvents()
                            }
                        } catch (error) {
                            console.error('Error deleting task:', error)
                        }
                    }
                }}
            />
        </div>
    )
}   