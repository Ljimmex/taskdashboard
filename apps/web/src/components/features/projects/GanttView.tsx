import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StatusBadge } from '../tasks/components/StatusBadge'
import { getDaysInMonth, isSameDay, formatShortDate } from './utils'
import { Task } from './types'
import { useTranslation } from 'react-i18next'
import { Marquee } from '../../ui/Marquee'

// =============================================================================
// TASK BAR (for Gantt)
// =============================================================================

function TaskBar({ task, days, color }: { task: Task; days: Date[]; color: string }) {
  // Fallback: If no startDate, use endDate. If no endDate, use startDate.
  const rawStartDate = task.startDate
    ? new Date(task.startDate)
    : task.endDate
      ? new Date(task.endDate)
      : null
  const rawEndDate = task.endDate
    ? new Date(task.endDate)
    : task.startDate
      ? new Date(task.startDate)
      : null

  if (!rawStartDate || !rawEndDate) return null

  // Normalize to midnight for comparison to avoid time issues
  const setMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const startDate = setMidnight(rawStartDate)
  const endDate = setMidnight(rawEndDate)

  // Ensure start <= end
  if (startDate > endDate) {
    // swap if needed
    const temp = new Date(startDate)
    startDate.setTime(endDate.getTime())
    endDate.setTime(temp.getTime())
  }

  const monthStart = setMidnight(days[0])
  const monthEnd = setMidnight(days[days.length - 1])

  // Check visibility
  if (endDate < monthStart || startDate > monthEnd) return null

  // Calculate clamped indices
  let startIdx = -1
  let endIdx = -1

  // Find visible start
  if (startDate < monthStart) {
    startIdx = 0
  } else {
    startIdx = days.findIndex((d) => isSameDay(d, startDate))
  }

  // Find visible end
  if (endDate > monthEnd) {
    endIdx = days.length - 1
  } else {
    endIdx = days.findIndex((d) => isSameDay(d, endDate))
  }

  if (startIdx === -1) startIdx = 0 // Should usually be caught above
  if (endIdx === -1) endIdx = days.length - 1

  const DAY_WIDTH = 48
  const left = startIdx * DAY_WIDTH
  const width = (endIdx - startIdx + 1) * DAY_WIDTH

  // Visual indicator for clipping
  const clippedLeft = startDate < monthStart
  const clippedRight = endDate > monthEnd

  return (
    <div
      className={`absolute top-2 flex h-8 items-center truncate px-3 text-xs font-semibold text-white shadow-md ${clippedLeft ? 'rounded-l-none border-l-2 border-white/20' : 'rounded-l-lg'} ${clippedRight ? 'rounded-r-none border-r-2 border-white/20' : 'rounded-r-lg'}`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: color,
      }}
      title={`${task.title} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`}
    >
      {task.title}
    </div>
  )
}

