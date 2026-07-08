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
  SortIconGrey,
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
  availablePriorities?: { id: string; name: string; color: string; position: number }[]
  availableStatuses?: { value: string; label: string }[]
  canCreateTask?: boolean
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
  onSort,
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
      className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-xl border border-gray-800 bg-[#1a1a24] shadow-2xl"
    >
      {/* Core Sort Options */}
      <div className="p-2">
        <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {t('board.sort.title')}
        </div>
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSortSelect(option.value)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              sortBy === option.value
                ? 'bg-amber-500/10 text-[#F2CE88]'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {option.icon}
            {option.label}
            {sortBy === option.value && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="ml-auto"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-gray-800" />

      {/* Direction Toggle */}
      <div className="p-2">
        <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {t('board.sort.direction')}
        </div>
        <button
          onClick={toggleDirection}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          {direction === 'asc' ? (
            <>
              {/* Arrow Up - Grey */}
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                <path d="M16 26L16 6" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
                <path
                  d="M8 14L16 6L24 14"
                  stroke="#545454"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('board.sort.asc')}
            </>
          ) : (
            <>
              {/* Arrow Down - Grey */}
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                <path d="M16 6L16 26" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
                <path
                  d="M8 18L16 26L24 18"
                  stroke="#545454"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
  availablePriorities,
  availableStatuses = [],
}: {
  onClose: () => void
  onFilterChange?: (filters: FilterState) => void
  members?: { id: string; name: string; avatar?: string }[]
  availableLabels?: { id: string; name: string; color: string }[]
  availablePriorities?: { id: string; name: string; color: string; position: number }[]
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
    dueDateRange: 'all',
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
        const rangeValue = (
          filters.dueDateRange === value ? 'all' : value
        ) as FilterState['dueDateRange']
        newFilters = { ...filters, [key]: rangeValue }
      } else {
        // Handle multi-select arrays
        const array = filters[key] as string[]
        const newArray = array.includes(value)
          ? array.filter((v) => v !== value)
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
    <div
      className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-all ${
        checked ? 'border-amber-500 bg-amber-500' : 'border-gray-600'
      }`}
    >
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
  const priorities = (availablePriorities || defaultPriorities).sort(
    (a, b) => a.position - b.position
  )

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-12 z-30 max-h-[70vh] w-64 overflow-hidden overflow-y-auto rounded-xl border border-gray-800 bg-[#1a1a24] shadow-2xl"
    >
      {/* Quick Filters */}
      <div className="p-2">
        <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {t('board.filters.quick.title')}
        </div>
        <button
          onClick={() => toggleFilter('assignedToMe')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <Checkbox checked={filters.assignedToMe} />
          <UserIcon />
          {t('board.filters.quick.assigned_to_me')}
        </button>
        <button
          onClick={() => toggleFilter('dueDateRange', 'overdue')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <Checkbox checked={filters.dueDateRange === 'overdue'} />
          <FireIcon />
          {t('board.filters.quick.overdue')}
        </button>
        <button
          onClick={() => toggleFilter('dueDateRange', 'today')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <Checkbox checked={filters.dueDateRange === 'today'} />
          <span className="text-amber-400">📅</span>
          {t('board.filters.quick.today')}
        </button>
        <button
          onClick={() => toggleFilter('dueDateRange', 'this_week')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <Checkbox checked={filters.dueDateRange === 'this_week'} />
          <span className="text-blue-400">📅</span>
          {t('board.filters.quick.this_week')}
        </button>
      </div>

      <div className="border-t border-gray-800" />

      {/* Assignees Section */}
      <div className="p-2">
        <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {t('board.filters.assignees')}
        </div>
        <div className="max-h-40 overflow-y-auto">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => toggleFilter('assigneeIds', member.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <Checkbox checked={filters.assigneeIds.includes(member.id)} />
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="h-5 w-5 rounded-full" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-[10px] text-white">
                  {member.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="truncate">{member.name}</span>
            </button>
          ))}
          {members.length === 0 && (
            <div className="px-3 py-2 text-xs italic text-gray-500">
              {t('board.filters.no_members')}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Priority */}
      <div className="p-2">
        <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {t('board.filters.priorities')}
        </div>
        {priorities.map((p) => (
          <button
            key={p.id}
            onClick={() => toggleFilter('priorities', p.id)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <Checkbox checked={filters.priorities.includes(p.id)} />
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>

      <div className="border-t border-gray-800" />

      {/* Labels */}
      <div className="p-2">
        <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {t('board.filters.labels')}
        </div>
        <div className="max-h-40 overflow-y-auto">
          {availableLabels.map((label) => (
            <button
              key={label.id}
              onClick={() => toggleFilter('labels', label.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <Checkbox checked={filters.labels.includes(label.id)} />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
            </button>
          ))}
          {availableLabels.length === 0 && (
            <div className="px-3 py-2 text-xs italic text-gray-500">
              {t('board.filters.no_labels')}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-800" />

      {/* Status */}
      <div className="p-2">
        <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {t('board.filters.status')}
        </div>
        {availableStatuses.map((s) => (
          <button
            key={s.value}
            onClick={() => toggleFilter('statuses', s.value)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <Checkbox checked={filters.statuses.includes(s.value)} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Clear filters button */}
      <div className="border-t border-gray-800 p-2">
        <button
          onClick={() => {
            const emptyFilters: FilterState = {
              assignedToMe: false,
              overdue: false,
              priorities: [],
              statuses: [],
              labels: [],
              assigneeIds: [],
              dueDateRange: 'all',
            }
            setFilters(emptyFilters)
            onFilterChange?.(emptyFilters)
          }}
          className="w-full rounded-lg px-3 py-2 text-sm text-amber-400 transition-colors hover:bg-amber-500/10"
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
  availablePriorities,
  availableStatuses,
  canCreateTask,
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
    dueDateRange: 'all',
  }

  const activeFilters = currentFilters || defaultFilters

  return (
    <div className="flex w-full items-center justify-end">
      {/* Search, Filters, Sort, New Task */}
      <div className="flex w-full flex-wrap items-center justify-end gap-2 md:gap-3">
        {/* Search - using existing SearchIcon */}
        <div className="group relative">
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
            className="w-[140px] rounded-xl bg-[#1a1a24] py-2 pl-10 pr-2 text-sm text-white placeholder-gray-500 transition-all focus:outline-none focus:ring-1 focus:ring-amber-500/30 md:w-48 md:pr-4"
          />
        </div>

        {/* Filters button - using existing FilterIcon */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFiltersDropdown(!showFiltersDropdown)
              setShowSortDropdown(false)
            }}
            onMouseEnter={() => setHoveredBtn('filters')}
            onMouseLeave={() => setHoveredBtn(null)}
            className="flex items-center gap-2 rounded-xl bg-[#1a1a24] px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:text-white"
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
              availablePriorities={availablePriorities}
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
            onClick={() => {
              setShowSortDropdown(!showSortDropdown)
              setShowFiltersDropdown(false)
            }}
            onMouseEnter={() => setHoveredBtn('sort')}
            onMouseLeave={() => setHoveredBtn(null)}
            className="flex items-center gap-2 rounded-xl bg-[#1a1a24] px-4 py-2 text-sm font-medium text-gray-400 transition-all hover:text-white"
          >
            {hoveredBtn === 'sort' || showSortDropdown ? <SortIconGold /> : <SortIconGrey />}
            {t('board.header.sort')}
          </button>
          {showSortDropdown && (
            <SortByDropdown onClose={() => setShowSortDropdown(false)} onSort={onSort} />
          )}
        </div>

        {/* New Task button */}
        {(canCreateTask ?? true) && (
          <button
            onClick={onNewTask}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('board.header.new_task')}
          </button>
        )}
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
