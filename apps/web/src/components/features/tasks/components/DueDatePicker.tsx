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
        openUp,
      })
    }

    setIsOpen(!isOpen)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        ref.current &&
        !ref.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
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

          setPosition((prev) => ({
            ...prev,
            top: openUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
            left: left,
            openUp,
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
        hour12: false,
      })
      return `${datePart}, ${timePart}`
    }

    return datePart
  }

  const quickDates = [
    { label: t('tasks.datepicker.today', 'Today'), date: new Date() },
    { label: t('tasks.datepicker.tomorrow', 'Tomorrow'), date: new Date(Date.now() + 86400000) },
    {
      label: t('tasks.datepicker.next_week', 'Next Week'),
      date: new Date(Date.now() + 7 * 86400000),
    },
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
          'flex w-full items-center justify-start gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          !triggerClassName &&
            'h-10 border border-[var(--app-border)] bg-[var(--app-bg-input)] text-[var(--app-text-muted)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]',
          !triggerClassName && selectedDate && 'text-[var(--app-text-primary)]',
          disabled && 'cursor-not-allowed opacity-50',
          triggerClassName
        )}
      >
        <Calendar className="h-4 w-4 shrink-0" />
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
            className="ml-auto cursor-pointer rounded p-0.5 transition-colors hover:bg-[var(--app-divider)]"
          >
            <X className="h-3 w-3 text-[var(--app-text-muted)]" />
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              'animate-in fade-in zoom-in fixed z-[9999] flex w-72 flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-5 shadow-[var(--app-shadow-card)] backdrop-blur-xl duration-200',
              showTime && 'w-80'
            )}
            style={{
              top: position.top,
              left: position.left,
              transformOrigin: position.openUp ? 'bottom left' : 'top left',
            }}
          >
            <div className="flex flex-1 gap-4">
              <div className={cn('flex flex-1 flex-col', showTime && 'w-52')}>
                {/* Quick Selects */}
                <div className="mb-4 flex gap-1 rounded-xl p-1">
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
                      className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-input)] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] transition-all hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Header */}
                <div className="mb-4 flex items-center justify-between px-1">
                  <button
                    onClick={handlePrevMonth}
                    className="rounded-lg p-1 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-semibold capitalize text-[var(--app-text-primary)]">
                    {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="rounded-lg p-1 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {days.map((day) => (
                    <div
                      key={day}
                      className="py-1 text-center text-xs font-medium capitalize text-[var(--app-text-muted)]"
                    >
                      {day}
                    </div>
                  ))}
                  {generateCalendarDays().map((dayObj, index) => (
                    <button
                      key={index}
                      onClick={() => handleDateSelect(dayObj)}
                      className={cn(
                        'group relative flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all',
                        dayObj.type !== 'current' &&
                          'text-[var(--app-text-muted)] opacity-50 hover:opacity-100',
                        // Normal state
                        dayObj.type === 'current' &&
                          !isSelected(dayObj.day, dayObj.type) &&
                          !isToday(dayObj.day, dayObj.type) &&
                          'text-[var(--app-text-primary)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]',
                        // Today state (solid circle with different color, or just text color + dot)
                        isToday(dayObj.day, dayObj.type) &&
                          !isSelected(dayObj.day, dayObj.type) &&
                          'font-bold text-amber-500',
                        // Selected state
                        isSelected(dayObj.day, dayObj.type) &&
                          'z-10 scale-110 bg-amber-500 font-medium text-white shadow-lg shadow-amber-500/25'
                      )}
                    >
                      {dayObj.day}
                      {isToday(dayObj.day, dayObj.type) && !isSelected(dayObj.day, dayObj.type) && (
                        <div className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Column */}
              {showTime && (
                <div className="flex w-[88px] flex-col border-none pl-4">
                  <span className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-muted)]">
                    {t('tasks.datepicker.time', 'Time')}
                  </span>

                  <div className="time-scrollbar flex max-h-[300px] flex-1 flex-col gap-1 overflow-y-auto pr-3">
                    {Array.from({ length: 24 }).map((_, h) => (
                      <button
                        key={h}
                        onClick={() => handleTimeChange('hours', h)}
                        className={cn(
                          'rounded-md py-1.5 text-[11px] font-medium transition-all',
                          hours === h
                            ? 'bg-amber-400 font-bold text-black shadow-sm'
                            : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]'
                        )}
                      >
                        {String(h).padStart(2, '0')}:00
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-1 border-none pr-2 pt-3">
                    <button
                      onClick={() => handleTimeChange('minutes', 0)}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-[10px] font-bold transition-all',
                        minutes === 0
                          ? 'bg-[var(--app-text-primary)] text-[var(--app-bg-card)]'
                          : 'bg-[var(--app-bg-sidebar)]/30 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]'
                      )}
                    >
                      :00
                    </button>
                    <button
                      onClick={() => handleTimeChange('minutes', 30)}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-[10px] font-bold transition-all',
                        minutes === 30
                          ? 'bg-[var(--app-text-primary)] text-[var(--app-bg-card)]'
                          : 'bg-[var(--app-bg-sidebar)]/30 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-primary)]'
                      )}
                    >
                      :30
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Full Width Done Button */}
            <div className="mt-4 w-full border-t border-[var(--app-border)] pt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-500 active:scale-95"
              >
                {t('tasks.datepicker.done', 'Done')}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