export function GanttView({
  tasks,
  projectColor,
  stages,
  currentMonth,
  onMonthChange,
  onTaskClick,
}: {
  tasks: Task[]
  projectColor: string
  stages?: any[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onTaskClick?: (task: Task) => void
}) {
  const { t, i18n } = useTranslation()
  const today = new Date()
  const days = getDaysInMonth(currentMonth)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const timePercentage = (currentMinutes / (24 * 60)) * 100

  // Refs for scroll sync
  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Dynamic month formatting
  const currentMonthLabel = currentMonth.toLocaleDateString(i18n.language, {
    month: 'long',
    year: 'numeric',
  })

  const handlePrevMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Month Navigator Header */}
      <div className="m-2 flex h-10 flex-shrink-0 items-center justify-center gap-4 rounded-xl bg-[var(--app-bg-elevated)]">
        <button
          onClick={handlePrevMonth}
          className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-primary)]">
          {currentMonthLabel}
        </span>
        <button
          onClick={handleNextMonth}
          className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Gantt Container */}
      <div className="mx-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-page)]">
        {/* 1. SEPARATE HEADER ROW */}
        <div
          ref={headerRef}
          className="relative z-20 flex flex-shrink-0 overflow-hidden border-b border-[var(--app-border)] bg-[var(--app-bg-elevated)] shadow-sm"
        >
          <div className="flex min-w-max">
            {/* Left Side Header (Sticky Left) */}
            <div className="sticky left-0 z-30 flex h-12 w-[140px] flex-shrink-0 items-center border-r border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-xs font-semibold text-[var(--app-text-secondary)] shadow-[4px_0_24px_rgba(0,0,0,0.1)] md:w-[320px] lg:w-[720px]">
              <div className="flex h-full w-[140px] items-center overflow-hidden border-r border-[var(--app-divider)] px-2 focus-visible:outline-none md:w-[240px] md:px-4">
                <Marquee>{t('projects.gantt.task_name')}</Marquee>
              </div>
              <div className="hidden h-full w-[100px] items-center justify-center overflow-hidden border-r border-[var(--app-divider)] px-2 text-center focus-visible:outline-none lg:flex">
                <Marquee>{t('projects.gantt.start_date')}</Marquee>
              </div>
              <div className="hidden h-full w-[100px] items-center justify-center overflow-hidden border-r border-[var(--app-divider)] px-2 text-center focus-visible:outline-none lg:flex">
                <Marquee>{t('projects.gantt.end_date')}</Marquee>
              </div>
              <div className="hidden h-full w-[100px] items-center justify-center overflow-hidden border-r border-[var(--app-divider)] px-2 text-center focus-visible:outline-none lg:flex">
                <Marquee>{t('projects.gantt.status')}</Marquee>
              </div>
              <div className="hidden h-full w-[100px] items-center justify-center overflow-hidden border-r border-[var(--app-divider)] px-2 text-center focus-visible:outline-none lg:flex">
                <Marquee>{t('projects.gantt.subtasks')}</Marquee>
              </div>
              <div className="hidden h-full w-[80px] items-center justify-center overflow-hidden px-2 text-center focus-visible:outline-none md:flex">
                <Marquee>{t('projects.gantt.assignee')}</Marquee>
              </div>
            </div>

            {/* Right Side Header (Calendar Days) */}
            <div className="flex">
              {days.map((day, idx) => {
                const isToday = isSameDay(day, today)
                return (
                  <div
                    key={idx}
                    className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center border-r border-[var(--app-divider)] text-[10px] last:border-0 ${isToday ? 'relative' : 'text-[var(--app-text-muted)]'} bg-[var(--app-bg-elevated)]`}
                  >
                    {isToday && (
                      <div className="absolute inset-1 -z-0 rounded-lg border border-amber-500/20 bg-amber-500/10" />
                    )}
                    <span className={`relative z-10 ${isToday ? 'font-bold text-amber-500' : ''}`}>
                      {day.toLocaleDateString(i18n.language, { weekday: 'short' }).toUpperCase()}
                    </span>
                    <span className={`relative z-10 font-bold ${isToday ? 'text-amber-400' : ''}`}>
                      {day.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 2. SCROLLABLE BODY */}
        <div
          ref={bodyRef}
          onScroll={handleBodyScroll}
          className="custom-gantt-scroll relative z-0 max-h-[240px] overflow-auto"
        >
          <div className="min-w-max">
            {/* Task Rows */}
            <div className="flex flex-col">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="hover:bg-[var(--app-bg-sidebar)]/50 group relative flex h-12 border-b border-[var(--app-divider)] transition-colors"
                >
                  {/* Left Side Details (Sticky Left) */}
                  <div
                    className="sticky left-0 z-20 flex w-[140px] flex-shrink-0 items-center border-r border-[var(--app-border)] bg-[var(--app-bg-page)] shadow-[4px_0_24px_rgba(0,0,0,0.1)] transition-colors group-hover:bg-[var(--app-bg-sidebar)] md:w-[320px] lg:w-[720px]"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="flex h-full w-[140px] cursor-pointer items-center overflow-hidden border-r border-[var(--app-divider)] px-2 text-sm font-medium text-[var(--app-text-primary)] transition-colors hover:text-[var(--app-accent)] focus-visible:outline-none md:w-[240px] md:px-4">
                      <Marquee>{task.title}</Marquee>
                    </div>
                    <div className="hidden h-full w-[100px] items-center justify-center overflow-hidden border-r border-[var(--app-divider)] px-2 text-center text-xs text-[var(--app-text-muted)] focus-visible:outline-none lg:flex">
                      <Marquee>{task.startDate ? formatShortDate(task.startDate) : '-'}</Marquee>
                    </div>
                    <div className="hidden h-full w-[100px] items-center justify-center overflow-hidden border-r border-[var(--app-divider)] px-2 text-center text-xs text-[var(--app-text-muted)] focus-visible:outline-none lg:flex">
                      <Marquee>{task.endDate ? formatShortDate(task.endDate) : '-'}</Marquee>
                    </div>
                    <div className="hidden h-full w-[100px] items-center justify-center overflow-hidden border-r border-[var(--app-divider)] px-2 focus-visible:outline-none lg:flex">
                      <StatusBadge status={task.status} stages={stages} size="sm" />
                    </div>
                    <div className="hidden h-full w-[100px] items-center justify-center gap-1 overflow-hidden border-r border-[var(--app-divider)] px-2 text-xs text-[var(--app-text-muted)] focus-visible:outline-none lg:flex">
                      {task.subtasksCount ? (
                        <span className="flex items-center gap-1 rounded bg-[var(--app-divider)] px-1.5 py-0.5 text-[10px]">
                          <span className="text-[var(--app-text-muted)]">📄</span>
                          {task.subtasksCompleted || 0}/{task.subtasksCount}
                        </span>
                      ) : (
                        '-'
                      )}
                    </div>
                    <div className="hidden h-full w-[80px] items-center justify-center px-2 md:flex">
                      {task.assigneeDetails && task.assigneeDetails.length > 0 && (
                        <div className="flex items-center -space-x-1.5">
                          {task.assigneeDetails.slice(0, 2).map((assignee, idx) =>
                            assignee.image || assignee.avatar ? (
                              <img
                                key={assignee.id || idx}
                                src={assignee.image || assignee.avatar}
                                alt={assignee.name}
                                className="relative h-6 w-6 rounded-full border border-[var(--app-bg-page)] object-cover"
                                style={{ zIndex: 10 - idx }}
                                title={assignee.name}
                              />
                            ) : (
                              <div
                                key={assignee.id || idx}
                                className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[var(--app-bg-page)] bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-black"
                                style={{ zIndex: 10 - idx }}
                                title={assignee.name}
                              >
                                {assignee.name.charAt(0)}
                              </div>
                            )
                          )}
                          {task.assigneeDetails.length > 2 && (
                            <div
                              className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[var(--app-bg-page)] bg-[var(--app-divider)] text-[10px] font-bold text-[var(--app-text-muted)]"
                              style={{ zIndex: 0 }}
                            >
                              +{task.assigneeDetails.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side Gantt Grid Cells */}
                  <div className="relative z-10 flex h-full">
                    {days.map((day, idx) => {
                      const isToday = isSameDay(day, today)
                      return (
                        <div
                          key={idx}
                          className="relative h-full w-12 flex-shrink-0 border-r border-[var(--app-divider)] last:border-0"
                        >
                          {/* Current Time Line Segment */}
                          {isToday && (
                            <div
                              className="pointer-events-none absolute bottom-0 top-0 z-10 border-l border-dashed border-amber-500/50"
                              style={{ left: `${timePercentage}%` }}
                            />
                          )}
                        </div>
                      )
                    })}

                    {/* Task Bar Overlay */}
                    {task.startDate && task.endDate && (
                      <TaskBar task={task} days={days} color={projectColor} />
                    )}
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="flex h-32 items-center justify-center text-sm text-[var(--app-text-muted)]">
                  <div className="sticky left-0 w-[600px] text-center">
                    {t('projects.gantt.no_tasks')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
