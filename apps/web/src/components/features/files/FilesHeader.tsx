import { useState, useRef, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, List, Plus } from "lucide-react"
import { createPortal } from 'react-dom'
import { format } from "date-fns"

interface FilesHeaderProps {
    // View Mode
    viewMode: 'grid' | 'list'
    onViewModeChange: (mode: 'grid' | 'list') => void
    // File Type Filter
    fileTypeFilter: string
    onFileTypeFilterChange: (value: string) => void
    // Date Range
    startDate: Date | null
    endDate: Date | null
    onDateRangeChange: (start: Date | null, end: Date | null) => void
    // Upload
    onUploadClick: () => void
}

const FILE_TYPES = [
    { value: 'all', label: 'All type' },
    { value: 'pdf', label: 'PDF' },
    { value: 'document', label: 'DOC' },
    { value: 'spreadsheet', label: 'XLS' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
]

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

export function FilesHeader({
    viewMode,
    onViewModeChange,
    fileTypeFilter,
    onFileTypeFilterChange,
    startDate,
    endDate,
    onDateRangeChange,
    onUploadClick,
}: FilesHeaderProps) {
    // Date Range Picker state
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
    const [viewDate, setViewDate] = useState(() => new Date())
    const dateButtonRef = useRef<HTMLButtonElement>(null)
    const dateDropdownRef = useRef<HTMLDivElement>(null)
    const [datePosition, setDatePosition] = useState({ top: 0, left: 0 })

    // Type Filter dropdown state
    const [isTypeOpen, setIsTypeOpen] = useState(false)
    const typeButtonRef = useRef<HTMLButtonElement>(null)
    const typeDropdownRef = useRef<HTMLDivElement>(null)
    const [typePosition, setTypePosition] = useState({ top: 0, left: 0 })

    const formatDate = (date: Date | null) => {
        if (!date) return '--.--.--'
        return format(date, 'dd.MM.yy')
    }

    // Date picker position
    useEffect(() => {
        if (isDatePickerOpen && dateButtonRef.current) {
            const rect = dateButtonRef.current.getBoundingClientRect()
            setDatePosition({ top: rect.bottom + 8, left: rect.left })
        }
    }, [isDatePickerOpen])

    // Type dropdown position
    useEffect(() => {
        if (isTypeOpen && typeButtonRef.current) {
            const rect = typeButtonRef.current.getBoundingClientRect()
            setTypePosition({ top: rect.bottom + 8, left: rect.left })
        }
    }, [isTypeOpen])

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (dateButtonRef.current && !dateButtonRef.current.contains(target) &&
                dateDropdownRef.current && !dateDropdownRef.current.contains(target)) {
                setIsDatePickerOpen(false)
            }
            if (typeButtonRef.current && !typeButtonRef.current.contains(target) &&
                typeDropdownRef.current && !typeDropdownRef.current.contains(target)) {
                setIsTypeOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Date picker helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay()
        return day === 0 ? 6 : day - 1
    }

    const generateCalendarDays = (monthOffset: number = 0) => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1)
        const year = date.getFullYear()
        const month = date.getMonth()
        const daysInMonth = getDaysInMonth(year, month)
        const firstDay = getFirstDayOfMonth(year, month)
        const days: (number | null)[] = []
        for (let i = 0; i < firstDay; i++) days.push(null)
        for (let i = 1; i <= daysInMonth; i++) days.push(i)
        return { days, year, month }
    }

    const handleSelectDate = (day: number, monthOffset: number) => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, day)
        if (!startDate || (startDate && endDate)) {
            onDateRangeChange(date, null)
        } else if (date < startDate) {
            onDateRangeChange(date, null)
        } else {
            onDateRangeChange(startDate, date)
        }
    }

    const isInRange = (day: number, monthOffset: number) => {
        if (!startDate || !endDate) return false
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, day)
        return date >= startDate && date <= endDate
    }

    const isRangeStart = (day: number, monthOffset: number) => {
        if (!startDate) return false
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, day)
        return date.toDateString() === startDate.toDateString()
    }

    const isRangeEnd = (day: number, monthOffset: number) => {
        if (!endDate) return false
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, day)
        return date.toDateString() === endDate.toDateString()
    }

    const isToday = (day: number, monthOffset: number) => {
        const today = new Date()
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, day)
        return date.toDateString() === today.toDateString()
    }

    const renderMonth = (monthOffset: number) => {
        const { days, year, month } = generateCalendarDays(monthOffset)
        return (
            <div className="flex-1">
                <div className="text-center text-sm font-medium text-white mb-4">
                    {MONTHS[month]} {year}
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS.map(day => (
                        <div key={day} className="text-center text-[10px] font-medium text-gray-600 py-1">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => (
                        <div key={index} className="aspect-square">
                            {day && (
                                <button
                                    type="button"
                                    onClick={() => handleSelectDate(day, monthOffset)}
                                    className={`w-full h-full flex items-center justify-center text-xs font-medium rounded-lg transition-all
                                        ${isRangeStart(day, monthOffset) || isRangeEnd(day, monthOffset)
                                            ? 'bg-[#F2CE88] text-[#0a0a0f]'
                                            : isInRange(day, monthOffset)
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : isToday(day, monthOffset)
                                                    ? 'bg-gray-800 text-white ring-1 ring-amber-500/50'
                                                    : 'text-gray-500 hover:bg-gray-800 hover:text-white'
                                        }`}
                                >
                                    {day}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const selectedTypeLabel = FILE_TYPES.find(t => t.value === fileTypeFilter)?.label || 'All type'

    return (
        <div className="flex items-center justify-between px-6 py-4">
            {/* Left side: Date picker and type filter */}
            <div className="flex items-center gap-3">
                {/* Date Range Picker */}
                <button
                    ref={dateButtonRef}
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="flex items-center gap-2 px-4 h-8 rounded-full text-xs font-medium bg-[#1a1a24] text-gray-400 hover:text-white transition-colors"
                >
                    <Calendar size={14} />
                    <span>{formatDate(startDate)} / {formatDate(endDate)}</span>
                </button>

                {/* Type Filter */}
                <button
                    ref={typeButtonRef}
                    onClick={() => setIsTypeOpen(!isTypeOpen)}
                    className="flex items-center gap-2 px-4 h-8 rounded-full text-xs font-medium bg-[#1a1a24] text-gray-400 hover:text-white transition-colors"
                >
                    <span>{selectedTypeLabel}</span>
                    <ChevronDown size={14} />
                </button>
            </div>

            {/* Right side: View switcher and Upload */}
            <div className="flex items-center gap-3">
                {/* View Switcher */}
                <div className="flex bg-[#1a1a24] p-1 rounded-full">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'grid'
                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <LayoutGrid size={14} />
                        Grid
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'list'
                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        <List size={14} />
                        List
                    </button>
                </div>

                {/* Upload Button */}
                <button
                    onClick={onUploadClick}
                    className="flex items-center gap-2 px-4 h-8 rounded-full text-xs font-medium bg-[#1a1a24] text-gray-400 hover:text-white transition-colors"
                >
                    <Plus size={14} />
                    <span>Drag and drop or Browse upload</span>
                </button>
            </div>

            {/* Date Picker Dropdown */}
            {isDatePickerOpen && createPortal(
                <div
                    ref={dateDropdownRef}
                    className="fixed bg-[#16161f] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] p-5 animate-in fade-in zoom-in duration-200"
                    style={{ top: `${datePosition.top}px`, left: `${datePosition.left}px` }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-white">Select date range</span>
                        <button
                            type="button"
                            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="flex gap-6">
                        {renderMonth(0)}
                        {renderMonth(1)}
                    </div>
                    <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-800">
                        <button onClick={() => onDateRangeChange(null, null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Clear</button>
                        <button onClick={() => setIsDatePickerOpen(false)} className="px-5 py-2 bg-[#F2CE88] text-[#0a0a0f] text-sm font-bold rounded-full hover:bg-amber-400 transition-all">Apply</button>
                    </div>
                </div>,
                document.body
            )}

            {/* Type Filter Dropdown */}
            {isTypeOpen && createPortal(
                <div
                    ref={typeDropdownRef}
                    className="fixed bg-[#16161f] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] py-2 min-w-32 animate-in fade-in zoom-in duration-200"
                    style={{ top: `${typePosition.top}px`, left: `${typePosition.left}px` }}
                >
                    {FILE_TYPES.map(type => (
                        <button
                            key={type.value}
                            onClick={() => { onFileTypeFilterChange(type.value); setIsTypeOpen(false) }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors ${fileTypeFilter === type.value
                                ? 'text-[#F2CE88] bg-amber-500/10'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    )
}
