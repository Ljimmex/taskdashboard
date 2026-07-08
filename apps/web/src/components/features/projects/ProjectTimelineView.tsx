import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Task } from './types'
import { getDaysInMonth, isSameDay } from './utils'
import { useTranslation } from 'react-i18next'

type TimelineViewMode = 'day' | 'week' | 'month'

interface HourRange {
  start: number
  end: number
}

interface ProjectTimelineViewProps {
  tasks: Task[]
  projectColor: string
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onTaskClick?: (taskId: string) => void
  onAddTask?: (date?: Date) => void
  timezone?: string
}

const HOUR_RANGES: { label: string; range: HourRange }[] = [
  { label: '6:00 - 12:00', range: { start: 6, end: 12 } },
  { label: '8:00 - 17:00', range: { start: 8, end: 17 } },
  { label: '9:00 - 18:00', range: { start: 9, end: 18 } },
  { label: '12:00 - 20:00', range: { start: 12, end: 20 } },
  { label: '0:00 - 24:00', range: { start: 0, end: 24 } },
]

// Format date to YYYY-MM-DD in local timezone (avoids UTC shift from toISOString)
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekDays(date: Date): Date[] {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setDate(diff)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'bg-red-500/20 border-red-500/50'
    case 'medium':
      return 'bg-amber-500/20 border-amber-500/50'
    case 'low':
      return 'bg-green-500/20 border-green-500/50'
    default:
      return 'bg-gray-500/20 border-gray-500/50'
  }
}

