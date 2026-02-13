import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FilterIcon, SearchIconDefault, SearchIconActive } from '@/components/dashboard/icons'
import {
    FlagIcon,
    UserIcon,
    CalendarSmallIcon,
    FireIcon,
    ClockIcon,
    SortIconGold,
    SortIconGrey
} from '../components/TaskIcons'
import { SavedFilters } from '../filters/SavedFilters'


interface KanbanBoardHeaderProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    onNewTask: () => void
    // Sort callbacks
    onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
    // Filter callbacks
    onFilterChange?: (filters: FilterState) => void
    currentFilters?: FilterState
    workspaceSlug?: string
    userId?: string
    members?: { id: string; name: string; avatar?: string }[]
    availableLabels?: { id: string; name: string; color: string }[]
    availableStatuses?: { value: string; label: string }[]
}

export interface FilterState {
    assignedToMe: boolean
    overdue: boolean
    priorities: string[]
    statuses: string[]
    labels: string[]
    assigneeIds: string[]
    dueDateRange: 'all' | 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'no_date'
}

// Sort By Dropdown
function SortByDropdown({
    onClose,
    onSort
}: {
    onClose: () => void
    onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
}) {
    const { t } = useTranslation()
    const [sortBy, setSortBy] = useState<string | null>(null)
    const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const handleSortSelect = (option: string) => {
        setSortBy(option)
        onSort?.(option, direction)
    }

    const toggleDirection = () => {
        const newDirection = direction === 'asc' ? 'desc' : 'asc'
        setDirection(newDirection)
        if (sortBy) onSort?.(sortBy, newDirection)
    }

    const sortOptions = [
        { value: 'priority', label: t('board.sort.options.priority'), icon: <FlagIcon /> },
        { value: 'dueDate', label: t('board.sort.options.due_date'), icon: <CalendarSmallIcon /> },
        { value: 'createdAt', label: t('board.sort.options.created_at'), icon: <CalendarSmallIcon /> },
        { value: 'updatedAt', label: t('board.sort.options.updated_at'), icon: <ClockIcon /> },
    ]

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-12 z-30 w-56 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden"
        >
            {/* Core Sort Options */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('board.sort.title')}</div>
                {sortOptions.map(option => (
                    <button
                        key={option.value}
                        onClick={() => handleSortSelect(option.value)}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${sortBy === option.value
                            ? 'bg-amber-500/10 text-[#F2CE88]'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                    >
                        {option.icon}
                        {option.label}
                        {sortBy === option.value && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-auto">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>

            <div className="border-t border-gray-800" />

            {/* Direction Toggle */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('board.sort.direction')}</div>
                <button
                    onClick={toggleDirection}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    {direction === 'asc' ? (
                        <>
                            {/* Arrow Up - Grey */}
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                <path d="M16 26L16 6" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
                                <path d="M8 14L16 6L24 14" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('board.sort.asc')}
                        </>
                    ) : (
                        <>
                            {/* Arrow Down - Grey */}
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                <path d="M16 6L16 26" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
                                <path d="M8 18L16 26L24 18" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('board.sort.desc')}
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

// Filters Dropdown
function FiltersDropdown({
    onClose,
    onFilterChange,
    members = [],
    availableLabels = [],
    availableStatuses = []
}: {
    onClose: () => void
    onFilterChange?: (filters: FilterState) => void
    members?: { id: string; name: string; avatar?: string }[]
    availableLabels?: { id: string; name: string; color: string }[]
    availableStatuses?: { value: string; label: string }[]
}) {
    const { t } = useTranslation()
    const [filters, setFilters] = useState<FilterState>({
        assignedToMe: false,
        overdue: false,
        priorities: [],
        statuses: [],
        labels: [],
        assigneeIds: [],
        dueDateRange: 'all'
    })
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const toggleFilter = (key: keyof FilterState, value?: string) => {
        let newFilters: FilterState

        if (key === 'assignedToMe' || key === 'overdue') {
            newFilters = { ...filters, [key]: !filters[key] }
        } else if (value) {
            // Handle single-select for dueDateRange
            if (key === 'dueDateRange') {
                const rangeValue = (filters.dueDateRange === value ? 'all' : value) as FilterState['dueDateRange']
                newFilters = { ...filters, [key]: rangeValue }
            } else {
                // Handle multi-select arrays
                const array = filters[key] as string[]
                const newArray = array.includes(value)
                    ? array.filter(v => v !== value)
                    : [...array, value]
                newFilters = { ...filters, [key]: newArray }
            }
        } else {
            return
        }

        setFilters(newFilters)
        onFilterChange?.(newFilters)
    }

    const Checkbox = ({ checked }: { checked: boolean }) => (
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-amber-500 border-amber-500' : 'border-gray-600'
            }`}>
            {checked && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
        </div>
    )

    const priorities = [
        { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
        { value: 'high', label: 'High', color: 'bg-orange-500' },
        { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
        { value: 'low', label: 'Low', color: 'bg-gray-400' },
    ]



    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-12 z-30 w-64 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden max-h-[70vh] overflow-y-auto"
        >
            {/* Quick Filters */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('board.filters.quick.title')}</div>
                <button
                    onClick={() => toggleFilter('assignedToMe')}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    <Checkbox checked={filters.assignedToMe} />
                    <UserIcon />
                    {t('board.filters.quick.assigned_to_me')}
                </button>
                <button
                    onClick={() => toggleFilter('dueDateRange', 'overdue')}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    <Checkbox checked={filters.dueDateRange === 'overdue'} />
                    <FireIcon />
                    {t('board.filters.quick.overdue')}
                </button>
                <button
                    onClick={() => toggleFilter('dueDateRange', 'today')}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    <Checkbox checked={filters.dueDateRange === 'today'} />
                    <span className="text-amber-400">📅</span>
                    {t('board.filters.quick.today')}
                </button>
                <button
                    onClick={() => toggleFilter('dueDateRange', 'this_week')}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    <Checkbox checked={filters.dueDateRange === 'this_week'} />
                    <span className="text-blue-400">📅</span>
                    {t('board.filters.quick.this_week')}
                </button>
            </div>

            <div className="border-t border-gray-800" />

            {/* Assignees Section */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('board.filters.assignees')}</div>
                <div className="max-h-40 overflow-y-auto">
                    {members.map(member => (
                        <button
                            key={member.id}
                            onClick={() => toggleFilter('assigneeIds', member.id)}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                        >
                            <Checkbox checked={filters.assigneeIds.includes(member.id)} />
                            {member.avatar ? (
                                <img src={member.avatar} alt={member.name} className="w-5 h-5 rounded-full" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white">
                                    {member.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <span className="truncate">{member.name}</span>
                        </button>
                    ))}
                    {members.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500 italic">{t('board.filters.no_members')}</div>
                    )}
                </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* Priority */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('board.filters.priorities')}</div>
                {priorities.map(p => (
                    <button
                        key={p.value}
                        onClick={() => toggleFilter('priorities', p.value)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                    >
                        <Checkbox checked={filters.priorities.includes(p.value)} />
                        <span className={`w-2 h-2 rounded-full ${p.color}`} />
                        {t(`tasks.priority.${p.value}`)}
                    </button>
                ))}
            </div>

            <div className="border-t border-gray-800" />

            {/* Labels */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('board.filters.labels')}</div>
                <div className="max-h-40 overflow-y-auto">
                    {availableLabels.map(label => (
                        <button
                            key={label.id}
                            onClick={() => toggleFilter('labels', label.id)}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                        >
                            <Checkbox checked={filters.labels.includes(label.id)} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                            {label.name}
                        </button>
                    ))}
                    {availableLabels.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500 italic">{t('board.filters.no_labels')}</div>
                    )}
                </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* Status */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('board.filters.status')}</div>
                {availableStatuses.map(s => (
                    <button
                        key={s.value}
                        onClick={() => toggleFilter('statuses', s.value)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                    >
                        <Checkbox checked={filters.statuses.includes(s.value)} />
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Clear filters button */}
            <div className="p-2 border-t border-gray-800">
                <button
                    onClick={() => {
                        const emptyFilters: FilterState = {
                            assignedToMe: false,
                            overdue: false,
                            priorities: [],
                            statuses: [],
                            labels: [],
                            assigneeIds: [],
                            dueDateRange: 'all'
                        }
                        setFilters(emptyFilters)
                        onFilterChange?.(emptyFilters)
                    }}
                    className="w-full px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                    {t('board.filters.clear')}
                </button>
            </div>
        </div>
    )
}

export function KanbanBoardHeader({
    searchQuery,
    onSearchChange,
    onNewTask,
    onSort,
    onFilterChange,
    currentFilters,
    workspaceSlug,
    userId,
    members,
    availableLabels,
    availableStatuses
}: KanbanBoardHeaderProps) {
    const { t } = useTranslation()
    const [searchFocused, setSearchFocused] = useState(false)
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
    const [showSortDropdown, setShowSortDropdown] = useState(false)
    const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)

    const defaultFilters: FilterState = {
        assignedToMe: false,
        overdue: false,
        priorities: [],
        statuses: [],
        labels: [],
        assigneeIds: [],
        dueDateRange: 'all'
    }

    const activeFilters = currentFilters || defaultFilters

    return (
        <div className="flex items-center justify-end">
            {/* Search, Filters, Sort, New Task */}
            <div className="flex items-center gap-3">
                {/* Search - using existing SearchIcon */}
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {searchFocused ? <SearchIconActive /> : <SearchIconDefault />}
                    </div>
                    <input
                        type="text"
                        placeholder={t('board.header.search')}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-48 pl-10 pr-4 py-2 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                </div>

                {/* Filters button - using existing FilterIcon */}
                <div className="relative">
                    <button
                        onClick={() => { setShowFiltersDropdown(!showFiltersDropdown); setShowSortDropdown(false) }}
                        onMouseEnter={() => setHoveredBtn('filters')}
                        onMouseLeave={() => setHoveredBtn(null)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                    >
                        <FilterIcon isHovered={hoveredBtn === 'filters' || showFiltersDropdown} />
                        {t('board.header.filters')}
                    </button>
                    {showFiltersDropdown && (
                        <FiltersDropdown
                            onClose={() => setShowFiltersDropdown(false)}
                            onFilterChange={onFilterChange}
                            members={members}
                            availableLabels={availableLabels}
                            availableStatuses={availableStatuses}
                        />
                    )}
                </div>

                {/* Saved Filters / Presets */}
                {workspaceSlug && (
                    <SavedFilters
                        workspaceSlug={workspaceSlug}
                        userId={userId}
                        currentFilters={activeFilters}
                        onApplyFilter={(filters) => onFilterChange?.(filters)}
                    />
                )}

                {/* Sort By button - using custom Sort icons */}
                <div className="relative">
                    <button
                        onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFiltersDropdown(false) }}
                        onMouseEnter={() => setHoveredBtn('sort')}
                        onMouseLeave={() => setHoveredBtn(null)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                    >
                        {(hoveredBtn === 'sort' || showSortDropdown) ? <SortIconGold /> : <SortIconGrey />}
                        {t('board.header.sort')}
                    </button>
                    {showSortDropdown && (
                        <SortByDropdown
                            onClose={() => setShowSortDropdown(false)}
                            onSort={onSort}
                        />
                    )}
                </div>

                {/* New Task button */}
                <button
                    onClick={onNewTask}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-sm font-semibold transition-all shadow-lg shadow-amber-500/20"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('board.header.new_task')}
                </button>
            </div>
        </div>
    )
}

// Export config type for column headers
export interface ColumnConfig {
    id: string
    name: string
    color: string
    count: number
}
