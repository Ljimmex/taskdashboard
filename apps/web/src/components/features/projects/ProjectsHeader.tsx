import { useState } from 'react'
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

interface ProjectsHeaderProps {
    viewMode: 'gantt' | 'timeline'
    onViewModeChange: (mode: 'gantt' | 'timeline') => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onNewProject: () => void
}

export function ProjectsHeader({
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
    onNewProject,
}: ProjectsHeaderProps) {
    const [searchFocused, setSearchFocused] = useState(false)
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)

    return (
        <div className="flex items-center justify-between mb-6">
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
                    Gantt
                </button>
                <button
                    onClick={() => onViewModeChange('timeline')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${viewMode === 'timeline'
                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                            : 'text-gray-500 hover:text-white'
                        }`}
                >
                    <TimelineIcon active={viewMode === 'timeline'} />
                    Timeline
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
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-48 pl-10 pr-4 py-2 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                </div>

                {/* Filters */}
                <button
                    onMouseEnter={() => setHoveredBtn('filters')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                >
                    <FilterIcon isHovered={hoveredBtn === 'filters'} />
                    Filters
                </button>

                {/* Sort By */}
                <button
                    onMouseEnter={() => setHoveredBtn('sort')}
                    onMouseLeave={() => setHoveredBtn(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all"
                >
                    <SortIcon active={hoveredBtn === 'sort'} />
                    Sort By
                </button>

                {/* New Project */}
                <button
                    onClick={onNewProject}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-sm font-semibold transition-all shadow-lg shadow-amber-500/20"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New Project
                </button>
            </div>
        </div>
    )
}
