import { useState } from 'react'

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

// SVG Icons
const CalendarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <path d="M6 10C6 7.79086 7.79086 6 10 6H22C24.2091 6 26 7.79086 26 10V24C26 26.2091 24.2091 28 22 28H10C7.79086 28 6 26.2091 6 24V10Z" fill="#F2CE88" />
        <path d="M6 12H26" stroke="#7A664E" strokeWidth="3" />
        <path d="M11 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <path d="M21 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

const FilterIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 7C4 5.34315 5.34315 4 7 4H25C26.6569 4 28 5.34315 28 7V10L19 17V26L13 28V17L4 10V7Z" fill="#7A664E" />
            <rect x="8" y="8" width="16" height="4" rx="2" fill="#F2CE88" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 7C4 5.34315 5.34315 4 7 4H25C26.6569 4 28 5.34315 28 7V10L19 17V26L13 28V17L4 10V7Z" fill="#545454" />
            <rect x="8" y="8" width="16" height="4" rx="2" fill="#9E9E9E" />
        </svg>
    )
)

const SettingsIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M26.5 16C26.5 17.3 26.3 18.6 25.9 19.8L28.8 22.1L26 27L22.5 25.8C21.1 26.8 19.6 27.6 17.9 28L17.3 31.7H13.8L13.2 28C11.5 27.6 9.9 26.8 8.5 25.8L5.1 27L2.3 22.1L5.1 19.8C4.7 18.6 4.5 17.3 4.5 16C4.5 14.7 4.7 13.4 5.1 12.2L2.3 9.9L5.1 5L8.5 6.2C9.9 5.2 11.5 4.4 13.2 4L13.8 0.3H17.3L17.9 4C19.6 4.4 21.1 5.2 22.5 6.2L26 5L28.8 9.9L25.9 12.2C26.3 13.4 26.5 14.7 26.5 16Z" fill="#7A664E" />
            <circle cx="15.5" cy="16" r="5.5" fill="#F2CE88" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M26.5 16C26.5 17.3 26.3 18.6 25.9 19.8L28.8 22.1L26 27L22.5 25.8C21.1 26.8 19.6 27.6 17.9 28L17.3 31.7H13.8L13.2 28C11.5 27.6 9.9 26.8 8.5 25.8L5.1 27L2.3 22.1L5.1 19.8C4.7 18.6 4.5 17.3 4.5 16C4.5 14.7 4.7 13.4 5.1 12.2L2.3 9.9L5.1 5L8.5 6.2C9.9 5.2 11.5 4.4 13.2 4L13.8 0.3H17.3L17.9 4C19.6 4.4 21.1 5.2 22.5 6.2L26 5L28.8 9.9L25.9 12.2C26.3 13.4 26.5 14.7 26.5 16Z" fill="#545454" />
            <circle cx="15.5" cy="16" r="5.5" fill="#9E9E9E" />
        </svg>
    )
)

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

    // Generate calendar days with week structure
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

    // Get week number
    const getWeekNumber = (date: Date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        const pastDays = (date.getTime() - firstDayOfYear.getTime()) / 86400000
        return Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
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
                    <h3 className="font-semibold text-white">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            onClick={prevMonth}
                            className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-[#F2CE88] hover:bg-gray-800/50 transition-all"
                        >
                            ‹
                        </button>
                        <button
                            onClick={nextMonth}
                            className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-[#F2CE88] hover:bg-gray-800/50 transition-all"
                        >
                            ›
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onFilterClick}
                        onMouseEnter={() => setHoveredButton('filter')}
                        onMouseLeave={() => setHoveredButton(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-[#F2CE88] bg-gray-800/30 rounded-lg transition-colors"
                    >
                        <FilterIcon isHovered={hoveredButton === 'filter'} />
                        Filter
                    </button>
                    <button
                        onClick={onRescheduleClick}
                        onMouseEnter={() => setHoveredButton('schedule')}
                        onMouseLeave={() => setHoveredButton(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-[#F2CE88] bg-gray-800/30 rounded-lg transition-colors"
                    >
                        <SettingsIcon isHovered={hoveredButton === 'schedule'} />
                        Schedule setting
                    </button>
                    <button
                        onClick={onTodayClick}
                        className="px-4 py-1.5 rounded-lg bg-gray-800 text-xs text-white hover:bg-gray-700 transition-colors"
                    >
                        Today
                    </button>
                </div>
            </div>

            {/* Calendar Grid with borders */}
            <div className="rounded-lg overflow-hidden">
                {/* Day Names Header */}
                <div className="grid grid-cols-7 bg-gray-800/30">
                    <div className="w-8 border-r border-gray-800" /> {/* Week number column */}
                    {dayNames.map((day, idx) => (
                        <div
                            key={day}
                            className={`text-center text-xs text-gray-500 py-2 font-medium ${idx < 6 ? 'border-r border-gray-800' : ''}`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Weeks with borders */}
                {weeks.map((week, weekIndex) => {
                    const weekNumber = getWeekNumber(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1 + weekIndex * 7))
                    return (
                        <div key={weekIndex} className="grid grid-cols-7 border-t border-gray-800" style={{ gridTemplateColumns: '32px repeat(7, 1fr)' }}>
                            {/* Week number */}
                            <div className="flex items-start justify-center py-2 text-[10px] text-gray-600 border-r border-gray-800 bg-gray-800/20">
                                {weekNumber}
                            </div>

                            {/* Days */}
                            {week.map((day, dayIndex) => {
                                const dayEvents = day ? events[day] || [] : []
                                return (
                                    <div
                                        key={dayIndex}
                                        className={`min-h-[60px] p-1 ${dayIndex < 6 ? 'border-r border-gray-800' : ''} ${day === null ? 'bg-gray-900/20' : 'hover:bg-gray-800/30'} transition-colors`}
                                    >
                                        {day !== null && (
                                            <>
                                                {/* Day number */}
                                                <div className={`text-xs mb-1 ${day === today && isCurrentMonth
                                                    ? 'w-5 h-5 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center'
                                                    : 'text-gray-400 pl-1'
                                                    }`}>
                                                    {day}
                                                </div>

                                                {/* Events */}
                                                <div className="space-y-0.5">
                                                    {dayEvents.slice(0, 2).map((event) => (
                                                        <div
                                                            key={event.id}
                                                            className={`text-[8px] px-1 py-0.5 rounded truncate text-white ${eventColors[event.color]}`}
                                                            title={event.title}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && (
                                                        <div className="text-[8px] text-gray-500 pl-1">
                                                            +{dayEvents.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Fill remaining cells if week is incomplete */}
                            {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => (
                                <div key={`empty-${i}`} className={`min-h-[60px] bg-gray-900/20 ${i < 6 - week.length ? 'border-r border-gray-800' : ''}`} />
                            ))}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
