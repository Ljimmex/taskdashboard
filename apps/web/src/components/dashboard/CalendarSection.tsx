import { useState } from 'react'
import { CalendarIcon, FilterIcon, ScheduleIcon, ArrowLeftIcon, ArrowRightIcon } from './icons'

interface CalendarEvent {
    id: string
    title: string
    color: string // 'amber' | 'blue' | 'green' | 'purple'
}

interface CalendarSectionProps {
    onFilterClick?: () => void
    onRescheduleClick?: () => void
    onTodayClick?: () => void
    events?: Record<number, CalendarEvent[]> // day -> events
}

// Mock events for demo
const mockEvents: Record<number, CalendarEvent[]> = {
    1: [{ id: '1', title: 'Meeting', color: 'amber' }],
    2: [{ id: '2', title: 'Call', color: 'blue' }],
    5: [{ id: '3', title: 'Review', color: 'green' }, { id: '4', title: 'Sync', color: 'purple' }],
    12: [{ id: '5', title: 'Launch', color: 'amber' }],
    15: [{ id: '6', title: 'Demo', color: 'blue' }],
    20: [{ id: '7', title: 'Sprint', color: 'green' }],
    25: [{ id: '8', title: 'Release', color: 'amber' }],
}

const eventColors: Record<string, string> = {
    amber: 'bg-amber-500/80',
    blue: 'bg-blue-500/80',
    green: 'bg-green-500/80',
    purple: 'bg-purple-500/80',
}

export function CalendarSection({ onFilterClick, onRescheduleClick, onTodayClick, events = mockEvents }: CalendarSectionProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [hoveredButton, setHoveredButton] = useState<string | null>(null)

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Generate calendar days
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const firstDayOfMonth = new Date(year, month, 1).getDay()
        const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

        const days: (number | null)[] = []

        // Add empty slots for days before the 1st
        for (let i = 0; i < adjustedFirstDay; i++) {
            days.push(null)
        }

        // Add actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i)
        }

        return days
    }

    const days = getDaysInMonth(currentMonth)
    const today = new Date().getDate()
    const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    // Split days into weeks
    const weeks: (number | null)[][] = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    return (
        <div className="rounded-2xl bg-[#12121a] p-5">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
                {/* Month/Year with icon */}
                <div className="flex items-center gap-2">
                    <CalendarIcon />
                    <h3 className="text-sm font-semibold text-white">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onFilterClick}
                            onMouseEnter={() => setHoveredButton('filter')}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium text-gray-500 hover:text-[#F2CE88] bg-[#1a1a24] rounded-lg transition-colors hover:bg-gray-800"
                        >
                            <FilterIcon isHovered={hoveredButton === 'filter'} />
                            Filter
                        </button>
                        <button
                            onClick={onRescheduleClick}
                            onMouseEnter={() => setHoveredButton('schedule')}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider font-medium text-gray-500 hover:text-[#F2CE88] bg-[#1a1a24] rounded-lg transition-colors hover:bg-gray-800"
                        >
                            <ScheduleIcon isHovered={hoveredButton === 'schedule'} />
                            Schedule setting
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevMonth}
                            onMouseEnter={() => setHoveredButton('prev')}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="w-8 h-8 flex items-center justify-center transition-all"
                        >
                            <ArrowLeftIcon isHovered={hoveredButton === 'prev'} />
                        </button>

                        <button
                            onClick={onTodayClick}
                            className="px-3 py-1 rounded-lg text-[10px] font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mx-1"
                        >
                            Today
                        </button>

                        <button
                            onClick={nextMonth}
                            onMouseEnter={() => setHoveredButton('next')}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="w-8 h-8 flex items-center justify-center transition-all"
                        >
                            <ArrowRightIcon isHovered={hoveredButton === 'next'} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid with "kratki" (grid lines) */}
            <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-800/10">
                {/* Day Names Header */}
                <div className="grid grid-cols-7 border-b border-gray-800">
                    {dayNames.map((day, idx) => (
                        <div
                            key={day}
                            className={`text-center text-[10px] text-gray-600 font-medium py-2 ${idx < 6 ? 'border-r border-gray-800' : ''}`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div>
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className={`grid grid-cols-7 ${weekIndex < weeks.length - 1 ? 'border-b border-gray-800' : ''}`}>
                            {week.map((day, dayIndex) => {
                                const dayEvents = day ? events[day] || [] : []
                                const isToday = day === today && isCurrentMonth

                                return (
                                    <div
                                        key={dayIndex}
                                        className={`min-h-[60px] p-1 transition-colors ${dayIndex < 6 ? 'border-r border-gray-800' : ''
                                            } ${day === null
                                                ? 'bg-[#15151e]'
                                                : 'hover:bg-gray-800/30 cursor-pointer group'
                                            }`}
                                    >
                                        {day !== null && (
                                            <div className="flex flex-col h-full items-center">
                                                <span className={`text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1 ${isToday
                                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                                        : 'text-gray-400 group-hover:text-white'
                                                    }`}>
                                                    {day}
                                                </span>

                                                {/* Event Dots/Indicators */}
                                                <div className="flex gap-0.5 mt-auto">
                                                    {dayEvents.map((event) => (
                                                        <div
                                                            key={event.id}
                                                            className={`w-1 h-1 rounded-full ${eventColors[event.color].replace('/80', '')}`}
                                                            title={event.title}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Fill row if incomplete */}
                            {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => (
                                <div key={`empty-${i}`} className={`bg-[#15151e] ${i < 6 - week.length ? 'border-r border-gray-800' : ''}`} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
