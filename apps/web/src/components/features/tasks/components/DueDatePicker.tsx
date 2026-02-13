import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
    triggerClassName?: string
    showTime?: boolean
}



export function DueDatePicker({
    value,
    onChange,
    placeholder = 'Select date',
    disabled = false,
    clearable = true,
    className,
    triggerClassName,
    showTime = false,
}: DueDatePickerProps) {
    const { t, i18n } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(() => {
        if (value) return new Date(value)
        return new Date()
    })
    const ref = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [position, setPosition] = useState({ top: 0, left: 0, openUp: false })

    // Generate localized days and months
    const { days, months } = useMemo(() => {
        const d = []
        const m = []
        const lang = i18n.language || 'en'

        // Days (Monday based)
        for (let i = 0; i < 7; i++) {
            // 2024-01-01 is Monday
            d.push(new Date(2024, 0, 1 + i).toLocaleDateString(lang, { weekday: 'short' }))
        }

        // Months
        for (let i = 0; i < 12; i++) {
            m.push(new Date(2024, i, 1).toLocaleDateString(lang, { month: 'long' }))
        }

        return { days: d, months: m }
    }, [i18n.language])

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

    // Sync time state with value when it changes
    useEffect(() => {
        if (value && showTime) {
            const d = new Date(value)
            setHours(d.getHours())
            setMinutes(d.getMinutes())
        }
    }, [value, showTime])

    // Calculate dropdown position when opening
    const handleOpen = () => {
        if (disabled) return

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const dropdownHeight = showTime ? 440 : 380
            const spaceBelow = window.innerHeight - rect.bottom
            const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight

            // Determine width (w-80 = 320px, w-72 = 288px)
            const width = showTime ? 320 : 288

            // Calculate left position ensuring it doesn't overflow right edge
            // Leave a 16px margin from the right edge
            const left = Math.min(rect.left, window.innerWidth - width - 16)

            setPosition({
                top: openUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                left: left,
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

            const handleScroll = (e: Event) => {
                // Ignore scroll events originating from inside the dropdown (e.g. time list)
                if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
                    return
                }

                if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect()
                    const dropdownHeight = showTime ? 400 : 380
                    const spaceBelow = window.innerHeight - rect.bottom
                    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight

                    // Determine width (w-80 = 320px, w-72 = 288px)
                    const width = showTime ? 320 : 288

                    // Calculate left position ensuring it doesn't overflow right edge
                    // Leave a 16px margin from the right edge
                    const left = Math.min(rect.left, window.innerWidth - width - 16)

                    setPosition(prev => ({
                        ...prev,
                        top: openUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                        left: left,
                        openUp
                    }))
                }
            }

            window.addEventListener('scroll', handleScroll, true)
            window.addEventListener('resize', handleScroll)

            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
                window.removeEventListener('scroll', handleScroll, true)
                window.removeEventListener('resize', handleScroll)
            }
        }
    }, [isOpen, showTime])

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

        const days: { day: number; type: 'prev' | 'current' | 'next' }[] = []

        // Previous month days
        const prevMonthDays = getDaysInMonth(year, month - 1)
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, type: 'prev' })
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, type: 'current' })
        }

        // Next month days to fill the last row (optional, but looks better)
        const remaining = 42 - days.length // Show 6 full weeks
        if (remaining > 0) {
            for (let i = 1; i <= remaining; i++) {
                days.push({ day: i, type: 'next' })
            }
        }

        return days
    }

    const updateDateTime = (day: number, h: number, m: number, monthOffset = 0) => {
        const year = viewDate.getFullYear()
        const month = viewDate.getMonth() + monthOffset
        if (showTime) {
            const date = new Date(year, month, day, h, m)
            onChange(date.toISOString())
        } else {
            // Re-calculate date to handle month overflow correctly
            const date = new Date(year, month, day)
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            onChange(dateStr)
        }
    }

    const handleDateSelect = (dayObj: { day: number; type: 'prev' | 'current' | 'next' }) => {
        let monthOffset = 0
        if (dayObj.type === 'prev') monthOffset = -1
        if (dayObj.type === 'next') monthOffset = 1

        updateDateTime(dayObj.day, hours, minutes, monthOffset)

        // Correct view if clicking prev/next month
        if (dayObj.type !== 'current') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1))
        }

        if (!showTime) setIsOpen(false)
    }

    const handleTimeChange = (type: 'hours' | 'minutes', val: number) => {
        let baseDate = selectedDate
        if (!baseDate) {
            baseDate = new Date()
        }

        let newHours = hours
        let newMinutes = minutes

        if (type === 'hours') {
            newHours = val
            setHours(val)
        } else {
            newMinutes = val
            setMinutes(val)
        }

        const d = new Date(baseDate)
        d.setHours(newHours)
        d.setMinutes(newMinutes)
        onChange(d.toISOString())
    }

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
    }

    const isToday = (day: number, type: string) => {
        if (type !== 'current') return false
        const today = new Date()
        return (
            day === today.getDate() &&
            viewDate.getMonth() === today.getMonth() &&
            viewDate.getFullYear() === today.getFullYear()
        )
    }

    const isSelected = (day: number, type: string) => {
        if (!selectedDate) return false

        // Calculate the actual date of this cell
        const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
        if (type === 'prev') cellDate.setMonth(cellDate.getMonth() - 1)
        if (type === 'next') cellDate.setMonth(cellDate.getMonth() + 1)

        return (
            cellDate.getDate() === selectedDate.getDate() &&
            cellDate.getMonth() === selectedDate.getMonth() &&
            cellDate.getFullYear() === selectedDate.getFullYear()
        )
    }

    const formatDisplayDate = () => {
        if (!selectedDate) return placeholder

        const datePart = selectedDate.toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })

        if (showTime && value?.includes('T')) {
            const timePart = selectedDate.toLocaleTimeString(i18n.language, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
            return `${datePart}, ${timePart}`
        }

        return datePart
    }

    const quickDates = [
        { label: t('tasks.datepicker.today', 'Today'), date: new Date() },
        { label: t('tasks.datepicker.tomorrow', 'Tomorrow'), date: new Date(Date.now() + 86400000) },
        { label: t('tasks.datepicker.next_week', 'Next Week'), date: new Date(Date.now() + 7 * 86400000) },
    ]



    return (
        <div ref={ref} className={cn('relative', className)}>
            {/* Trigger Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={handleOpen}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full justify-start',
                    !triggerClassName && 'bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white',
                    !triggerClassName && selectedDate && 'text-white',
                    disabled && 'opacity-50 cursor-not-allowed',
                    triggerClassName
                )}
            >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate text-left">{formatDisplayDate()}</span>
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
                        className="ml-auto p-0.5 hover:bg-gray-700/50 rounded transition-colors cursor-pointer"
                    >
                        <X className="w-3 h-3" />
                    </span>
                )}
            </button>

            {isOpen && (
                createPortal(
                    <div
                        ref={dropdownRef}
                        className={cn(
                            "fixed bg-[#16161f] border-none rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] p-5 w-72 animate-in fade-in zoom-in duration-200 backdrop-blur-xl flex flex-col",
                            showTime && "w-80"
                        )}
                        style={{
                            top: position.top,
                            left: position.left,
                            transformOrigin: position.openUp ? 'bottom left' : 'top left'
                        }}
                    >
                        <div className="flex gap-4 flex-1">
                            <div className={cn("flex-1 flex flex-col", showTime && "w-52")}>
                                {/* Quick Selects */}
                                <div className="flex gap-1 mb-4 p-1 rounded-xl">
                                    {quickDates.map(({ label, date }) => (
                                        <button
                                            key={label}
                                            onClick={() => {
                                                onChange(date.toISOString())
                                                setViewDate(date)
                                                setHours(date.getHours())
                                                setMinutes(date.getMinutes())
                                                if (!showTime) setIsOpen(false)
                                            }}
                                            className="flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-800 rounded-lg transition-all"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Header */}
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="font-semibold text-gray-100 capitalize">
                                        {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                                    </span>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {days.map((day) => (
                                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1 capitalize">
                                            {day}
                                        </div>
                                    ))}
                                    {generateCalendarDays().map((dayObj, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleDateSelect(dayObj)}
                                            className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all relative group",
                                                dayObj.type !== 'current' && "text-gray-600 hover:text-gray-400",
                                                // Normal state
                                                dayObj.type === 'current' && !isSelected(dayObj.day, dayObj.type) && !isToday(dayObj.day, dayObj.type) && "text-gray-300 hover:bg-gray-800 hover:text-white",
                                                // Today state (solid circle with different color, or just text color + dot)
                                                // User requested "different style". Let's try text highlight + small dot
                                                isToday(dayObj.day, dayObj.type) && !isSelected(dayObj.day, dayObj.type) && "text-amber-500 font-bold",
                                                // Selected state
                                                isSelected(dayObj.day, dayObj.type) && "bg-amber-500 text-white shadow-lg shadow-amber-500/25 scale-110 font-medium z-10",
                                            )}
                                        >
                                            {dayObj.day}
                                            {isToday(dayObj.day, dayObj.type) && !isSelected(dayObj.day, dayObj.type) && (
                                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Column */}
                            {showTime && (
                                <div className="w-[88px] border-none pl-4 flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-4 text-center tracking-widest">{t('tasks.datepicker.time', 'Time')}</span>

                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto time-scrollbar pr-3 max-h-[300px]">
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
                                    <div className="mt-3 flex gap-1 pt-3 border-none pr-2">
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

                        {/* Full Width Done Button */}
                        <div className="mt-4 pt-4 border-t border-gray-800/50 w-full">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full py-2.5 bg-[#F2CE88] hover:bg-[#d6b677] text-gray-900 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#F2CE88]/20 active:scale-95"
                            >
                                {t('tasks.datepicker.done', 'Done')}
                            </button>
                        </div>
                    </div>,
                    document.body
                )
            )}
        </div>
    )
}
