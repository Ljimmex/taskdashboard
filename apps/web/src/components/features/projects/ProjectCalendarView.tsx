import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Task } from './types'

type CalendarViewMode = 'month' | 'week'

interface ProjectCalendarViewProps {
    tasks: Task[]
    projectColor: string
    currentMonth: Date
    onMonthChange: (date: Date) => void
    onTaskClick?: (taskId: string) => void
    onAddTask?: (date?: Date) => void
}

function isSameDay(d1: Date, d2: Date) {
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear()
}

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
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
    start.setDate(diff)

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        days.push(d)
    }
    return days
}

function getMonthDays(date: Date): (Date | null)[] {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: (Date | null)[] = []

    // Add empty slots for days before the first day (Monday-based)
    let startDay = firstDay.getDay()
    startDay = startDay === 0 ? 6 : startDay - 1 // Convert to Monday-first
    for (let i = 0; i < startDay; i++) {
        days.push(null)
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i))
    }

    return days
}

// Priority color mapping
function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'urgent':
        case 'high':
            return 'border-red-400 bg-red-500/10'
        case 'medium':
            return 'border-amber-400 bg-amber-500/10'
        case 'low':
            return 'border-green-400 bg-green-500/10'
        default:
            return 'border-gray-400 bg-gray-500/10'
    }
}

export function ProjectCalendarView({
    tasks,
    projectColor: _projectColor,
    currentMonth,
    onMonthChange,
    onTaskClick,
    onAddTask,
}: ProjectCalendarViewProps) {
    const { t, i18n } = useTranslation()
    const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
    const today = new Date()

    // Generate day names dynamically for current locale
    const dayNames = useMemo(() => {
        const base = new Date(2024, 0, 1) // Monday, Jan 1st 2024
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(base)
            d.setDate(base.getDate() + i)
            return d.toLocaleDateString(i18n.language, { weekday: 'short' })
        })
    }, [i18n.language])

    // Group tasks by date
    const tasksByDate = new Map<string, Task[]>()
    tasks.forEach(task => {
        if (task.dueDate) {
            const dateKey = task.dueDate.split('T')[0]
            if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, [])
            tasksByDate.get(dateKey)!.push(task)
        }
    })

    const handlePrev = () => {
        if (viewMode === 'month') {
            onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
        } else {
            const newDate = new Date(currentMonth)
            newDate.setDate(newDate.getDate() - 7)
            onMonthChange(newDate)
        }
    }

    const handleNext = () => {
        if (viewMode === 'month') {
            onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
        } else {
            const newDate = new Date(currentMonth)
            newDate.setDate(newDate.getDate() + 7)
            onMonthChange(newDate)
        }
    }

    const goToToday = () => {
        onMonthChange(new Date())
    }

    const days = viewMode === 'month' ? getMonthDays(currentMonth) : getWeekDays(currentMonth)

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">
                        {currentMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                    </h2>
                    <button
                        onClick={() => { }}
                        className="p-1 text-gray-400"
                    >
                        <ChevronLeft size={16} className="rotate-90" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Selector */}
                    <div className="flex items-center bg-[#1e1e29] rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {t('projects.calendar.month')}
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {t('projects.calendar.week')}
                        </button>
                    </div>

                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#1e1e29] rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        {t('projects.calendar.today')}
                    </button>

                    <div className="flex items-center gap-1">
                        <button onClick={handlePrev} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={handleNext} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-[#16161f] rounded-xl border border-gray-800 overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-gray-800">
                    {dayNames.map(day => (
                        <div key={day} className="py-3 text-center text-xs font-medium text-gray-500 border-r border-gray-800 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Cells */}
                {viewMode === 'month' ? (
                    <div className="grid grid-cols-7 auto-rows-fr" style={{ minHeight: 'calc(100% - 40px)' }}>
                        {days.map((day, idx) => {
                            if (!day) {
                                return <div key={idx} className="border-r border-b border-gray-800 bg-[#0d0d12]/50" />
                            }

                            const dateKey = formatLocalDate(day)
                            const dayTasks = tasksByDate.get(dateKey) || []
                            const isToday = isSameDay(day, today)
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6

                            return (
                                <div
                                    key={idx}
                                    className={`border-r border-b border-gray-800 p-2 min-h-[100px] cursor-pointer hover:bg-gray-800/20 transition-colors ${isWeekend ? 'bg-[#0d0d12]/30' : ''
                                        }`}
                                    onClick={() => onAddTask?.(day)}
                                >
                                    <div className={`text-sm mb-2 ${isToday ? 'w-7 h-7 rounded-full bg-[#F2CE88] text-black flex items-center justify-center font-bold' : 'text-gray-400'}`}>
                                        {day.getDate()}
                                    </div>
                                    <div className="space-y-1 overflow-hidden">
                                        {dayTasks.slice(0, 3).map(task => (
                                            <div
                                                key={task.id}
                                                onClick={(e) => { e.stopPropagation(); onTaskClick?.(task.id) }}
                                                className={`px-2 py-1 text-xs rounded border-l-2 truncate cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(task.priority || 'medium')}`}
                                            >
                                                {task.title}
                                            </div>
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="text-xs text-gray-500 px-2">
                                                {t('projects.calendar.more_tasks', { count: dayTasks.length - 3 })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    /* Week View */
                    <div className="grid grid-cols-7 h-full">
                        {(days as Date[]).map((day, idx) => {
                            const dateKey = formatLocalDate(day)
                            const dayTasks = tasksByDate.get(dateKey) || []
                            const isToday = isSameDay(day, today)
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6

                            return (
                                <div
                                    key={idx}
                                    className={`border-r border-gray-800 last:border-r-0 flex flex-col ${isWeekend ? 'bg-[#0d0d12]/30' : ''
                                        }`}
                                >
                                    {/* Day Header */}
                                    <div className={`p-3 border-b border-gray-800 text-center ${isToday ? 'bg-amber-500/10' : ''}`}>
                                        <div className={`text-xs mb-1 ${isToday ? 'text-[#F2CE88] font-bold' : 'text-gray-500'}`}>
                                            {day.toLocaleDateString('pl-PL', { weekday: 'short' })} {day.getDate()}
                                        </div>
                                    </div>

                                    {/* Tasks */}
                                    <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                        {dayTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => onTaskClick?.(task.id)}
                                                className={`p-3 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(task.priority || 'medium')}`}
                                            >
                                                <div className="text-sm font-medium text-white mb-1 line-clamp-2">{task.title}</div>
                                                {task.assigneeDetails && task.assigneeDetails.length > 0 && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="flex -space-x-1.5">
                                                            {task.assigneeDetails.slice(0, 2).map((assignee, aIdx) => (
                                                                <div
                                                                    key={assignee.id || aIdx}
                                                                    className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] text-black font-bold border border-[#16161f]"
                                                                    title={assignee.name}
                                                                >
                                                                    {assignee.image || assignee.avatar ? (
                                                                        <img src={assignee.image || assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                                                                    ) : (
                                                                        assignee.name?.charAt(0)
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {task.assigneeDetails.length > 2 && (
                                                                <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[8px] text-gray-400 font-bold border border-[#16161f]">
                                                                    +{task.assigneeDetails.length - 2}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {task.assigneeDetails.length === 1 && (
                                                            <span className="text-[10px] text-gray-400 truncate">{task.assigneeDetails[0].name}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Add Task Button */}
                                        <button
                                            onClick={() => onAddTask?.(day)}
                                            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
                                        >
                                            + {t('projects.calendar.add_task')}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