export function ProjectTimelineView({
  tasks,
  projectColor,
  currentMonth: _currentMonth,
  onMonthChange,
  onTaskClick,
  onAddTask,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: ProjectTimelineViewProps) {
  const { t, i18n } = useTranslation()
  const [viewMode, setViewMode] = useState<TimelineViewMode>('month') // Default to month to match requested fix
  const [hourRange, setHourRange] = useState<HourRange>(HOUR_RANGES[1].range)
  const [showHourMenu, setShowHourMenu] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()
  const now = new Date()

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = task.dueDate.split('T')[0]
        if (!map.has(dateKey)) map.set(dateKey, [])
        map.get(dateKey)!.push(task)
      }
    })
    return map
  }, [tasks])

  const hours = useMemo(() => {
    const h: number[] = []
    for (let i = hourRange.start; i <= hourRange.end; i++) {
      h.push(i)
    }
    return h
  }, [hourRange])

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
    onMonthChange(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
    onMonthChange(newDate)
  }

  const goToNow = () => {
    const now = new Date()
    setCurrentDate(now)
    onMonthChange(now)
  }

  // Calculate current time position based on timezone
  const getWorkspaceTime = () => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(now)

      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)

      // Handle edge case where 24:00 is returned as 24 or 0 depending on browser
      return (hour % 24) * 60 + minute
    } catch (e) {
      // Fallback to local time if timezone is invalid
      console.warn('Invalid timezone:', timezone, e)
      return now.getHours() * 60 + now.getMinutes()
    }
  }

  const currentMinutes = getWorkspaceTime()
  const rangeStartMinutes = hourRange.start * 60
  const rangeEndMinutes = hourRange.end * 60
  const totalRangeMinutes = rangeEndMinutes - rangeStartMinutes
  const nowPercentage = ((currentMinutes - rangeStartMinutes) / totalRangeMinutes) * 100
  const showNowLine = nowPercentage >= 0 && nowPercentage <= 100

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${currentDate.toLocaleDateString(i18n.language, { month: 'long' })}`
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays(currentDate)
      return `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${currentDate.toLocaleDateString(i18n.language, { month: 'long' })}`
    } else {
      return currentDate.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
    }
  }, [viewMode, currentDate, i18n.language])

  // Get days for current view
  const viewDays = useMemo(() => {
    if (viewMode === 'day') return [currentDate]
    if (viewMode === 'week') return getWeekDays(currentDate)
    return getDaysInMonth(currentDate)
  }, [viewMode, currentDate])

  // Month View "Now" Line Position Logic
  const DAY_WIDTH_MONTH = 48 // w-12 = 48px
  const todayIndex = viewDays.findIndex((d) => isSameDay(d, today))
  const monthNowPosition =
    todayIndex !== -1
      ? todayIndex * DAY_WIDTH_MONTH + (currentMinutes / (24 * 60)) * DAY_WIDTH_MONTH
      : -1

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-shrink-0 flex-col items-start justify-between gap-4 px-2 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">{headerLabel}</h2>
        </div>

        <div className="custom-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:pb-0">
          {/* Hour Range Selector (only for day view) */}
          {viewMode === 'day' && (
            <div className="relative">
              <button
                onClick={() => setShowHourMenu(!showHourMenu)}
                className="flex items-center gap-2 rounded-lg bg-[#1e1e29] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
              >
                {hourRange.start}:00 - {hourRange.end}:00
                <ChevronLeft size={14} className="rotate-[-90deg]" />
              </button>

              {showHourMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] rounded-lg border border-gray-700 bg-[#1e1e29] py-1 shadow-xl">
                  {HOUR_RANGES.map(({ label, range }) => (
                    <button
                      key={label}
                      onClick={() => {
                        setHourRange(range)
                        setShowHourMenu(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-700 ${
                        hourRange.start === range.start && hourRange.end === range.end
                          ? 'text-[#F2CE88]'
                          : 'text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View Mode Selector */}
          <div className="flex items-center rounded-lg bg-[#1e1e29] p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'day' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('projects.timeline.day')}
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('projects.timeline.week')}
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('projects.timeline.month')}
            </button>
          </div>

          <button
            onClick={goToNow}
            className="rounded-lg bg-[#1e1e29] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            {t('projects.timeline.now')}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'month' ? (
          /* Month View - Copied structure from TimelineView.tsx */
          <div className="flex h-full flex-col">
            <div className="custom-gantt-scroll h-full overflow-x-auto pb-2 pr-4 [mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
              {/* Date Header bar */}
              <div className="sticky top-0 z-20 mx-2 mb-2 flex h-12 w-[calc(100%-16px)] min-w-max items-center rounded-xl bg-[#1e1e29] shadow-sm">
                {viewDays.map((day, idx) => {
                  const dayName = day
                    .toLocaleDateString(i18n.language, { weekday: 'short' })
                    .toUpperCase()
                  const isToday = isSameDay(day, today)
                  return (
                    <div
                      key={idx}
                      className={`flex h-full w-12 flex-shrink-0 flex-col items-center justify-center text-[10px] ${isToday ? 'font-bold text-amber-500' : 'text-gray-500'}`}
                    >
                      <span>{dayName}</span>
                      <span>{day.getDate()}</span>
                    </div>
                  )
                })}
              </div>

              {/* Timeline Grid */}
              <div className="relative mx-2 flex min-h-[100px] w-[calc(100%-16px)] min-w-max flex-col overflow-hidden rounded-xl border border-gray-700/20 bg-[#13131a]">
                {/* Global "Current Time" Line Overlay */}
                {monthNowPosition !== -1 && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-30 border-l border-dashed border-amber-500/50"
                    style={{ left: `${monthNowPosition}px` }}
                  />
                )}

                {/* Indicators Row */}
                <div className="relative flex h-12 w-full border-b border-gray-700/20">
                  {/* Horizontal Connecting Line */}
                  <div
                    className="absolute left-0 right-0 top-1/2 z-0 h-[2px] -translate-y-1/2"
                    style={{ backgroundColor: `${projectColor}1A` }}
                  />

                  {viewDays.map((day, idx) => {
                    const dateKey = formatLocalDate(day)
                    const dayTasks = tasksByDate.get(dateKey) || []
                    return (
                      <div
                        key={idx}
                        className="relative z-10 flex w-12 flex-shrink-0 flex-col items-center justify-center border-r border-gray-700/20"
                      >
                        {dayTasks.length > 0 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              // For month view, maybe zoom to day? or just show details of first task if 1?
                              // Original TimelineView: onDayClick(day, dayTasks) or if 1 task click it onTaskClick(id)
                              if (dayTasks.length === 1 && onTaskClick) {
                                onTaskClick(dayTasks[0].id)
                              } else if (onTaskClick && dayTasks.length > 0) {
                                // Could implement day-click-to-list.
                                // For now keeping simple click first task behaviour or just indicator?
                                // Original logic in TimelineView:
                                // if (dayTasks.length === 1) onTaskClick?.(dayTasks[0].id)
                                // else onDayClick?.(day, dayTasks)
                                // Let's emulate that if onTaskClick passed.
                                onTaskClick(dayTasks[0].id)
                              }
                            }}
                            className="bg-background cursor-pointer rounded border border-gray-700/50 px-1.5 py-0.5 text-[10px] font-bold shadow-sm transition-opacity hover:opacity-80"
                            style={{
                              borderColor: projectColor,
                              color: projectColor,
                              backgroundColor: '#13131a',
                            }}
                          >
                            {dayTasks.length}
                            {t('projects.timeline.task_abbr')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add Buttons Row */}
                <div className="relative z-10 flex h-10 transition-colors hover:bg-gray-800/20">
                  {viewDays.map((day, idx) => (
                    <div
                      key={idx}
                      className="group flex w-12 flex-shrink-0 items-center justify-center border-r border-gray-700/20"
                    >
                      <button
                        onClick={() => onAddTask?.(day)}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-600 transition-colors group-hover:bg-gray-700/50 group-hover:text-gray-400"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'day' ? (
          /* Day View - Horizontal Timeline */
          <div className="h-full overflow-auto rounded-xl border border-gray-800 bg-[#16161f]">
            <div className="min-w-max">
              {/* Hour Headers */}
              <div className="sticky top-0 z-10 flex border-b border-gray-800 bg-[#16161f]">
                <div className="w-8 flex-shrink-0 border-r border-gray-800" />
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="min-w-[60px] flex-1 border-r border-gray-800 py-2 text-center text-[10px] text-gray-500 last:border-r-0"
                  >
                    {hour}:00
                  </div>
                ))}
              </div>

              {/* Task Rows */}
              <div className="relative">
                {/* Current Time Line */}
                {showNowLine && isSameDay(currentDate, today) && (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-20 border-l-2 border-dashed border-amber-500"
                    style={{ left: `calc(2rem + ((100% - 2rem) * ${nowPercentage}) / 100)` }}
                  />
                )}

                {/* Task Lanes */}
                {(() => {
                  const dateKey = formatLocalDate(currentDate)
                  const dayTasks = tasksByDate.get(dateKey) || []

                  if (dayTasks.length === 0) {
                    return (
                      <div className="flex h-24 items-center justify-center text-xs text-gray-500">
                        {t('projects.timeline.no_tasks_day')}
                      </div>
                    )
                  }

                  return dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex h-9 border-b border-gray-800 transition-colors hover:bg-gray-800/20"
                    >
                      <div className="w-8 flex-shrink-0 border-r border-gray-800" />
                      <div className="relative flex-1 px-1 py-1">
                        <button
                          onClick={() => onTaskClick?.(task.id)}
                          className={`absolute bottom-1 left-1 right-1 top-1 flex items-center justify-between rounded border-l-2 px-2 ${getPriorityColor(task.priority || 'medium')}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[10px] font-medium text-white">
                              {task.title}
                            </div>
                          </div>
                          {task.assigneeDetails && task.assigneeDetails.length > 0 && (
                            <div className="ml-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[8px] font-bold text-black">
                              {task.assigneeDetails[0].name?.charAt(0)}
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                })()}

                {/* Add Task Row */}
                <div
                  className="group flex h-8 cursor-pointer transition-colors hover:bg-gray-800/20"
                  onClick={() => onAddTask?.(currentDate)}
                >
                  <div className="w-8 flex-shrink-0 border-r border-gray-800" />
                  <div className="flex flex-1 items-center justify-center text-gray-500 transition-colors group-hover:text-gray-300">
                    <Plus size={14} className="mr-1" />
                    <span className="text-[11px]">{t('projects.timeline.add_task')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Week View - Fitted Grid Style */
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-800 bg-[#16161f]">
            {/* Header Row */}
            <div className="grid grid-cols-7 border-b border-gray-800 bg-[#16161f]">
              {viewDays.map((day, idx) => {
                const isToday = isSameDay(day, today)
                return (
                  <div
                    key={idx}
                    className={`border-r border-gray-800 py-3 text-center last:border-r-0 ${isToday ? 'bg-amber-500/5' : ''}`}
                  >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                      {day.toLocaleDateString(i18n.language, { weekday: 'short' })}
                    </div>
                    <div
                      className={`text-sm font-bold ${isToday ? 'text-amber-500' : 'text-gray-200'}`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Grid Body */}
            <div className="custom-gantt-scroll relative grid flex-1 grid-cols-7 divide-x divide-gray-800 overflow-y-auto">
              {/* Week View Current Time Line */}
              {viewDays.some((d) => isSameDay(d, today)) && (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-20 border-l-2 border-dashed border-amber-500 opacity-50"
                  style={{
                    left: `calc((100% / 7) * ${viewDays.findIndex((d) => isSameDay(d, today))} + ((100% / 7) * ${currentMinutes / (24 * 60)}))`,
                  }}
                />
              )}

              {viewDays.map((day, idx) => {
                const dateKey = formatLocalDate(day)
                const dayTasks = tasksByDate.get(dateKey) || []
                const isToday = isSameDay(day, today)

                return (
                  <div
                    key={idx}
                    className={`flex h-full min-h-[300px] flex-col ${isToday ? 'bg-amber-500/[0.02]' : ''}`}
                  >
                    <div className="flex-1 space-y-2 p-2">
                      {dayTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick?.(task.id)}
                          className={`group w-full rounded-lg border-l-2 border-gray-700/50 bg-[#1a1a24] p-2 text-left shadow-sm transition-all hover:scale-[1.02] hover:border-amber-500/50 hover:bg-[#20202b] active:scale-95 ${getPriorityColor(task.priority || 'medium')}`}
                        >
                          <div className="mb-1 truncate text-xs font-medium leading-tight text-gray-200">
                            {task.title}
                          </div>
                          {task.assigneeDetails && task.assigneeDetails.length > 0 && (
                            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100">
                              <div className="h-3.5 w-3.5 overflow-hidden rounded-full border border-gray-500 bg-gray-600">
                                {task.assigneeDetails[0].image || task.assigneeDetails[0].avatar ? (
                                  <img
                                    src={
                                      task.assigneeDetails[0].image ||
                                      task.assigneeDetails[0].avatar
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {task.assigneeDetails[0].name.split(' ')[0]}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}

                      {/* Add Button - Subtle on hover */}
                      <button
                        onClick={() => onAddTask?.(day)}
                        className="flex h-8 w-full items-center justify-center rounded-lg border border-dashed border-gray-800 text-gray-600 opacity-0 transition-all hover:border-gray-600 hover:bg-gray-800 hover:text-white focus:opacity-100 group-hover:opacity-100"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
