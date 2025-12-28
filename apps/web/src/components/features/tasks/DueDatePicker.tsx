import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface DueDatePickerProps {
    value?: string // ISO date string (YYYY-MM-DD)
    onChange: (date: string | undefined) => void
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    className?: string
}

const DAYS_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const MONTHS_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

export function DueDatePicker({
    value,
    onChange,
    placeholder = 'Wybierz termin',
    disabled = false,
    clearable = true,
    className,
}: DueDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(() => {
        if (value) return new Date(value)
        return new Date()
    })
    const ref = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [position, setPosition] = useState({ top: 0, left: 0, openUp: false })

    const selectedDate = value ? new Date(value) : null

    // Calculate dropdown position when opening
    const handleOpen = () => {
        if (disabled) return

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const dropdownHeight = 380
            const spaceBelow = window.innerHeight - rect.bottom
            const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight

            setPosition({
                top: openUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                left: Math.min(rect.left, window.innerWidth - 290),
                openUp
            })
        }

        setIsOpen(!isOpen)
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                ref.current && !ref.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay()
        return day === 0 ? 6 : day - 1 // Convert to Monday-first
    }

    const generateCalendarDays = () => {
        const year = viewDate.getFullYear()
        const month = viewDate.getMonth()
        const daysInMonth = getDaysInMonth(year, month)
        const firstDay = getFirstDayOfMonth(year, month)
        const days: (number | null)[] = []

        // Add empty slots for days before the first day
        for (let i = 0; i < firstDay; i++) {
            days.push(null)
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i)
        }

        return days
    }

    const handleDateSelect = (day: number) => {
        const year = viewDate.getFullYear()
        const month = viewDate.getMonth()
        const date = new Date(year, month, day)
        onChange(date.toISOString().split('T')[0])
        setIsOpen(false)
    }

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
    }

    const isToday = (day: number) => {
        const today = new Date()
        return (
            day === today.getDate() &&
            viewDate.getMonth() === today.getMonth() &&
            viewDate.getFullYear() === today.getFullYear()
        )
    }

    const isSelected = (day: number) => {
        if (!selectedDate) return false
        return (
            day === selectedDate.getDate() &&
            viewDate.getMonth() === selectedDate.getMonth() &&
            viewDate.getFullYear() === selectedDate.getFullYear()
        )
    }

    const isPast = (day: number) => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today
    }

    const formatDisplayDate = () => {
        if (!selectedDate) return placeholder
        return selectedDate.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    const quickDates = [
        { label: 'Dzisiaj', date: new Date() },
        { label: 'Jutro', date: new Date(Date.now() + 86400000) },
        { label: 'Za tydzień', date: new Date(Date.now() + 7 * 86400000) },
    ]

    // Handle window resize/scroll to close or reposition
    useEffect(() => {
        if (isOpen) {
            const handleScroll = () => {
                if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect()
                    const dropdownHeight = 380
                    const spaceBelow = window.innerHeight - rect.bottom
                    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight
                    setPosition(prev => ({
                        ...prev,
                        top: openUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                        left: Math.min(rect.left, window.innerWidth - 290)
                    }))
                }
            }
            window.addEventListener('scroll', handleScroll, true)
            window.addEventListener('resize', handleScroll)
            return () => {
                window.removeEventListener('scroll', handleScroll, true)
                window.removeEventListener('resize', handleScroll)
            }
        }
    }, [isOpen])

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                ref={buttonRef}
                onClick={handleOpen}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    'bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white',
                    selectedDate && 'text-white',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <Calendar className="w-4 h-4" />
                <span>{formatDisplayDate()}</span>
                {clearable && selectedDate && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onChange(undefined)
                        }}
                        className="p-0.5 hover:bg-gray-700 rounded transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed bg-[#1a1a24] border border-gray-800 rounded-2xl shadow-2xl z-[9999] p-4 w-72 animate-in fade-in duration-200"
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                    }}
                >
                    {/* Quick Dates */}
                    <div className="flex gap-2 mb-4">
                        {quickDates.map(({ label, date }) => (
                            <button
                                key={label}
                                onClick={() => {
                                    onChange(date.toISOString().split('T')[0])
                                    setIsOpen(false)
                                }}
                                className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-semibold text-white">
                            {MONTHS_PL[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS_PL.map(day => (
                            <div
                                key={day}
                                className="text-center text-[10px] font-bold text-gray-500 uppercase py-1"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {generateCalendarDays().map((day, index) => (
                            <div key={index} className="aspect-square">
                                {day && (
                                    <button
                                        onClick={() => handleDateSelect(day)}
                                        className={cn(
                                            'w-full h-full flex items-center justify-center text-xs font-medium rounded-lg transition-all',
                                            isSelected(day)
                                                ? 'bg-[#F2CE88] text-black'
                                                : isToday(day)
                                                    ? 'bg-gray-800 text-white ring-1 ring-[#F2CE88]/50'
                                                    : isPast(day)
                                                        ? 'text-gray-600 hover:bg-gray-800/50'
                                                        : 'text-gray-300 hover:bg-gray-800'
                                        )}
                                    >
                                        {day}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
