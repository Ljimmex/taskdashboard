import { useState, useRef, useEffect } from 'react'
import { FilterIcon, SearchIconDefault, SearchIconActive } from '@/components/dashboard/icons'
import {
    FlagIcon,
    UserIcon,
    CalendarSmallIcon,
    FireIcon,
    ClockIcon,
    SortIconGold,
    SortIconGrey
} from './TaskIcons'


interface KanbanBoardHeaderProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    onNewTask: () => void
    // Sort callbacks
    onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
    // Filter callbacks
    onFilterChange?: (filters: FilterState) => void
}

interface FilterState {
    assignedToMe: boolean
    overdue: boolean
    priorities: string[]
    statuses: string[]
    labels: string[]
}

// Sort By Dropdown
function SortByDropdown({
    onClose,
    onSort
}: {
    onClose: () => void
    onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
}) {
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
        { value: 'priority', label: 'Priorytet', icon: <FlagIcon /> },
        { value: 'dueDate', label: 'Termin', icon: <CalendarSmallIcon /> },
        { value: 'createdAt', label: 'Data utworzenia', icon: <CalendarSmallIcon /> },
        { value: 'updatedAt', label: 'Ostatnia aktualizacja', icon: <ClockIcon /> },
    ]

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-12 z-30 w-56 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden"
        >
            {/* Core Sort Options */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Sortuj według</div>
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
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Kolejność</div>
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
                            Rosnąco
                        </>
                    ) : (
                        <>
                            {/* Arrow Down - Grey */}
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                <path d="M16 6L16 26" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
                                <path d="M8 18L16 26L24 18" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Malejąco
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
    onFilterChange
}: {
    onClose: () => void
    onFilterChange?: (filters: FilterState) => void
}) {
    const [filters, setFilters] = useState<FilterState>({
        assignedToMe: false,
        overdue: false,
        priorities: [],
        statuses: [],
        labels: [],
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
            const array = filters[key] as string[]
            const newArray = array.includes(value)
                ? array.filter(v => v !== value)
                : [...array, value]
            newFilters = { ...filters, [key]: newArray }
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

    const statuses = [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'review', label: 'Review' },
        { value: 'done', label: 'Done' },
    ]

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-12 z-30 w-64 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden max-h-[70vh] overflow-y-auto"
        >
            {/* Quick Filters */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Szybkie filtry</div>
                <button
                    onClick={() => toggleFilter('assignedToMe')}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    <Checkbox checked={filters.assignedToMe} />
                    <UserIcon />
                    Przypisane do mnie
                </button>
                <button
                    onClick={() => toggleFilter('overdue')}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    <Checkbox checked={filters.overdue} />
                    <FireIcon />
                    Przeterminowane
                </button>
            </div>

            <div className="border-t border-gray-800" />

            {/* Assignees Section */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Osoby</div>
                <div className="px-3 py-2">
                    <input
                        type="text"
                        placeholder="Szukaj osób..."
                        className="w-full px-3 py-1.5 rounded-lg bg-gray-800 text-white placeholder-gray-500 text-xs outline-none focus:ring-1 focus:ring-amber-500/30"
                    />
                </div>
                <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                    <Checkbox checked={false} />
                    <UserIcon />
                    Nieprzypisane
                </button>
            </div>

            <div className="border-t border-gray-800" />

            {/* Priority */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Priorytet</div>
                {priorities.map(p => (
                    <button
                        key={p.value}
                        onClick={() => toggleFilter('priorities', p.value)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                    >
                        <Checkbox checked={filters.priorities.includes(p.value)} />
                        <span className={`w-2 h-2 rounded-full ${p.color}`} />
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="border-t border-gray-800" />

            {/* Labels - placeholder */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Etykiety / Tagi</div>
                <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                    <Checkbox checked={false} />
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Bug
                </button>
                <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
                    <Checkbox checked={false} />
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Feature
                </button>
            </div>

            <div className="border-t border-gray-800" />

            {/* Status */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</div>
                {statuses.map(s => (
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
                        const emptyFilters: FilterState = { assignedToMe: false, overdue: false, priorities: [], statuses: [], labels: [] }
                        setFilters(emptyFilters)
                        onFilterChange?.(emptyFilters)
                    }}
                    className="w-full px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                    Wyczyść filtry
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
}: KanbanBoardHeaderProps) {
    const [searchFocused, setSearchFocused] = useState(false)
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
    const [showSortDropdown, setShowSortDropdown] = useState(false)
    const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)

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
                        placeholder="Search"
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
                        Filters
                    </button>
                    {showFiltersDropdown && (
                        <FiltersDropdown
                            onClose={() => setShowFiltersDropdown(false)}
                            onFilterChange={onFilterChange}
                        />
                    )}
                </div>

                {/* Sort By button - using custom Sort icons */}
                <div className="relative">
                    <button
                        onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFiltersDropdown(false) }}
                        onMouseEnter={() => setHoveredBtn('sort')}
                        onMouseLeave={() => setHoveredBtn(null)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                    >
                        {(hoveredBtn === 'sort' || showSortDropdown) ? <SortIconGold /> : <SortIconGrey />}
                        Sort By
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
                    New Task
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
