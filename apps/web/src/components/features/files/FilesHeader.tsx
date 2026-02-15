import { useState, useRef, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, LayoutGrid, List, Plus } from "lucide-react"
import { createPortal } from 'react-dom'
import { format } from "date-fns"
import { pl, enUS } from 'date-fns/locale'
import { useTranslation } from "react-i18next"

interface FilesHeaderProps {
    // View Mode
    viewMode: 'grid' | 'list'
    onViewModeChange: (mode: 'grid' | 'list') => void
    // File Type Filter
    fileTypeFilter: string
    onFileTypeFilterChange: (value: string) => void
    // Date Range
    // Date Range
    startDate: Date | null
    endDate: Date | null
    onDateRangeChange: (start: Date | null, end: Date | null) => void
    // Upload
    onUploadClick: () => void
    // Sort
    sortBy: 'name' | 'size' | 'date' | 'type'
    sortOrder: 'asc' | 'desc'
    onSortChange: (field: 'name' | 'size' | 'date' | 'type') => void
}

const FILE_TYPES = [
    { value: 'all', labelKey: 'files.types.all' },
    { value: 'pdf', labelKey: 'files.types.pdf' },
    { value: 'document', labelKey: 'files.types.document' },
    { value: 'spreadsheet', labelKey: 'files.types.spreadsheet' },
    { value: 'image', labelKey: 'files.types.image' },
    { value: 'video', labelKey: 'files.types.video' },
]

const SORT_OPTIONS = [
    { value: 'date', labelKey: 'files.sort.date' },
    { value: 'name', labelKey: 'files.sort.name' },
    { value: 'size', labelKey: 'files.sort.size' },
    { value: 'type', labelKey: 'files.sort.type' },
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
    sortBy,
    sortOrder,
    onSortChange,
}: FilesHeaderProps) {
    const { t, i18n } = useTranslation()
    const currentLocale = i18n.language === 'pl' ? pl : enUS

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

    // Sort dropdown state
    const [isSortOpen, setIsSortOpen] = useState(false)
    const sortButtonRef = useRef<HTMLButtonElement>(null)
    const sortDropdownRef = useRef<HTMLDivElement>(null)
    const [sortPosition, setSortPosition] = useState({ top: 0, left: 0 })

    const formatDate = (date: Date | null) => {
        if (!date) return '--.--.--'
        return format(date, 'dd.MM.yy', { locale: currentLocale })
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

    // Sort dropdown position
    useEffect(() => {
        if (isSortOpen && sortButtonRef.current) {
            const rect = sortButtonRef.current.getBoundingClientRect()
            setSortPosition({ top: rect.bottom + 8, left: rect.left })
        }
    }, [isSortOpen])

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
            if (sortButtonRef.current && !sortButtonRef.current.contains(target) &&
                sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
                setIsSortOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Date picker helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay()
        // Adjust for start of week (Monday = 1, Sunday = 0 for getDay())
        // If Monday is start: 0(Sun)->6, 1(Mon)->0
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

    // Generate localized day names (Mo, Tu, ...)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        // Start from Monday (arbitrary date known to be Monday, e.g. 2024-01-01)
        const d = new Date(2024, 0, i + 1)
        return format(d, 'EEEEEE', { locale: currentLocale })
    })

    const renderMonth = (monthOffset: number) => {
        const { days, year, month } = generateCalendarDays(monthOffset)
        const monthName = format(new Date(year, month), 'MMMM', { locale: currentLocale })

        return (
            <div className="flex-1">
                <div className="text-center text-sm font-medium text-white mb-4 capitalize">
                    {monthName} {year}
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[10px] font-medium text-gray-600 py-1 capitalize">{day}</div>
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

    const selectedType = FILE_TYPES.find(t => t.value === fileTypeFilter)
    const selectedTypeLabel = selectedType ? t(selectedType.labelKey) : t('files.types.all')

    const selectedSort = SORT_OPTIONS.find(s => s.value === sortBy)
    const selectedSortLabel = selectedSort ? t(selectedSort.labelKey) : t('files.sort.date')

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
                    <span className="capitalize">{selectedTypeLabel}</span>
                    <ChevronDown size={14} />
                </button>

                {/* Sort Dropdown */}
                <button
                    ref={sortButtonRef}
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center gap-2 px-4 h-8 rounded-full text-xs font-medium bg-[#1a1a24] text-gray-400 hover:text-white transition-colors"
                >
                    <span>{t('files.header.sort_by', { value: selectedSortLabel })}</span>
                    <ChevronDown size={14} className={`transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
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
                        title={t('files.header.view_grid')}
                    >
                        <LayoutGrid size={14} />
                        <span className="hidden sm:inline">{t('files.header.view_grid').split(' ')[0]}</span>
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'list'
                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                            : 'text-gray-500 hover:text-white'
                            }`}
                        title={t('files.header.view_list')}
                    >
                        <List size={14} />
                        <span className="hidden sm:inline">{t('files.header.view_list').split(' ')[0]}</span>
                    </button>
                </div>

                {/* Upload Button */}
                <button
                    onClick={onUploadClick}
                    className="flex items-center gap-2 px-4 h-8 rounded-full text-xs font-medium bg-[#1a1a24] text-gray-400 hover:text-white transition-colors"
                >
                    <Plus size={14} />
                    <span>{t('files.header.upload')}</span>
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
                        <span className="text-sm font-bold text-white">{t('files.header.select_date')}</span>
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
                        <button onClick={() => onDateRangeChange(null, null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">{t('common.cancel')}</button>
                        <button onClick={() => setIsDatePickerOpen(false)} className="px-5 py-2 bg-[#F2CE88] text-[#0a0a0f] text-sm font-bold rounded-full hover:bg-amber-400 transition-all">{t('common.save')}</button>
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
                            {t(type.labelKey)}
                        </button>
                    ))}
                </div>,
                document.body
            )}

            {/* Sort Dropdown */}
            {isSortOpen && createPortal(
                <div
                    ref={sortDropdownRef}
                    className="fixed bg-[#16161f] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] py-2 min-w-32 animate-in fade-in zoom-in duration-200"
                    style={{ top: `${sortPosition.top}px`, left: `${sortPosition.left}px` }}
                >
                    {SORT_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onSortChange(option.value as any)
                                setIsSortOpen(false)
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between group ${sortBy === option.value
                                ? 'text-[#F2CE88] bg-amber-500/10'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <span>{t(option.labelKey)}</span>
                            {sortBy === option.value && (
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                                />
                            )}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    )
}
