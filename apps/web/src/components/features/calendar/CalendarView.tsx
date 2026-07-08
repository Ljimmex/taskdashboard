import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  format,
  parseISO,
  isWeekend,
} from 'date-fns'
import { enUS, pl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { CalendarHeader, type ProjectOption, type MemberOption } from './CalendarHeader'
import { CalendarEventPanel } from './CalendarEventPanel'
import { DayEventListPanel, type CalendarEvent } from './DayEventListPanel'
import { ViewEventPanel } from './ViewEventPanel'
import { EditEventPanel } from './EditEventPanel'
import { TaskDetailsPanel } from '@/components/features/tasks/panels/TaskDetailsPanel'
import { cn } from '@/lib/utils'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'

// Enum mirroring backend - Exported so CalendarHeader can use it
export enum CalendarEventType {
  EVENT = 'event',
  TASK = 'task',
  MEETING = 'meeting',
  REMINDER = 'reminder',
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
  task?: {
    id: string
    title: string
    status: string
    priority: string
    projectId?: string
    assigneeId?: string
  }
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
  const { t, i18n } = useTranslation() // Get i18n instance
  const { workspaceSlug } = useParams({ from: '/$workspaceSlug/calendar' })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const { data: session } = useSession()
  const [userRole, setUserRole] = useState<string | null>(null)

  // Filter State
  const [selectedTypes, setSelectedTypes] = useState<CalendarEventType[]>([
    CalendarEventType.EVENT,
    CalendarEventType.TASK,
    CalendarEventType.MEETING,
    CalendarEventType.REMINDER,
  ])
  // Advanced Filters
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]) // Changed to array
  const [filterMemberIds, setFilterMemberIds] = useState<string[]>([]) // Changed to array

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
        end: end.toISOString(),
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
        setMembers(
          data.data?.map((m: any) => ({
            id: m.user.id,
            name: m.user.name,
            image: m.user.image,
          })) || []
        )
      }
    } catch (error) {
      console.error('Failed to fetch filter data', error)
    }
  }, [workspaceSlug])

  useEffect(() => {
    fetchEvents()
    fetchFiltersData()
  }, [fetchEvents, fetchFiltersData, currentDate])

  useEffect(() => {
    const fetchWorkspaceRole = async () => {
      if (!workspaceSlug || !session?.user?.id) return
      try {
        const data = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
          headers: { 'x-user-id': session?.user?.id || '' },
        })
        setUserRole(data?.userRole || null)
      } catch {
        setUserRole(null)
      }
    }

    fetchWorkspaceRole()
  }, [workspaceSlug, session?.user?.id])

  // --- Date Navigation Logic ---
  const handlePrev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (view === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() - 7)
      setCurrentDate(newDate)
    } else if (view === 'day') {
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
    } else if (view === 'day') {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + 1)
      setCurrentDate(newDate)
    }
  }

  const goToToday = () => setCurrentDate(new Date())

  const toggleType = (type: CalendarEventType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
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
              const stagesData = await apiFetchJson<any>(
                `/api/projects/${taskData.projectId}/stages`
              )
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

  const getDayEvents = (day: Date) =>
    events
      .filter((e) => isSameDay(parseISO(e.startAt), day))
      .filter((e) => {
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
          const hasMatch = filterMemberIds.some(
            (id) => assigneeIds.includes(id) || id === creatorId
          )
          if (!hasMatch) return false
        }

        return true
      })

  const canCreateTeamEvents = userRole ? !['member', 'guest'].includes(userRole) : true
  const canCreatePersonalEvents = userRole === 'member'
  const canCreateCalendarEvents = canCreateTeamEvents || canCreatePersonalEvents

  // --- View Logic ---
  let daysToRender: Date[] = []
  let gridCols = 7

  if (view === 'month') {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, {
      locale: enUS,
      weekStartsOn: weekStartDay === 'monday' ? 1 : 0,
    })
    const endDate = endOfWeek(monthEnd, {
      locale: enUS,
      weekStartsOn: weekStartDay === 'monday' ? 1 : 0,
    })
    daysToRender = eachDayOfInterval({ start: startDate, end: endDate })
    if (!showWeekends) daysToRender = daysToRender.filter((day) => !isWeekend(day))

    // Dynamic cols for month view if weekends hidden
    const weekDaysCount = showWeekends ? 7 : 5
    gridCols = weekDaysCount
  } else if (view === 'week') {
    const startDate = startOfWeek(currentDate, {
      locale: enUS,
      weekStartsOn: weekStartDay === 'monday' ? 1 : 0,
    })
    const endDate = endOfWeek(currentDate, {
      locale: enUS,
      weekStartsOn: weekStartDay === 'monday' ? 1 : 0,
    })
    daysToRender = eachDayOfInterval({ start: startDate, end: endDate })
    if (!showWeekends) daysToRender = daysToRender.filter((day) => !isWeekend(day))
    gridCols = daysToRender.length
  } else if (view === 'day') {
    daysToRender = [currentDate]
    gridCols = 1
  }

  // Generate week days dynamically based on locale
  const start = startOfWeek(new Date(), { weekStartsOn: weekStartDay === 'monday' ? 1 : 0 })
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return format(d, 'EEE', { locale: i18n.language === 'pl' ? pl : enUS })
  })

  // Adjust headers based on showWeekends for Month view, or just use daysToRender for Week/Day
  const visibleHeaders =
    view === 'month'
      ? showWeekends
        ? weekDays
        : weekDays.filter((_, i) => {
            // Monday start: Sat(5), Sun(6). Sunday start: Sun(0), Sat(6)
            if (weekStartDay === 'monday') return i < 5
            return i > 0 && i < 6
          })
      : daysToRender.map((d) => format(d, 'EEE', { locale: i18n.language === 'pl' ? pl : enUS }))

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl bg-[var(--app-bg-card)] font-sans">
      <div className="flex min-w-0 flex-1 flex-col p-6">
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
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-sm">
          {/* Headers */}
          <div
            className={cn('grid border-b border-[var(--app-border)]', `grid-cols-${gridCols}`)}
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
          >
            {visibleHeaders.map((day, i) => (
              <div
                key={i}
                className="bg-[var(--app-bg-deepest)]/30 border-r border-[var(--app-border)] py-3 text-center last:border-r-0"
              >
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    view === 'day' && isSameDay(daysToRender[0], new Date())
                      ? 'text-amber-500'
                      : 'text-[var(--app-text-muted)]'
                  )}
                >
                  {view === 'day' || view === 'week' ? (
                    <>
                      {format(daysToRender[i], 'EEE')}
                      <span
                        className={cn(
                          'ml-1',
                          isSameDay(daysToRender[i], new Date()) && 'text-amber-500'
                        )}
                      >
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
          <div
            className={cn(
              'grid flex-1 overflow-y-auto bg-[var(--app-bg-card)]',
              `grid-cols-${gridCols}`
            )}
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
          >
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
                  <div
                    key={day.toString()}
                    className="relative min-h-[1440px] bg-[var(--app-bg-card)]"
                  >
                    {/* Time Grid (Background) */}
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="border-[var(--app-border)]/50 absolute flex w-full border-t"
                        style={{ top: `${hour * 60}px`, height: '60px' }}
                      >
                        {/* Time Label */}
                        <div className="-mt-2.5 w-14 select-none pr-3 text-right text-xs text-[var(--app-text-muted)]">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        {/* Half-hour marker */}
                        <div className="border-[var(--app-border)]/20 absolute left-14 right-0 top-1/2 border-t" />
                      </div>
                    ))}

                    {/* Current Time Indicator (if today) */}
                    {isToday &&
                      (() => {
                        const now = new Date()
                        const minutes = now.getHours() * 60 + now.getMinutes()
                        return (
                          <div
                            className="pointer-events-none absolute left-14 right-0 z-10 border-t-2 border-red-500"
                            style={{ top: `${minutes}px` }}
                          >
                            <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                          </div>
                        )
                      })()}

                    {/* Click to add interaction area (simplified) */}
                    {canCreateCalendarEvents && (
                      <div
                        className="absolute inset-0 left-14 z-0"
                        onClick={() => {
                          setIsEventPanelOpen(true)
                        }}
                      />
                    )}

                    {/* Events */}
                    <div className="pointer-events-none absolute bottom-0 left-14 right-0 top-0">
                      {dayEvents.map((event) => {
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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEventClick(event, dayEvents)
                            }}
                            className={cn(
                              'pointer-events-auto absolute left-1 right-2 cursor-pointer overflow-hidden rounded-lg border-l-4 p-2 text-xs transition-colors hover:z-20',
                              event.priority === 'urgent' || event.priority === 'high'
                                ? 'border-red-500 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-100'
                                : event.priority === 'medium'
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-100'
                                  : event.priority === 'low'
                                    ? 'border-green-500 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-100'
                                    : 'border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-deepest)]'
                            )}
                            style={{
                              top: `${startMinutes}px`,
                              height: `${duration}px`,
                            }}
                          >
                            <div className="font-semibold">{event.title}</div>
                            <div className="text-[10px] opacity-75">
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
                    'hover:bg-[var(--app-bg-deepest)]/30 group relative border-[var(--app-border)] p-2 transition-all',
                    isRightBorder && 'border-r',
                    !isLastRow && 'border-b', // Only apply bottom border in month view rows (except last)
                    view !== 'month' && 'min-h-[500px]' // Vertical height for week view
                  )}
                >
                  <div
                    className={cn(
                      'flex h-full flex-col',
                      view === 'month' && !isCurrentMonth ? 'opacity-30' : 'opacity-100'
                    )}
                  >
                    {/* Day Number (Only visible in Month view, as Week/Day have it in header) */}
                    {view === 'month' && (
                      <div className="mb-2 flex justify-center">
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all',
                            isToday
                              ? 'bg-[#F59E0B] font-bold text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                              : 'text-[var(--app-text-muted)] group-hover:text-[var(--app-text-secondary)]'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                      </div>
                    )}

                    {/* Events Container */}
                    <div className="flex flex-1 flex-col gap-1 px-1">
                      {(view === 'month' ? dayEvents.slice(0, 2) : dayEvents).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEventClick(event, dayEvents)
                          }}
                          className={cn(
                            'group/card shrink-0 cursor-pointer rounded-lg px-2 py-1.5 transition-colors',
                            event.priority === 'urgent' || event.priority === 'high'
                              ? 'border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-200'
                              : event.priority === 'low'
                                ? 'border border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-200'
                                : 'border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-deepest)]'
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="truncate text-[11px] font-medium">{event.title}</span>
                            {view === 'week' && event.startAt && (
                              <span className="mt-0.5 text-[9px] text-[var(--app-text-muted)]">
                                {format(parseISO(event.startAt), 'HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* "More" button for Month View */}
                      {view === 'month' && dayEvents.length > 2 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDayClick(day, dayEvents)
                          }}
                          className="shrink-0 cursor-pointer text-center text-[9px] text-[var(--app-text-muted)] transition-colors hover:text-amber-500"
                        >
                          + {dayEvents.length - 2} more
                        </span>
                      )}
                    </div>

                    {/* Add Event Button (visible on hover) */}
                    {/* Show in all views for easy creation */}
                    {canCreateCalendarEvents && (
                      <div className="mt-2 shrink-0 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setSelectedDay(day)
                            setIsEventPanelOpen(true)
                          }}
                          className="bg-[var(--app-bg-deepest)]/50 flex w-full items-center justify-center gap-1 rounded border border-dashed border-[var(--app-border)] py-1 text-[10px] text-[var(--app-text-muted)] transition-all hover:bg-amber-500/10 hover:text-amber-500"
                        >
                          <span>+</span> {t('calendar.actions.add')}
                        </button>
                      </div>
                    )}
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
        onClose={() => {
          setIsEventPanelOpen(false)
          setSelectedDay(null)
        }}
        workspaceSlug={workspaceSlug}
        onCreate={handleRefresh}
        initialDate={selectedDay || undefined}
        canCreateEvents={canCreateTeamEvents}
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
          onClose={() => {
            setIsViewPanelOpen(false)
            setSelectedEvent(null)
          }}
          onEdit={handleEditEvent}
          onDeleted={handleRefresh}
        />
      )}

      {/* Edit Event Panel */}
      {isEditPanelOpen && selectedEvent && (
        <EditEventPanel
          event={selectedEvent}
          isOpen={isEditPanelOpen}
          onClose={() => {
            setIsEditPanelOpen(false)
            setSelectedEvent(null)
          }}
          workspaceSlug={workspaceSlug}
          onUpdated={handleRefresh}
          canCreateTeamEvents={canCreateTeamEvents}
        />
      )}

      {/* Task Details Panel (for task-type calendar events) */}
      <TaskDetailsPanel
        task={selectedTask}
        isOpen={isTaskPanelOpen}
        onClose={() => {
          setIsTaskPanelOpen(false)
          setSelectedTask(null)
        }}
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
              body: JSON.stringify({ isCompleted: !subtask.isCompleted }),
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
              body: JSON.stringify({ isCompleted: !selectedTask.isCompleted }),
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
                headers: { 'x-user-id': session?.user?.id || '' },
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
