import { useState } from 'react'
import {
    FilterIcon,
    SearchIconDefault,
    SearchIconActive,
} from '@/components/dashboard/icons'
import { SortIconGrey } from '@/components/features/tasks/TaskIcons'

interface TeamHeaderProps {
    teamCount: number
    memberCount: number
    onAddTeam: () => void
}

export function TeamHeader({ onAddTeam }: TeamHeaderProps) {
    const [searchFocused, setSearchFocused] = useState(false)

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
                        placeholder="Search"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-48 pl-10 pr-4 py-2 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                </div>

                {/* Filters */}
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all">
                    <FilterIcon isHovered={false} />
                    Filters
                </button>

                {/* Sort */}
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a24] text-gray-400 hover:text-white text-sm font-medium transition-all">
                    <SortIconGrey />
                    Sort By
                </button>

                {/* Add Team Button */}
                <button
                    onClick={onAddTeam}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0F4C75] hover:bg-[#0F4C75]/80 text-white text-sm font-semibold transition-all shadow-lg"
                >
                    <span className="text-lg">+</span>
                    Add Team
                </button>
            </div>
        </div>
    )
}
