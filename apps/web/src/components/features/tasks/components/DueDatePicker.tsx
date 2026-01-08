import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '../../../../lib/utils'

interface DueDatePickerProps {
    value?: string // ISO date string or YYYY-MM-DD
    onChange: (date: string | undefined) => void
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    className?: string
    showTime?: boolean
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
    showTime = false,
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

    // Time state
    const [hours, setHours] = useState(() => {
        if (value && showTime) {
            const d = new Date(value)
            return d.getHours()
        }
        return 12
    })
    const [minutes, setMinutes] = useState(() => {
        if (value && showTime) {
            const d = new Date(value)
            return d.getMinutes()
        }
        return 0
    })

    // Calculate dropdown position when opening
    const handleOpen = () => {
        if (disabled) return

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const dropdownHeight = showTime ? 440 : 380
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

    const updateDateTime = (day: number, h: number, m: number) => {
        const year = viewDate.getFullYear()
        const month = viewDate.getMonth()
        if (showTime) {
            const date = new Date(year, month, day, h, m)
            onChange(date.toISOString())
        } else {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            onChange(dateStr)
        }
    }

    const handleDateSelect = (day: number) => {
        updateDateTime(day, hours, minutes)
        if (!showTime) setIsOpen(false)
    }

    const handleTimeChange = (type: 'hours' | 'minutes', val: number) => {
        if (!selectedDate) return

        let newHours = hours
        let newMinutes = minutes

        if (type === 'hours') {
            newHours = val
            setHours(val)
        } else {
            newMinutes = val
            setMinutes(val)
        }

        updateDateTime(selectedDate.getDate(), newHours, newMinutes)
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

        const datePart = selectedDate.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })

        if (showTime && value?.includes('T')) {
            const timePart = selectedDate.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit'
            })
            return `${datePart}, ${timePart}`
        }

        return datePart
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
                    const dropdownHeight = showTime ? 440 : 380
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
    }, [isOpen, showTime])

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    'bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white',
                    selectedDate && 'text-white border border-white/10',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <Calendar className="w-4 h-4" />
                <span>{formatDisplayDate()}</span>
                {clearable && selectedDate && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation()
                            onChange(undefined)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                                onChange(undefined)
                            }
                        }}
                        className="p-0.5 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                    >
                        <X className="w-3 h-3" />
                    </span>
                )}
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className={cn(
                        "fixed bg-[#16161f] border border-gray-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] p-5 w-72 animate-in fade-in zoom-in duration-200 backdrop-blur-xl",
                        showTime && "w-80"
                    )}
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                    }}
                >
                    {/* Style for custom scrollbar in this component */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .time-scrollbar::-webkit-scrollbar {
                            width: 4px;
                        }
                        .time-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .time-scrollbar::-webkit-scrollbar-thumb {
                            background: #3f3f46;
                            border-radius: 10px;
                        }
                        .time-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: #52525b;
                        }
                    `}} />

                    {/* Quick Dates */}
                    <div className="flex gap-2 mb-6">
                        {quickDates.map(({ label, date }) => {
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                        if (showTime) {
                                            const newDate = new Date(date)
                                            newDate.setHours(hours, minutes)
                                            onChange(newDate.toISOString())
                                        } else {
                                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                                            onChange(dateStr)
                                        }
                                        setIsOpen(false)
                                    }}
                                    className="flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 rounded-lg transition-all"
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex gap-6">
                        <div className="flex-1">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-5">
                                <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-bold text-white">
                                    {MONTHS_PL[viewDate.getMonth()]} {viewDate.getFullYear()}
                                </span>
                                <button
                                    type="button"
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
                                        className="text-center text-[10px] font-bold text-gray-600 uppercase py-1"
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
                                                type="button"
                                                onClick={() => handleDateSelect(day)}
                                                className={cn(
                                                    'w-full h-full flex items-center justify-center text-xs font-semibold rounded-lg transition-all',
                                                    isSelected(day)
                                                        ? 'bg-[#F2CE88] text-black shadow-lg shadow-amber-500/20'
                                                        : isToday(day)
                                                            ? 'bg-gray-800/80 text-white ring-1 ring-amber-500/50'
                                                            : isPast(day)
                                                                ? 'text-gray-600 hover:bg-gray-800/30'
                                                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                )}
                                            >
                                                {day}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {showTime && (
                            <div className="w-[88px] border-l border-gray-800/50 pl-4 flex flex-col">
                                <span className="text-[10px] font-bold text-gray-500 uppercase mb-4 text-center tracking-widest">Czas</span>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto time-scrollbar pr-1 max-h-[220px]">
                                    {Array.from({ length: 24 }).map((_, h) => (
                                        <button
                                            key={h}
                                            onClick={() => handleTimeChange('hours', h)}
                                            className={cn(
                                                "text-[11px] py-1.5 rounded-md transition-all font-medium",
                                                hours === h ? "bg-[#F2CE88] text-black font-bold shadow-sm" : "text-gray-500 hover:bg-gray-800 hover:text-white"
                                            )}
                                        >
                                            {String(h).padStart(2, '0')}:00
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3 flex gap-1 pt-3 border-t border-gray-800/50">
                                    <button
                                        onClick={() => handleTimeChange('minutes', 0)}
                                        className={cn(
                                            "flex-1 text-[10px] py-1.5 rounded-md transition-all font-bold",
                                            minutes === 0 ? "bg-gray-700 text-white" : "text-gray-500 bg-gray-800/30 hover:text-white hover:bg-gray-800"
                                        )}
                                    >
                                        :00
                                    </button>
                                    <button
                                        onClick={() => handleTimeChange('minutes', 30)}
                                        className={cn(
                                            "flex-1 text-[10px] py-1.5 rounded-md transition-all font-bold",
                                            minutes === 30 ? "bg-gray-700 text-white" : "text-gray-500 bg-gray-800/30 hover:text-white hover:bg-gray-800"
                                        )}
                                    >
                                        :30
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {showTime && (
                        <div className="mt-6 pt-4 border-t border-gray-800/50 flex justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-6 py-2 bg-[#F2CE88] text-black text-xs font-bold rounded-full hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                            >
                                Gotowe
                            </button>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    )
}
