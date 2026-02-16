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

function TaskBar({
    task,
    days,
    color,
}: {
    task: Task
    days: Date[]
    color: string
}) {
    // Fallback: If no startDate, use endDate. If no endDate, use startDate.
    const rawStartDate = task.startDate ? new Date(task.startDate) : (task.endDate ? new Date(task.endDate) : null)
    const rawEndDate = task.endDate ? new Date(task.endDate) : (task.startDate ? new Date(task.startDate) : null)

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
        startIdx = days.findIndex(d => isSameDay(d, startDate))
    }

    // Find visible end
    if (endDate > monthEnd) {
        endIdx = days.length - 1
    } else {
        endIdx = days.findIndex(d => isSameDay(d, endDate))
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
            className={`absolute top-2 h-8 flex items-center px-3 text-xs text-white font-semibold truncate shadow-md ${clippedLeft ? 'rounded-l-none border-l-2 border-white/20' : 'rounded-l-lg'} ${clippedRight ? 'rounded-r-none border-r-2 border-white/20' : 'rounded-r-lg'}`}
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
    const currentMonthLabel = currentMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })

    const handlePrevMonth = () => {
        onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }

    return (
        <div className="flex flex-col w-full h-full">
            {/* Month Navigator Header */}
            <div className="flex items-center justify-center h-10 gap-4 bg-[#1e1e29] rounded-xl m-2 flex-shrink-0">
                <button onClick={handlePrevMonth} className="text-gray-400 hover:text-white"><ChevronLeft size={14} /></button>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {currentMonthLabel}
                </span>
                <button onClick={handleNextMonth} className="text-gray-400 hover:text-white"><ChevronRight size={14} /></button>
            </div>

            {/* Gantt Container */}
            <div className="flex-1 flex flex-col mx-2 min-h-0 overflow-hidden bg-[#13131a] rounded-xl border border-gray-800">

                {/* 1. SEPARATE HEADER ROW */}
                <div
                    ref={headerRef}
                    className="flex overflow-hidden border-b border-gray-800 bg-[#1e1e29] relative z-50 flex-shrink-0 shadow-sm"
                >
                    <div className="min-w-max flex">
                        {/* Left Side Header (Sticky Left) */}
                        <div className="w-[720px] flex-shrink-0 sticky left-0 z-50 bg-[#1e1e29] flex items-center h-12 text-xs font-semibold text-gray-300 border-r border-gray-800 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
                            <div className="w-[240px] px-4 border-r border-gray-800/50 h-full flex items-center overflow-hidden"><Marquee>{t('projects.gantt.task_name')}</Marquee></div>
                            <div className="w-[100px] px-2 text-center border-r border-gray-800/50 h-full flex items-center justify-center overflow-hidden"><Marquee>{t('projects.gantt.start_date')}</Marquee></div>
                            <div className="w-[100px] px-2 text-center border-r border-gray-800/50 h-full flex items-center justify-center overflow-hidden"><Marquee>{t('projects.gantt.end_date')}</Marquee></div>
                            <div className="w-[100px] px-2 text-center border-r border-gray-800/50 h-full flex items-center justify-center overflow-hidden"><Marquee>{t('projects.gantt.status')}</Marquee></div>
                            <div className="w-[100px] px-2 text-center border-r border-gray-800/50 h-full flex items-center justify-center overflow-hidden"><Marquee>{t('projects.gantt.subtasks')}</Marquee></div>
                            <div className="w-[80px] px-2 text-center h-full flex items-center justify-center overflow-hidden"><Marquee>{t('projects.gantt.assignee')}</Marquee></div>
                        </div>

                        {/* Right Side Header (Calendar Days) */}
                        <div className="flex">
                            {days.map((day, idx) => {
                                const isToday = isSameDay(day, today)
                                return (
                                    <div
                                        key={idx}
                                        className={`w-12 h-12 flex-shrink-0 flex flex-col items-center justify-center text-[10px] border-r border-gray-800/50 last:border-0 ${isToday ? 'relative' : 'text-gray-500'} bg-[#1e1e29]`}
                                    >
                                        {isToday && (
                                            <div className="absolute inset-1 bg-amber-500/10 border border-amber-500/20 rounded-lg -z-0" />
                                        )}
                                        <span className={`relative z-10 ${isToday ? 'text-amber-500 font-bold' : ''}`}>{day.toLocaleDateString(i18n.language, { weekday: 'short' }).toUpperCase()}</span>
                                        <span className={`relative z-10 font-bold ${isToday ? 'text-amber-400' : ''}`}>{day.getDate()}</span>
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
                    className="overflow-auto custom-gantt-scroll relative z-0 max-h-[240px]"
                >
                    <div className="min-w-max">
                        {/* Task Rows */}
                        <div className="flex flex-col">
                            {tasks.map((task) => (
                                <div key={task.id} className="flex group transition-colors h-12 relative border-b border-gray-800/30 hover:bg-[#1a1a24]/50">
                                    {/* Left Side Details (Sticky Left) */}
                                    <div
                                        className="w-[720px] flex-shrink-0 sticky left-0 z-20 flex items-center bg-[#13131a] group-hover:bg-[#1a1a24] transition-colors border-r border-gray-800 shadow-[4px_0_24px_rgba(0,0,0,0.3)]"
                                        onClick={() => onTaskClick?.(task)}
                                    >
                                        <div className="w-[240px] px-4 text-sm font-medium text-gray-200 cursor-pointer hover:text-white transition-colors border-r border-gray-800/20 h-full flex items-center overflow-hidden">
                                            <Marquee>{task.title}</Marquee>
                                        </div>
                                        <div className="w-[100px] px-2 text-xs text-gray-500 text-center border-r border-gray-800/20 h-full flex items-center justify-center overflow-hidden">
                                            <Marquee>{task.startDate ? formatShortDate(task.startDate) : '-'}</Marquee>
                                        </div>
                                        <div className="w-[100px] px-2 text-xs text-gray-500 text-center border-r border-gray-800/20 h-full flex items-center justify-center overflow-hidden">
                                            <Marquee>{task.endDate ? formatShortDate(task.endDate) : '-'}</Marquee>
                                        </div>
                                        <div className="w-[100px] px-2 flex justify-center border-r border-gray-800/20 h-full items-center overflow-hidden">
                                            <StatusBadge status={task.status} stages={stages} size="sm" />
                                        </div>
                                        <div className="w-[100px] px-2 text-xs text-gray-500 flex items-center justify-center gap-1 border-r border-gray-800/20 h-full overflow-hidden">
                                            {task.subtasksCount ? (
                                                <span className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded text-[10px]">
                                                    <span className="text-gray-400">📄</span>
                                                    {task.subtasksCompleted || 0}/{task.subtasksCount}
                                                </span>
                                            ) : '-'}
                                        </div>
                                        <div className="w-[80px] px-2 flex justify-center h-full items-center">
                                            {task.assigneeDetails && task.assigneeDetails.length > 0 && (
                                                <div className="flex -space-x-1.5 items-center">
                                                    {task.assigneeDetails.slice(0, 2).map((assignee, idx) => (
                                                        assignee.image || assignee.avatar ? (
                                                            <img
                                                                key={assignee.id || idx}
                                                                src={assignee.image || assignee.avatar}
                                                                alt={assignee.name}
                                                                className="w-6 h-6 rounded-full object-cover border border-[#13131a] relative"
                                                                style={{ zIndex: 10 - idx }}
                                                                title={assignee.name}
                                                            />
                                                        ) : (
                                                            <div
                                                                key={assignee.id || idx}
                                                                className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] text-black font-bold border border-[#13131a] relative"
                                                                style={{ zIndex: 10 - idx }}
                                                                title={assignee.name}
                                                            >
                                                                {assignee.name.charAt(0)}
                                                            </div>
                                                        )
                                                    ))}
                                                    {task.assigneeDetails.length > 2 && (
                                                        <div
                                                            className="w-6 h-6 rounded-full bg-gray-800 border border-[#13131a] flex items-center justify-center text-[10px] text-gray-400 font-bold relative"
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
                                    <div className="flex relative z-10 h-full">
                                        {days.map((day, idx) => {
                                            const isToday = isSameDay(day, today)
                                            return (
                                                <div key={idx} className="w-12 h-full flex-shrink-0 border-r border-gray-800/30 relative last:border-0">
                                                    {/* Current Time Line Segment */}
                                                    {isToday && (
                                                        <div
                                                            className="absolute top-0 bottom-0 border-l border-dashed border-amber-500/50 z-10 pointer-events-none"
                                                            style={{ left: `${timePercentage}%` }}
                                                        />
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {/* Task Bar Overlay */}
                                        {task.startDate && task.endDate && (
                                            <TaskBar
                                                task={task}
                                                days={days}
                                                color={projectColor}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {tasks.length === 0 && (
                                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                                    <div className="w-[600px] text-center sticky left-0">
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

