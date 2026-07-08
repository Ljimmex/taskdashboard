import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getDaysInMonth, isSameDay } from './utils'
import { Task } from './types'
import { useTranslation } from 'react-i18next'

export function TimelineView({
  tasks,
  projectColor,
  currentMonth,
  onMonthChange,
  onAddTask,
  onDayClick,
}: {
  tasks: Task[]
  projectColor: string
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onTaskClick?: (task: Task) => void
  onAddTask?: (date?: Date) => void
  onDayClick?: (date: Date, tasks: Task[]) => void
}) {
  const { t, i18n } = useTranslation()
  const days = getDaysInMonth(currentMonth)

  // Group tasks by dueDate
  const tasksByDay = new Map<string, Task[]>()
  tasks.forEach((task) => {
    if (task.dueDate) {
      const dateKey = task.dueDate.split('T')[0]
      if (!tasksByDay.has(dateKey)) tasksByDay.set(dateKey, [])
      tasksByDay.get(dateKey)!.push(task)
    }
  })

  // Helper functions for timeline view navigation
  const handlePrevMonth = () =>
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const handleNextMonth = () =>
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const today = new Date()

  // Calculate current time position for the "Now" line
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const totalMinutes = 24 * 60
  const timePercentage = (currentMinutes / totalMinutes) * 100

  // Find today's index for absolute positioning
  const todayIndex = days.findIndex((d) => isSameDay(d, today))
  const DAY_WIDTH = 48 // w-12 is 48px
  const nowPosition =
    todayIndex !== -1 ? todayIndex * DAY_WIDTH + (timePercentage / 100) * DAY_WIDTH : -1

  return (
    <div className="flex w-full flex-col">
      {/* Month Navigator Header */}
      <div className="m-2 flex h-10 flex-shrink-0 items-center justify-center gap-4 rounded-xl bg-[var(--app-bg-elevated)]">
        <button
          onClick={handlePrevMonth}
          className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-primary)]">
          {currentMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={handleNextMonth}
          className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="custom-gantt-scroll overflow-x-auto pb-2 pr-4 [mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
        {/* Date Header bar */}
        <div className="mx-2 mb-2 flex h-12 w-[calc(100%-16px)] min-w-max items-center rounded-xl bg-[var(--app-bg-elevated)] shadow-sm">
          {days.map((day, idx) => {
            const dayName = day
              .toLocaleDateString(i18n.language, { weekday: 'short' })
              .toUpperCase()
            const isToday = isSameDay(day, today)
            return (
              <div
                key={idx}
                className={`flex h-full w-12 flex-shrink-0 flex-col items-center justify-center text-[10px] ${isToday ? 'font-bold text-amber-500' : 'text-[var(--app-text-muted)]'}`}
              >
                <span>{dayName}</span>
                <span>{day.getDate()}</span>
              </div>
            )
          })}
        </div>
        {/* Timeline Grid */}
        <div className="relative mx-2 flex w-[calc(100%-16px)] min-w-max flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-page)]">
          {/* Global "Current Time" Line Overlay */}
          {nowPosition !== -1 && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-30 border-l border-dashed border-amber-500/50"
              style={{ left: `${nowPosition}px` }}
            />
          )}

          {/* Indicators Row */}
          <div className="relative flex h-12 w-full">
            {/* Horizontal Connecting Line */}
            <div
              className="absolute left-0 right-0 top-1/2 z-0 h-[2px] -translate-y-1/2"
              style={{ backgroundColor: `${projectColor}1A` }} // 10% opacity roughly
            />

            {days.map((day, idx) => {
              const dateKey = day.toISOString().split('T')[0]
              const dayTasks = tasksByDay.get(dateKey) || []
              return (
                <div
                  key={idx}
                  className="relative z-10 flex w-12 flex-shrink-0 flex-col items-center justify-center border-r border-[var(--app-divider)]"
                >
                  {dayTasks.length > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        onDayClick?.(day, dayTasks)
                      }}
                      className="bg-background cursor-pointer rounded border border-[var(--app-border)] px-1.5 py-0.5 text-[10px] font-bold shadow-sm transition-opacity hover:opacity-80"
                      style={{
                        borderColor: projectColor,
                        color: projectColor,
                        backgroundColor: 'var(--app-bg-page)', // Match bg to hide line behind
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
          <div className="hover:bg-[var(--app-bg-sidebar)]/20 relative z-10 flex h-10 transition-colors">
            {days.map((day, idx) => (
              <div
                key={idx}
                className="group flex w-12 flex-shrink-0 items-center justify-center border-r border-[var(--app-divider)]"
              >
                <button
                  onClick={() => onAddTask?.(day)}
                  className="group-hover:bg-[var(--app-bg-sidebar)]/50 flex h-6 w-6 items-center justify-center rounded text-[var(--app-text-muted)] transition-colors group-hover:text-[var(--app-text-primary)]"
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
