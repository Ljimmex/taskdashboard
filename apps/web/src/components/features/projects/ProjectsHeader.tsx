import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FilterIcon, SearchIconDefault, SearchIconActive } from '@/components/dashboard/icons'

// Icons
const GanttIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a0a0f' : '#9E9E9E'} strokeWidth="2">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <rect x="5" y="10" width="14" height="4" rx="1" />
        <rect x="7" y="16" width="10" height="4" rx="1" />
    </svg>
)

const TimelineIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#0a0a0f' : '#9E9E9E'} strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
)

const SortIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#F2CE88' : '#9E9E9E'} strokeWidth="2">
        <path d="M3 6h18M3 12h12M3 18h6" />
    </svg>
)

export interface ProjectFilterState {
    priorities: string[]
    statuses: string[]
    assigneeIds: string[]
}

interface ProjectsHeaderProps {
    viewMode: 'gantt' | 'timeline'
    onViewModeChange: (mode: 'gantt' | 'timeline') => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onNewProject: () => void
    userRole?: string
    onFilterChange?: (filters: ProjectFilterState) => void
    onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
    availablePriorities?: { id: string; name: string; color: string; position: number }[]
    availableStatuses?: { value: string; label: string }[]
    members?: { id: string; name: string; avatar?: string }[]
}

