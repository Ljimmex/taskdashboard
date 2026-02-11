import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, format, parseISO, isWeekend } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { CalendarHeader, type ProjectOption, type MemberOption } from './CalendarHeader'
import { CalendarEventPanel } from './CalendarEventPanel'
import { DayEventListPanel, type CalendarEvent } from './DayEventListPanel'
import { ViewEventPanel } from './ViewEventPanel'
import { EditEventPanel } from './EditEventPanel'
import { TaskDetailsPanel } from '@/components/features/tasks/panels/TaskDetailsPanel'
import { cn } from '@/lib/utils'
import { apiFetch, apiFetchJson } from '@/lib/api'

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
    description?: string
    startAt: string
    endAt: string
    teamId: string
    teamIds?: string[]
    type?: CalendarEventType
    taskId?: string
    task?: { id: string; title: string; status: string; priority: string; projectId?: string; assigneeId?: string }
    location?: string
    meetingLink?: string
    meetingType?: 'physical' | 'virtual'
    isAllDay?: boolean
    createdBy?: string
    creator?: { id: string; name: string; image?: string } // Backend returns 'creator' relation
    assignees?: { id: string; name: string; image?: string }[] // Backend returns 'assignees' relation
    priority?: string
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
    // Advanced Filters
    const [projects, setProjects] = useState<ProjectOption[]>([])
    const [members, setMembers] = useState<MemberOption[]>([])
    const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]) // Changed to array
    const [filterMemberIds, setFilterMemberIds] = useState<string[]>([])   // Changed to array

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

    const [view, setView] = useState<'month' | 'week' | 'day'>('month')

    const fetchEvents = useCallback(async () => {
        try {
            let start = new Date()
            let end = new Date()

            const weekOptions = { weekStartsOn: weekStartDay === 'monday' ? 1 : 0 } as const

            if (view === 'month') {
                start = startOfWeek(startOfMonth(currentDate), weekOptions)
                end = endOfWeek(endOfMonth(currentDate), weekOptions)
            } else if (view === 'week') {
                start = startOfWeek(currentDate, weekOptions)
                end = endOfWeek(currentDate, weekOptions)
            } else {
                start = new Date(currentDate)
                start.setHours(0, 0, 0, 0)
                end = new Date(currentDate)
                end.setHours(23, 59, 59, 999)
            }

            const queryParams = new URLSearchParams({
                workspaceSlug,
                start: start.toISOString(),
                end: end.toISOString()
            })

            const res = await apiFetch(`/api/calendar?${queryParams.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setEvents(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch calendar events', error)
        }
    }, [workspaceSlug, currentDate, view, weekStartDay])

    const fetchFiltersData = useCallback(async () => {
        try {
            // Fetch Projects
            const projectsRes = await apiFetch(`/api/projects?workspaceSlug=${workspaceSlug}`)
            if (projectsRes.ok) {
                const data = await projectsRes.json()
                setProjects(data.data?.map((p: any) => ({ id: p.id, name: p.name })) || [])
            }

            // Fetch Members
            const membersRes = await apiFetch(`/api/workspaces/${workspaceSlug}/members`)
            if (membersRes.ok) {
                const data = await membersRes.json()
                setMembers(data.data?.map((m: any) => ({
                    id: m.user.id,
                    name: m.user.name,
                    image: m.user.image
                })) || [])
            }
        } catch (error) {
            console.error('Failed to fetch filter data', error)
        }
    }, [workspaceSlug])

    useEffect(() => {
        fetchEvents()
        fetchFiltersData()
    }, [fetchEvents, fetchFiltersData, currentDate])

    // --- Date Navigation Logic ---
    const handlePrev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
        else if (view === 'week') {
            const newDate = new Date(currentDate)
            newDate.setDate(newDate.getDate() - 7)
            setCurrentDate(newDate)
        }
        else if (view === 'day') {
            const newDate = new Date(currentDate)
            newDate.setDate(newDate.getDate() - 1)
            setCurrentDate(newDate)
        }
    }

    const handleNext = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
        else if (view === 'week') {
            const newDate = new Date(currentDate)
            newDate.setDate(newDate.getDate() + 7)
            setCurrentDate(newDate)
        }
        else if (view === 'day') {
            const newDate = new Date(currentDate)
            newDate.setDate(newDate.getDate() + 1)
            setCurrentDate(newDate)
        }
    }

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
        setFilterProjectIds([])
        setFilterMemberIds([])
    }

    const openEventOrTask = async (event: Event) => {
        if (event.type === 'task' && event.taskId) {
            try {
                const data = await apiFetchJson<any>(`/api/tasks/${event.taskId}`)
                if (data.success) {
                    let taskData = data.data
                    console.log('Fetched task details:', taskData)

                    // Fallback: If stages are missing (API issue), fetch them separately
                    if (!taskData.stages && taskData.projectId) {
                        try {
                            console.warn('⚠️ Stages missing in task response, fetching manually...')
                            const stagesData = await apiFetchJson<any>(`/api/projects/${taskData.projectId}/stages`)
                            if (stagesData.success) {
                                console.log('✅ Manually fetched stages:', stagesData.data)
                                taskData = { ...taskData, stages: stagesData.data }
                            }
                        } catch (stageErr) {
                            console.error('❌ Failed to fetch stages manually:', stageErr)
                        }
                    }

                    setSelectedTask(taskData)
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
        if (view === 'month' && dayEvents.length > 1) {
            setSelectedDay(parseISO(event.startAt))
            setIsDayPanelOpen(true)
        } else {
            openEventOrTask(event)
        }
    }

    const handleDayClick = (day: Date, dayEvents: Event[]) => {
        if (dayEvents.length > 1) {
            setSelectedDay(day)
            setIsDayPanelOpen(true)
        } else if (dayEvents.length === 1) {
            openEventOrTask(dayEvents[0])
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

    const handleRefresh = () => {
        fetchEvents()
    }

    const getDayEvents = (day: Date) => events
        .filter(e => isSameDay(parseISO(e.startAt), day))
        .filter(e => {
            // Type Filter
            if (e.type && !selectedTypes.includes(e.type)) return false

            // Project Filter
            if (filterProjectIds.length > 0) {
                // If event is a task, check its projectId
                if (e.type === 'task' && e.task?.projectId) {
                    if (!filterProjectIds.includes(e.task.projectId)) return false
                } else {
                    // For non-tasks, if strict project filter is on, maybe hide them? 
                    // Or keep them visible? Let's hide them to be strict as requested.
                    return false
                }
            }

            // Member Filter
            if (filterMemberIds.length > 0) {
                const assigneeIds = (e.assignees || []).map((a: any) => a.id)
                const creatorId = e.createdBy
                // Check if any selected member is an assignee or the creator
                const hasMatch = filterMemberIds.some(id =>
                    assigneeIds.includes(id) || id === creatorId
                )
                if (!hasMatch) return false
            }

            return true
        })

    // --- View Logic ---
    let daysToRender: Date[] = []
    let gridCols = 7

    if (view === 'month') {
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart, { locale: enUS, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
        const endDate = endOfWeek(monthEnd, { locale: enUS, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
        daysToRender = eachDayOfInterval({ start: startDate, end: endDate })
        if (!showWeekends) daysToRender = daysToRender.filter(day => !isWeekend(day))

        // Dynamic cols for month view if weekends hidden
        const weekDaysCount = showWeekends ? 7 : 5
        gridCols = weekDaysCount
    } else if (view === 'week') {
        const startDate = startOfWeek(currentDate, { locale: enUS, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
        const endDate = endOfWeek(currentDate, { locale: enUS, weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
        daysToRender = eachDayOfInterval({ start: startDate, end: endDate })
        if (!showWeekends) daysToRender = daysToRender.filter(day => !isWeekend(day))
        gridCols = daysToRender.length
    } else if (view === 'day') {
        daysToRender = [currentDate]
        gridCols = 1
    }

    const weekDays = weekStartDay === 'monday'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Adjust headers based on showWeekends for Month view, or just use daysToRender for Week/Day
    const visibleHeaders = view === 'month'
        ? (showWeekends ? weekDays : weekDays.filter(d => d !== 'Sat' && d !== 'Sun'))
        : daysToRender.map(d => format(d, 'EEE'))

    return (
        <div className="flex h-full w-full bg-[#12121a] rounded-2xl overflow-hidden font-sans">
            <div className="flex-1 flex flex-col p-6 min-w-0">
                <CalendarHeader
                    currentDate={currentDate}
                    onPrevMonth={handlePrev} // Re-using props, but now they handle dynamic view navigation
                    onNextMonth={handleNext}
                    onToday={goToToday}
                    selectedTypes={selectedTypes}
                    toggleType={toggleType}
                    clearFilters={clearFilters}
                    showWeekends={showWeekends}
                    setShowWeekends={setShowWeekends}
                    weekStartDay={weekStartDay}
                    setWeekStartDay={setWeekStartDay}
                    view={view}
                    setView={setView}
                    // Filter Props
                    projects={projects}
                    filterProjectIds={filterProjectIds}
                    setFilterProjectIds={setFilterProjectIds}
                    members={members}
                    filterMemberIds={filterMemberIds}
                    setFilterMemberIds={setFilterMemberIds}
                    events={events}
                />

                {/* GRID KALENDARZA */}
                <div className="flex flex-col flex-1 rounded-2xl overflow-hidden bg-[#12121a] border border-gray-800/50">
                    {/* Headers */}
                    <div className={cn("grid border-b border-gray-800/50", `grid-cols-${gridCols}`)} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                        {visibleHeaders.map((day, i) => (
                            <div key={i} className="py-3 text-center border-r border-gray-800/50 last:border-r-0">
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider",
                                    view === 'day' && isSameDay(daysToRender[0], new Date()) ? "text-amber-500" : "text-gray-500"
                                )}>
                                    {view === 'day' || view === 'week' ? (
                                        <>
                                            {format(daysToRender[i], 'EEE')}
                                            <span className={cn("ml-1", isSameDay(daysToRender[i], new Date()) && "text-amber-500")}>
                                                {format(daysToRender[i], 'd')}
                                            </span>
                                        </>
                                    ) : (
                                        day
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Content */}
                    <div className={cn("grid flex-1 bg-[#12121a] overflow-y-auto", `grid-cols-${gridCols}`)} style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                        {daysToRender.map((day, dayIdx) => {
                            const isCurrentMonth = isSameMonth(day, currentDate)
                            const isToday = isSameDay(day, new Date())
                            const dayEvents = getDayEvents(day)

                            // Borders logic
                            // For Month: standard grid logic
                            // For Week/Day: just right borders, no bottom borders except maybe for the container
                            const isLastRow = view === 'month' ? dayIdx >= daysToRender.length - gridCols : true
                            const isRightBorder = (dayIdx + 1) % gridCols !== 0

                            // DAY VIEW RENDERING
                            if (view === 'day') {
                                return (
                                    <div key={day.toString()} className="relative bg-[#12121a] min-h-[1440px]">
                                        {/* Time Grid (Background) */}
                                        {Array.from({ length: 24 }).map((_, hour) => (
                                            <div key={hour} className="absolute w-full border-t border-gray-800/30 flex" style={{ top: `${hour * 60}px`, height: '60px' }}>
                                                {/* Time Label */}
                                                <div className="w-14 -mt-2.5 text-xs text-gray-500 text-right pr-3 select-none">
                                                    {hour.toString().padStart(2, '0')}:00
                                                </div>
                                                {/* Half-hour marker */}
                                                <div className="absolute top-1/2 left-14 right-0 border-t border-gray-800/10" />
                                            </div>
                                        ))}

                                        {/* Current Time Indicator (if today) */}
                                        {isToday && (() => {
                                            const now = new Date()
                                            const minutes = now.getHours() * 60 + now.getMinutes()
                                            return (
                                                <div
                                                    className="absolute left-14 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
                                                    style={{ top: `${minutes}px` }}
                                                >
                                                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                                                </div>
                                            )
                                        })()}

                                        {/* Click to add interaction area (simplified) */}
                                        <div
                                            className="absolute inset-0 z-0 left-14"
                                            onClick={() => {
                                                // Ideally pass this time to create panel
                                                setIsEventPanelOpen(true)
                                            }}
                                        />

                                        {/* Events */}
                                        <div className="absolute top-0 left-14 right-0 bottom-0 pointer-events-none">
                                            {dayEvents.map(event => {
                                                const start = parseISO(event.startAt)
                                                const end = parseISO(event.endAt)

                                                // Calculate start minutes from midnight
                                                const startMinutes = start.getHours() * 60 + start.getMinutes()

                                                // Calculate duration in minutes
                                                let duration = (end.getTime() - start.getTime()) / (1000 * 60)
                                                if (duration < 30) duration = 30 // Min height

                                                return (
                                                    <div
                                                        key={event.id}
                                                        onClick={(e) => { e.stopPropagation(); handleEventClick(event, dayEvents) }}
                                                        className={cn(
                                                            "absolute left-1 right-2 rounded-lg p-2 text-xs cursor-pointer border-l-4 overflow-hidden transition-colors hover:z-20 pointer-events-auto",
                                                            event.priority === 'urgent' || event.priority === 'high' ? "bg-red-500/10 border-red-500 text-red-100 hover:bg-red-500/20" :
                                                                event.priority === 'medium' ? "bg-amber-500/10 border-amber-500 text-amber-100 hover:bg-amber-500/20" :
                                                                    event.priority === 'low' ? "bg-green-500/10 border-green-500 text-green-100 hover:bg-green-500/20" :
                                                                        "bg-[#2a2a35] border-gray-500 text-gray-200 hover:bg-[#323240]"
                                                        )}
                                                        style={{
                                                            top: `${startMinutes}px`,
                                                            height: `${duration}px`
                                                        }}
                                                    >
                                                        <div className="font-semibold">{event.title}</div>
                                                        <div className="opacity-75 text-[10px]">
                                                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={day.toString()}
                                    className={cn(
                                        "relative p-2 border-gray-800/50 transition-all group hover:bg-[#16161f]",
                                        isRightBorder && "border-r",
                                        !isLastRow && "border-b", // Only apply bottom border in month view rows (except last)
                                        view !== 'month' && "min-h-[500px]" // Vertical height for week view
                                    )}
                                >
                                    <div className={cn("flex flex-col h-full", view === 'month' && !isCurrentMonth ? "opacity-30" : "opacity-100")}>
                                        {/* Day Number (Only visible in Month view, as Week/Day have it in header) */}
                                        {view === 'month' && (
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
                                        )}

                                        {/* Events Container */}
                                        <div className="flex flex-col flex-1 gap-1 px-1">
                                            {(view === 'month' ? dayEvents.slice(0, 2) : dayEvents).map((event) => (
                                                <div
                                                    key={event.id}
                                                    onClick={(e) => { e.stopPropagation(); handleEventClick(event, dayEvents) }}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded-lg transition-colors cursor-pointer group/card shrink-0",
                                                        event.priority === 'urgent' || event.priority === 'high' ? "bg-red-500/10 border border-red-500/20 text-red-200" :
                                                            event.priority === 'low' ? "bg-green-500/10 border border-green-500/20 text-green-200" :
                                                                "bg-[#1a1a24] hover:bg-[#22222e] text-gray-300"
                                                    )}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-medium truncate">
                                                            {event.title}
                                                        </span>
                                                        {(view === 'week') && event.startAt && (
                                                            <span className="text-[9px] text-gray-500 mt-0.5">
                                                                {format(parseISO(event.startAt), 'HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* "More" button for Month View */}
                                            {view === 'month' && dayEvents.length > 2 && (
                                                <span
                                                    onClick={(e) => { e.stopPropagation(); handleDayClick(day, dayEvents) }}
                                                    className="text-[9px] text-gray-500 text-center shrink-0 cursor-pointer hover:text-amber-400 transition-colors"
                                                >
                                                    + {dayEvents.length - 2} more
                                                </span>
                                            )}
                                        </div>

                                        {/* Add Event Button (visible on hover) */}
                                        {/* Show in all views for easy creation */}
                                        <div className="mt-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={() => {
                                                    setSelectedDay(day)
                                                    setIsEventPanelOpen(true)
                                                }}
                                                className="w-full py-1 text-[10px] text-gray-500 border border-white/10 border-dashed rounded bg-white/5 hover:bg-white/10 hover:text-gray-300 transition-all flex items-center justify-center gap-1"
                                            >
                                                <span>+</span> Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Side Panel - Create Event */}
            <CalendarEventPanel
                isOpen={isEventPanelOpen}
                onClose={() => { setIsEventPanelOpen(false); setSelectedDay(null); }}
                workspaceSlug={workspaceSlug}
                onCreate={handleRefresh}
                initialDate={selectedDay || undefined}
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
                    onDeleted={handleRefresh}
                />
            )}

            {/* Edit Event Panel */}
            {isEditPanelOpen && selectedEvent && (
                <EditEventPanel
                    event={selectedEvent}
                    isOpen={isEditPanelOpen}
                    onClose={() => { setIsEditPanelOpen(false); setSelectedEvent(null) }}
                    workspaceSlug={workspaceSlug}
                    onUpdated={handleRefresh}
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
