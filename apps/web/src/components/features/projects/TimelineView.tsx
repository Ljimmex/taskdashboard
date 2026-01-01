import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getDaysInMonth, isSameDay } from './utils'
import { Task } from './types'

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
    const handlePrevMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    const handleNextMonth = () => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    const today = new Date()

    // Calculate current time position for the "Now" line
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const totalMinutes = 24 * 60
    const timePercentage = (currentMinutes / totalMinutes) * 100

    // Find today's index for absolute positioning
    const todayIndex = days.findIndex(d => isSameDay(d, today))
    const DAY_WIDTH = 48 // w-12 is 48px
    const nowPosition = todayIndex !== -1
        ? (todayIndex * DAY_WIDTH) + ((timePercentage / 100) * DAY_WIDTH)
        : -1

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    return (
        <div className="flex flex-col w-full">
            {/* Month Navigator Header */}
            <div className="flex items-center justify-center h-10 gap-4 bg-[#1e1e29] rounded-xl m-2 flex-shrink-0">
                <button onClick={handlePrevMonth} className="text-gray-400 hover:text-white"><ChevronLeft size={14} /></button>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button onClick={handleNextMonth} className="text-gray-400 hover:text-white"><ChevronRight size={14} /></button>
            </div>

            <div className="overflow-x-auto custom-gantt-scroll pb-2 pr-4 [mask-image:linear-gradient(to_right,black_90%,transparent_100%)]">
                {/* Date Header bar */}
                <div className="flex h-12 bg-[#1e1e29] rounded-xl mb-2 mx-2 shadow-sm items-center w-[calc(100%-16px)] min-w-max">
                    {days.map((day, idx) => {
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
                <div className="flex flex-col mx-2 w-[calc(100%-16px)] min-w-max rounded-xl overflow-hidden border border-gray-700/20 bg-[#13131a] relative">

                    {/* Global "Current Time" Line Overlay */}
                    {nowPosition !== -1 && (
                        <div
                            className="absolute top-0 bottom-0 border-l border-dashed border-amber-500/50 z-30 pointer-events-none"
                            style={{ left: `${nowPosition}px` }}
                        />
                    )}

                    {/* Indicators Row */}
                    <div className="flex h-12 relative w-full">
                        {/* Horizontal Connecting Line */}
                        <div
                            className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 z-0"
                            style={{ backgroundColor: `${projectColor}1A` }} // 10% opacity roughly
                        />

                        {days.map((day, idx) => {
                            const dateKey = day.toISOString().split('T')[0]
                            const dayTasks = tasksByDay.get(dateKey) || []
                            return (
                                <div
                                    key={idx}
                                    className="w-12 flex-shrink-0 border-r border-gray-700/20 flex flex-col items-center justify-center relative z-10"
                                >
                                    {dayTasks.length > 0 && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDayClick?.(day, dayTasks)
                                            }}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm cursor-pointer hover:opacity-80 transition-opacity bg-background border border-gray-700/50"
                                            style={{
                                                borderColor: projectColor,
                                                color: projectColor,
                                                backgroundColor: '#13131a' // Match bg to hide line behind
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
                        {days.map((day, idx) => (
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
    )
}