// ---------- Sort Dropdown ----------
function SortDropdown({
    onClose,
    onSort,
}: {
    onClose: () => void
    onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
}) {
    const { t } = useTranslation()
    const [sortBy, setSortBy] = useState<string | null>(null)
    const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    const handleSelect = (option: string) => {
        setSortBy(option)
        onSort?.(option, direction)
    }

    const toggleDirection = () => {
        const next = direction === 'asc' ? 'desc' : 'asc'
        setDirection(next)
        if (sortBy) onSort?.(sortBy, next)
    }

    const options = [
        { value: 'priority', label: t('board.sort.options.priority', 'Priority') },
        { value: 'dueDate', label: t('board.sort.options.due_date', 'Due Date') },
        { value: 'title', label: t('projects.sort.name', 'Name') },
        { value: 'createdAt', label: t('board.sort.options.created_at', 'Created') },
    ]

    return (
        <div
            ref={ref}
            className="absolute right-0 top-12 z-50 w-52 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden"
        >
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    {t('board.sort.title', 'Sort By')}
                </div>
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${sortBy === opt.value
                            ? 'bg-amber-500/10 text-[#F2CE88]'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }`}
                    >
                        {opt.label}
                        {sortBy === opt.value && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-auto">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>

            <div className="border-t border-gray-800" />

            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    {t('board.sort.direction', 'Direction')}
                </div>
                <button
                    onClick={toggleDirection}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                    {direction === 'asc' ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                <path d="M16 26L16 6" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
                                <path d="M8 14L16 6L24 14" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('board.sort.asc', 'Ascending')}
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                <path d="M16 6L16 26" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
                                <path d="M8 18L16 26L24 18" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {t('board.sort.desc', 'Descending')}
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

// ---------- Filter Dropdown ----------
function FilterDropdown({
    onClose,
    onFilterChange,
    availablePriorities,
    availableStatuses = [],
    members = [],
}: {
    onClose: () => void
    onFilterChange?: (filters: ProjectFilterState) => void
    availablePriorities?: { id: string; name: string; color: string; position: number }[]
    availableStatuses?: { value: string; label: string }[]
    members?: { id: string; name: string; avatar?: string }[]
}) {
    const { t } = useTranslation()
    const [filters, setFilters] = useState<ProjectFilterState>({
        priorities: [],
        statuses: [],
        assigneeIds: [],
    })
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    const toggle = (key: keyof ProjectFilterState, value: string) => {
        const arr = filters[key] as string[]
        const next = arr.includes(value)
            ? arr.filter(v => v !== value)
            : [...arr, value]
        const updated = { ...filters, [key]: next }
        setFilters(updated)
        onFilterChange?.(updated)
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

    const defaultPriorities = [
        { id: 'urgent', name: 'Urgent', color: '#ef4444', position: 3 },
        { id: 'high', name: 'High', color: '#f59e0b', position: 2 },
        { id: 'medium', name: 'Medium', color: '#3b82f6', position: 1 },
        { id: 'low', name: 'Low', color: '#6b7280', position: 0 },
    ]
    const priorities = (availablePriorities || defaultPriorities).sort((a, b) => a.position - b.position)

    return (
        <div
            ref={ref}
            className="absolute right-0 top-12 z-50 w-60 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden max-h-[70vh] overflow-y-auto"
        >
            {/* Priority */}
            <div className="p-2">
                <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    {t('board.filters.priorities', 'Priority')}
                </div>
                {priorities.map(p => (
                    <button
                        key={p.id}
                        onClick={() => toggle('priorities', p.id)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                    >
                        <Checkbox checked={filters.priorities.includes(p.id)} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                    </button>
                ))}
            </div>

            {/* Status */}
            {availableStatuses.length > 0 && (
                <>
                    <div className="border-t border-gray-800" />
                    <div className="p-2">
                        <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            {t('board.filters.status', 'Status')}
                        </div>
                        {availableStatuses.map(s => (
                            <button
                                key={s.value}
                                onClick={() => toggle('statuses', s.value)}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                            >
                                <Checkbox checked={filters.statuses.includes(s.value)} />
                                {s.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Assignees */}
            {members.length > 0 && (
                <>
                    <div className="border-t border-gray-800" />
                    <div className="p-2">
                        <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            {t('board.filters.assignees', 'Assignees')}
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                            {members.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => toggle('assigneeIds', m.id)}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                                >
                                    <Checkbox checked={filters.assigneeIds.includes(m.id)} />
                                    {m.avatar ? (
                                        <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white">
                                            {m.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="truncate">{m.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Clear */}
            <div className="p-2 border-t border-gray-800">
                <button
                    onClick={() => {
                        const empty: ProjectFilterState = { priorities: [], statuses: [], assigneeIds: [] }
                        setFilters(empty)
                        onFilterChange?.(empty)
                    }}
                    className="w-full px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                >
                    {t('board.filters.clear', 'Clear All')}
                </button>
            </div>
        </div>
    )
}

// ---------- Main Header ----------
export function ProjectsHeader({
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
    onNewProject,
    userRole,
    onFilterChange,
    onSort,
    availablePriorities,
    availableStatuses,
    members,
}: ProjectsHeaderProps) {
    const { t } = useTranslation()
    const [searchFocused, setSearchFocused] = useState(false)
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [showSort, setShowSort] = useState(false)

    return (
        <div className="flex items-center justify-between mb-6 relative z-50">
            {/* Left side - View Toggle */}
            <div className="flex bg-[#1a1a24] p-1 rounded-full">
                <button
                    onClick={() => onViewModeChange('gantt')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'gantt'
                        ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                        : 'text-gray-500 hover:text-white'
                        }`}
                >
                    <GanttIcon active={viewMode === 'gantt'} />
                    {t('projects.header.gantt')}
                </button>
                <button
                    onClick={() => onViewModeChange('timeline')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === 'timeline'
                        ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                        : 'text-gray-500 hover:text-white'
                        }`}
                >
                    <TimelineIcon active={viewMode === 'timeline'} />
                    {t('projects.header.timeline')}
                </button>
            </div>

            {/* Right side - Search, Filters, Sort, New Project */}
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {searchFocused ? <SearchIconActive /> : <SearchIconDefault />}
                    </div>
                    <input
                        type="text"
                        placeholder={t('projects.header.search')}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-48 pl-10 pr-4 py-2 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="relative">
                    <button
                        onClick={() => { setShowFilters(!showFilters); setShowSort(false) }}
                        onMouseEnter={() => setHoveredBtn('filters')}
                        onMouseLeave={() => setHoveredBtn(null)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                    >
                        <FilterIcon isHovered={hoveredBtn === 'filters' || showFilters} />
                        {t('projects.header.filters')}
                    </button>
                    {showFilters && (
                        <FilterDropdown
                            onClose={() => setShowFilters(false)}
                            onFilterChange={onFilterChange}
                            availablePriorities={availablePriorities}
                            availableStatuses={availableStatuses}
                            members={members}
                        />
                    )}
                </div>

                {/* Sort By */}
                <div className="relative">
                    <button
                        onClick={() => { setShowSort(!showSort); setShowFilters(false) }}
                        onMouseEnter={() => setHoveredBtn('sort')}
                        onMouseLeave={() => setHoveredBtn(null)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                    >
                        <SortIcon active={hoveredBtn === 'sort' || showSort} />
                        {t('projects.header.sort')}
                    </button>
                    {showSort && (
                        <SortDropdown
                            onClose={() => setShowSort(false)}
                            onSort={onSort}
                        />
                    )}
                </div>

                {/* New Project */}
                {userRole && !['member', 'guest'].includes(userRole) && (
                    <button
                        onClick={onNewProject}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-sm font-semibold transition-all shadow-lg shadow-amber-500/20"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {t('projects.header.new_project')}
                    </button>
                )}
            </div>
        </div>
    )
}