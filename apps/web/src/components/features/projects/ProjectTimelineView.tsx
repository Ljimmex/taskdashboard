import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Task } from './types'
import { getDaysInMonth, isSameDay } from './utils'

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

const MONTH_NAMES = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
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
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}: ProjectTimelineViewProps) {
    const [viewMode, setViewMode] = useState<TimelineViewMode>('month') // Default to month to match requested fix
    const [hourRange, setHourRange] = useState<HourRange>(HOUR_RANGES[1].range)
    const [showHourMenu, setShowHourMenu] = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())
    const today = new Date()
    const now = new Date()

    // Group tasks by date
    const tasksByDate = useMemo(() => {
        const map = new Map<string, Task[]>()
        tasks.forEach(task => {
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
                hour12: false
            }).formatToParts(now)

            const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
            const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)

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
            return `${currentDate.getDate()} ${MONTH_NAMES[currentDate.getMonth()]}`
        } else if (viewMode === 'week') {
            const weekDays = getWeekDays(currentDate)
            return `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MONTH_NAMES[currentDate.getMonth()]}`
        } else {
            return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
        }
    }, [viewMode, currentDate])

    // Get days for current view
    const viewDays = useMemo(() => {
        if (viewMode === 'day') return [currentDate]
        if (viewMode === 'week') return getWeekDays(currentDate)
        return getDaysInMonth(currentDate)
    }, [viewMode, currentDate])

    // Month View "Now" Line Position Logic
    const DAY_WIDTH_MONTH = 48 // w-12 = 48px
    const todayIndex = viewDays.findIndex(d => isSameDay(d, today))
    const monthNowPosition = todayIndex !== -1
        ? (todayIndex * DAY_WIDTH_MONTH) + ((currentMinutes / (24 * 60)) * DAY_WIDTH_MONTH)
        : -1

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0 px-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">{headerLabel}</h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Hour Range Selector (only for day view) */}
                    {viewMode === 'day' && (
                        <div className="relative">
                            <button
                                onClick={() => setShowHourMenu(!showHourMenu)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#1e1e29] rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                {hourRange.start}:00 - {hourRange.end}:00
                                <ChevronLeft size={14} className="rotate-[-90deg]" />
                            </button>

                            {showHourMenu && (
                                <div className="absolute top-full right-0 mt-2 bg-[#1e1e29] rounded-lg border border-gray-700 shadow-xl z-50 py-1 min-w-[140px]">
                                    {HOUR_RANGES.map(({ label, range }) => (
                                        <button
                                            key={label}
                                            onClick={() => { setHourRange(range); setShowHourMenu(false) }}
                                            className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-700 transition-colors ${hourRange.start === range.start && hourRange.end === range.end ? 'text-[#F2CE88]' : 'text-gray-300'
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
                    <div className="flex items-center bg-[#1e1e29] rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Dzień
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Tydzień
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Miesiąc
                        </button>
                    </div>

                    <button
                        onClick={goToNow}
                        className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#1e1e29] rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Teraz
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

            {/* Timeline Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'month' ? (
                    /* Month View - Copied structure from TimelineView.tsx */
                    <div className="h-full flex flex-col">
                        <div className="overflow-x-auto custom-gantt-scroll pb-2 pr-4 [mask-image:linear-gradient(to_right,black_90%,transparent_100%)] h-full">
                            {/* Date Header bar */}
                            <div className="flex h-12 bg-[#1e1e29] rounded-xl mb-2 mx-2 shadow-sm items-center w-[calc(100%-16px)] min-w-max sticky top-0 z-20">
                                {viewDays.map((day, idx) => {
                                    const dayName = day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                                    const isToday = isSameDay(day, today)
                                    return (
                                        <div
                                            key={idx}
                                            className={`w-12 h-full flex-shrink-0 flex flex-col items-center justify-center text-[10px] ${isToday ? 'text-amber-500 font-bold' : 'text-gray-500'}`}
                                        >
                                            <span>{dayName}</span>
                                            <span>{day.getDate()}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Timeline Grid */}
                            <div className="flex flex-col mx-2 w-[calc(100%-16px)] min-w-max rounded-xl overflow-hidden border border-gray-700/20 bg-[#13131a] relative min-h-[100px]">

                                {/* Global "Current Time" Line Overlay */}
                                {monthNowPosition !== -1 && (
                                    <div
                                        className="absolute top-0 bottom-0 border-l border-dashed border-amber-500/50 z-30 pointer-events-none"
                                        style={{ left: `${monthNowPosition}px` }}
                                    />
                                )}

                                {/* Indicators Row */}
                                <div className="flex h-12 relative w-full border-b border-gray-700/20">
                                    {/* Horizontal Connecting Line */}
                                    <div
                                        className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 z-0"
                                        style={{ backgroundColor: `${projectColor}1A` }}
                                    />

                                    {viewDays.map((day, idx) => {
                                        const dateKey = formatLocalDate(day)
                                        const dayTasks = tasksByDate.get(dateKey) || []
                                        return (
                                            <div
                                                key={idx}
                                                className="w-12 flex-shrink-0 border-r border-gray-700/20 flex flex-col items-center justify-center relative z-10"
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
                                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm cursor-pointer hover:opacity-80 transition-opacity bg-background border border-gray-700/50"
                                                        style={{
                                                            borderColor: projectColor,
                                                            color: projectColor,
                                                            backgroundColor: '#13131a'
                                                        }}
                                                    >
                                                        {dayTasks.length}t
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Add Buttons Row */}
                                <div className="flex h-10 hover:bg-gray-800/20 transition-colors relative z-10">
                                    {viewDays.map((day, idx) => (
                                        <div
                                            key={idx}
                                            className="w-12 flex-shrink-0 border-r border-gray-700/20 flex items-center justify-center group"
                                        >
                                            <button
                                                onClick={() => onAddTask?.(day)}
                                                className="w-6 h-6 rounded flex items-center justify-center text-gray-600 group-hover:text-gray-400 group-hover:bg-gray-700/50 transition-colors"
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
                    <div className="h-full overflow-auto bg-[#16161f] rounded-xl border border-gray-800">
                        <div className="min-w-max">
                            {/* Hour Headers */}
                            <div className="flex border-b border-gray-800 sticky top-0 bg-[#16161f] z-10">
                                <div className="w-8 flex-shrink-0 border-r border-gray-800" />
                                {hours.map(hour => (
                                    <div
                                        key={hour}
                                        className="flex-1 min-w-[60px] py-2 text-center text-[10px] text-gray-500 border-r border-gray-800 last:border-r-0"
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
                                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-500 z-20 pointer-events-none"
                                        style={{ left: `calc(2rem + ((100% - 2rem) * ${nowPercentage}) / 100)` }}
                                    />
                                )}

                                {/* Task Lanes */}
                                {(() => {
                                    const dateKey = formatLocalDate(currentDate)
                                    const dayTasks = tasksByDate.get(dateKey) || []

                                    if (dayTasks.length === 0) {
                                        return (
                                            <div className="flex items-center justify-center h-24 text-gray-500 text-xs">
                                                Brak zadań na ten dzień
                                            </div>
                                        )
                                    }

                                    return dayTasks.map((task) => (
                                        <div key={task.id} className="flex h-9 border-b border-gray-800 hover:bg-gray-800/20 transition-colors">
                                            <div className="w-8 flex-shrink-0 border-r border-gray-800" />
                                            <div className="flex-1 relative px-1 py-1">
                                                <button
                                                    onClick={() => onTaskClick?.(task.id)}
                                                    className={`absolute left-1 right-1 top-1 bottom-1 rounded border-l-2 px-2 flex items-center justify-between ${getPriorityColor(task.priority || 'medium')}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-medium text-white truncate">{task.title}</div>
                                                    </div>
                                                    {task.assignee && (
                                                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[8px] text-black font-bold ml-1 flex-shrink-0">
                                                            {task.assignee.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                })()}

                                {/* Add Task Row */}
                                <div className="flex h-8 hover:bg-gray-800/20 transition-colors cursor-pointer group" onClick={() => onAddTask?.(currentDate)}>
                                    <div className="w-8 flex-shrink-0 border-r border-gray-800" />
                                    <div className="flex-1 flex items-center justify-center text-gray-500 group-hover:text-gray-300 transition-colors">
                                        <Plus size={14} className="mr-1" />
                                        <span className="text-[11px]">Dodaj zadanie</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Week View - Fitted Grid Style */
                    <div className="h-full flex flex-col bg-[#16161f] rounded-xl border border-gray-800 overflow-hidden">
                        {/* Header Row */}
                        <div className="grid grid-cols-7 border-b border-gray-800 bg-[#16161f]">
                            {viewDays.map((day, idx) => {
                                const isToday = isSameDay(day, today)
                                return (
                                    <div key={idx} className={`py-3 text-center border-r border-gray-800 last:border-r-0 ${isToday ? 'bg-amber-500/5' : ''}`}>
                                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">
                                            {day.toLocaleDateString('pl-PL', { weekday: 'short' })}
                                        </div>
                                        <div className={`text-sm font-bold ${isToday ? 'text-amber-500' : 'text-gray-200'}`}>
                                            {day.getDate()}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Grid Body */}
                        <div className="flex-1 grid grid-cols-7 relative divide-x divide-gray-800 overflow-y-auto custom-gantt-scroll">
                            {/* Week View Current Time Line */}
                            {viewDays.some(d => isSameDay(d, today)) && (
                                <div
                                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-500 z-20 pointer-events-none opacity-50"
                                    style={{
                                        left: `calc((100% / 7) * ${viewDays.findIndex(d => isSameDay(d, today))} + ((100% / 7) * ${currentMinutes / (24 * 60)}))`
                                    }}
                                />
                            )}

                            {viewDays.map((day, idx) => {
                                const dateKey = formatLocalDate(day)
                                const dayTasks = tasksByDate.get(dateKey) || []
                                const isToday = isSameDay(day, today)

                                return (
                                    <div key={idx} className={`h-full flex flex-col min-h-[300px] ${isToday ? 'bg-amber-500/[0.02]' : ''}`}>
                                        <div className="flex-1 p-2 space-y-2">
                                            {dayTasks.map(task => (
                                                <button
                                                    key={task.id}
                                                    onClick={() => onTaskClick?.(task.id)}
                                                    className={`w-full p-2 rounded-lg border-l-2 text-left shadow-sm group hover:scale-[1.02] active:scale-95 transition-all bg-[#1a1a24] hover:bg-[#20202b] border-gray-700/50 hover:border-amber-500/50 ${getPriorityColor(task.priority || 'medium')}`}
                                                >
                                                    <div className="text-xs font-medium text-gray-200 truncate leading-tight mb-1">{task.title}</div>
                                                    {task.assignee && (
                                                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-gray-600 border border-gray-500" />
                                                            <span className="text-[10px] text-gray-400">{task.assignee.name.split(' ')[0]}</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}

                                            {/* Add Button - Subtle on hover */}
                                            <button
                                                onClick={() => onAddTask?.(day)}
                                                className="w-full h-8 flex items-center justify-center rounded-lg border border-dashed border-gray-800 text-gray-600 hover:text-white hover:bg-gray-800 hover:border-gray-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
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
