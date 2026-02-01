import { useState, useRef, useEffect, useMemo } from 'react'
import {
    FilterIcon,
    SearchIconDefault,
    SearchIconActive,
} from '@/components/dashboard/icons'

// Sort Icon
const SortIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4" />
    </svg>
)

// Custom Checkbox Component
const Checkbox = ({ checked, onChange, label, color }: { checked: boolean; onChange: () => void; label: string; color?: string }) => (
    <label className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group">
        <div
            onClick={(e) => { e.preventDefault(); onChange() }}
            className={`w-4 h-4 rounded flex items-center justify-center transition-all flex-shrink-0 ${checked
                ? 'bg-amber-500 border-amber-500'
                : 'bg-transparent border-2 border-gray-600 group-hover:border-gray-500'
                }`}
        >
            {checked && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
        </div>
        <span className={`text-sm ${color || 'text-gray-300'}`}>{label}</span>
    </label>
)

export type SortOption = 'name' | 'email' | 'role' | 'dateAdded' | 'lastActive' | 'projectCount'
export type SortDirection = 'asc' | 'desc'
export type FilterOption = {
    roles?: string[]
    teams?: string[]
    status?: ('active' | 'inactive' | 'pending')[]
    availability?: ('available' | 'busy' | 'overloaded')[]
    projects?: string[]
}

interface TeamHeaderProps {
    teamCount: number
    memberCount: number
    onAddTeam: () => void
    searchQuery: string
    onSearchChange: (query: string) => void
    sortBy: SortOption
    sortDirection: SortDirection
    onSortChange: (sort: SortOption, direction: SortDirection) => void
    filters: FilterOption
    onFiltersChange: (filters: FilterOption) => void
    availableRoles: string[]
    availableTeams: string[]
    availableProjects: string[]
    userRole?: string | null
}

export function TeamHeader({
    onAddTeam,
    searchQuery,
    onSearchChange,
    sortBy,
    sortDirection,
    onSortChange,
    filters,
    onFiltersChange,
    availableRoles,
    availableTeams,
    availableProjects,
    userRole
}: TeamHeaderProps) {
    const [searchFocused, setSearchFocused] = useState(false)
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [isSortOpen, setIsSortOpen] = useState(false)

    const filterRef = useRef<HTMLDivElement>(null)
    const sortRef = useRef<HTMLDivElement>(null)

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false)
            }
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setIsSortOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const sortOptions: { value: SortOption; label: string; directions: { asc: string; desc: string } }[] = [
        { value: 'name', label: 'Name', directions: { asc: 'A → Z', desc: 'Z → A' } },
        { value: 'lastActive', label: 'Last Active', directions: { asc: 'Oldest', desc: 'Newest' } },
        { value: 'dateAdded', label: 'Date Added', directions: { asc: 'Oldest', desc: 'Newest' } },
        { value: 'projectCount', label: 'Project Count', directions: { asc: 'Low → High', desc: 'High → Low' } },
        { value: 'role', label: 'Job Title', directions: { asc: 'A → Z', desc: 'Z → A' } },
    ]

    const statusOptions = [
        { value: 'active', label: 'Active', default: true },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Invited / Pending' },
    ]

    const availabilityOptions = [
        { value: 'available', label: 'Available', color: 'text-green-400' },
        { value: 'busy', label: 'Busy', color: 'text-yellow-400' },
        { value: 'overloaded', label: 'Overloaded', color: 'text-red-400' },
    ]

    const hasActiveFilters = (filters.roles?.length || 0) > 0 ||
        (filters.teams?.length || 0) > 0 ||
        (filters.status?.length || 0) > 0 ||
        (filters.availability?.length || 0) > 0 ||
        (filters.projects?.length || 0) > 0

    const currentSortLabel = sortOptions.find(s => s.value === sortBy)?.label || 'Name'
    const currentDirectionLabel = sortOptions.find(s => s.value === sortBy)?.directions[sortDirection] || ''

    const toggleArrayFilter = (key: keyof FilterOption, value: string) => {
        const current = (filters[key] as string[]) || []
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value]
        onFiltersChange({ ...filters, [key]: updated.length > 0 ? updated : undefined })
    }

    const canAddTeam = useMemo(() => {
        if (!userRole) return false
        return ['owner', 'admin'].includes(userRole)
    }, [userRole])

    return (
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Teams</h1>

            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {searchFocused ? <SearchIconActive /> : <SearchIconDefault />}
                    </div>
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-56 pl-10 pr-4 py-2 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                </div>

                {/* Filters Dropdown */}
                <div className="relative" ref={filterRef}>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${hasActiveFilters
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-[#1a1a24] text-gray-400 hover:text-white'
                            }`}
                    >
                        <FilterIcon isHovered={!!hasActiveFilters} />
                        Filters
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                    </button>

                    {isFilterOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a24] rounded-xl shadow-2xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                            {/* Role & Team Section */}
                            <div className="p-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role & Team</span>

                                {/* Job Title */}
                                <div className="mt-3">
                                    <label className="text-xs text-gray-400 mb-2 block font-medium">Job Title</label>
                                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                        {availableRoles.map(role => (
                                            <Checkbox
                                                key={role}
                                                checked={filters.roles?.includes(role) || false}
                                                onChange={() => toggleArrayFilter('roles', role)}
                                                label={role}
                                            />
                                        ))}
                                        {availableRoles.length === 0 && (
                                            <span className="text-xs text-gray-500 italic px-2">No roles available</span>
                                        )}
                                    </div>
                                </div>

                                {/* Teams */}
                                {availableTeams.length > 1 && (
                                    <div className="mt-4">
                                        <label className="text-xs text-gray-400 mb-2 block font-medium">Team</label>
                                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                            {availableTeams.map(team => (
                                                <Checkbox
                                                    key={team}
                                                    checked={filters.teams?.includes(team) || false}
                                                    onChange={() => toggleArrayFilter('teams', team)}
                                                    label={team}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Status Section */}
                            <div className="p-4 bg-[#12121a]/50">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Availability</span>

                                {/* Account Status */}
                                <div className="mt-3">
                                    <label className="text-xs text-gray-400 mb-2 block font-medium">Account Status</label>
                                    <div className="space-y-0.5">
                                        {statusOptions.map(opt => (
                                            <Checkbox
                                                key={opt.value}
                                                checked={filters.status?.includes(opt.value as any) || false}
                                                onChange={() => toggleArrayFilter('status', opt.value)}
                                                label={opt.label}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Availability */}
                                <div className="mt-4">
                                    <label className="text-xs text-gray-400 mb-2 block font-medium">Availability</label>
                                    <div className="space-y-0.5">
                                        {availabilityOptions.map(opt => (
                                            <Checkbox
                                                key={opt.value}
                                                checked={filters.availability?.includes(opt.value as any) || false}
                                                onChange={() => toggleArrayFilter('availability', opt.value)}
                                                label={opt.label}
                                                color={opt.color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Projects Section */}
                            {availableProjects.length > 0 && (
                                <div className="p-4">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Context</span>

                                    <div className="mt-3">
                                        <label className="text-xs text-gray-400 mb-2 block font-medium">Assigned to Project</label>
                                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                            {availableProjects.map(proj => (
                                                <Checkbox
                                                    key={proj}
                                                    checked={filters.projects?.includes(proj) || false}
                                                    onChange={() => toggleArrayFilter('projects', proj)}
                                                    label={proj}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Clear Filters */}
                            <div className="p-3 bg-[#12121a]">
                                <button
                                    onClick={() => {
                                        onFiltersChange({})
                                        setIsFilterOpen(false)
                                    }}
                                    className="w-full px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                    <button
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                    >
                        <SortIcon />
                        <span className="text-gray-300">{currentSortLabel}</span>
                        <span className="text-gray-500 text-xs">({currentDirectionLabel})</span>
                    </button>

                    {isSortOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a24] rounded-xl shadow-2xl z-50 overflow-hidden">
                            <div className="p-2">
                                {sortOptions.map(opt => (
                                    <div key={opt.value} className="mb-1">
                                        <div className="px-3 py-1.5 text-xs text-gray-500 font-medium">{opt.label}</div>
                                        <div className="flex gap-1 px-2">
                                            <button
                                                onClick={() => {
                                                    onSortChange(opt.value, 'asc')
                                                    setIsSortOpen(false)
                                                }}
                                                className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-all ${sortBy === opt.value && sortDirection === 'asc'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                    }`}
                                            >
                                                {opt.directions.asc}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onSortChange(opt.value, 'desc')
                                                    setIsSortOpen(false)
                                                }}
                                                className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-all ${sortBy === opt.value && sortDirection === 'desc'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                    }`}
                                            >
                                                {opt.directions.desc}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Team Button */}
                {canAddTeam && (
                    <button
                        onClick={onAddTeam}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-sm font-semibold transition-all shadow-lg shadow-amber-500/20"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Team
                    </button>
                )}
            </div>
        </div>
    )
}
