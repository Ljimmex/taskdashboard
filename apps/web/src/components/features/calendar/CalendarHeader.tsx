import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Filter, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { CalendarEventType } from './CalendarView'

export interface ProjectOption {
    id: string
    name: string
}

export interface MemberOption {
    id: string
    name: string
    image?: string | null
}

// Custom Checkbox Component matching Teams page style
export const CustomCheckbox = ({ checked, onClick, colorClass = "bg-amber-500 border-amber-500" }: { checked: boolean; onClick?: () => void; colorClass?: string }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
            checked ? colorClass : "border-gray-600 bg-transparent hover:border-gray-500"
        )}
    >
        {checked && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        )}
    </div>
)

interface CalendarHeaderProps {
    currentDate: Date
    onPrevMonth: () => void
    onNextMonth: () => void
    onToday: () => void

    // Filter props
    selectedTypes: CalendarEventType[]
    toggleType: (type: CalendarEventType) => void
    clearFilters: () => void

    // Schedule settings props
    showWeekends: boolean
    setShowWeekends: (show: boolean) => void
    weekStartDay: 'monday' | 'sunday'
    setWeekStartDay: (day: 'monday' | 'sunday') => void

    view: 'month' | 'week' | 'day'
    setView: (view: 'month' | 'week' | 'day') => void

    // New Filter Props
    projects?: ProjectOption[]
    filterProjectIds?: string[]
    setFilterProjectIds?: (ids: string[]) => void

    members?: MemberOption[]
    filterMemberIds?: string[]
    setFilterMemberIds?: (ids: string[]) => void
}

export function CalendarHeader({
    currentDate,
    onPrevMonth,
    onNextMonth,
    onToday,
    selectedTypes,
    toggleType,
    clearFilters,
    showWeekends,
    setShowWeekends,
    weekStartDay,
    setWeekStartDay,
    view,
    setView,
    // New Filter Props
    projects = [],
    filterProjectIds = [],
    setFilterProjectIds,
    members = [],
    filterMemberIds = [],
    setFilterMemberIds
}: CalendarHeaderProps) {

    const toggleProject = (projectId: string) => {
        if (!setFilterProjectIds) return
        if (filterProjectIds.includes(projectId)) {
            setFilterProjectIds(filterProjectIds.filter(id => id !== projectId))
        } else {
            setFilterProjectIds([...filterProjectIds, projectId])
        }
    }

    const toggleMember = (memberId: string) => {
        if (!setFilterMemberIds) return
        if (filterMemberIds.includes(memberId)) {
            setFilterMemberIds(filterMemberIds.filter(id => id !== memberId))
        } else {
            setFilterMemberIds([...filterMemberIds, memberId])
        }
    }

    const hasActiveFilters = filterProjectIds.length > 0 || filterMemberIds.length > 0 || selectedTypes.length < 4

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            {/* Lewa strona: Ikonka + Miesiąc/Rok */}
            <div className="flex items-center gap-3 mb-4 md:mb-0">
                <h2 className="text-lg font-semibold text-white tracking-wide">
                    {format(currentDate, 'MMMM yyyy', { locale: enUS })}
                </h2>
            </div>

            {/* Prawa strona: Przyciski Funkcyjne i Nawigacja */}
            <div className="flex items-center gap-3">
                {/* View Mode Selector */}
                <div className="flex items-center bg-[#1a1a24] p-1 rounded-full mr-2 ">
                    <button
                        onClick={() => setView('month')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-full transition-all",
                            view === 'month' ? "bg-[#F2CE88] text-black shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 2v4" /><path d="M16 2v4" /></svg>
                        <span>Month</span>
                    </button>
                    <button
                        onClick={() => setView('week')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-full transition-all",
                            view === 'week' ? "bg-[#F2CE88] text-black shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
                        <span>Week</span>
                    </button>
                    <button
                        onClick={() => setView('day')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-full transition-all",
                            view === 'day' ? "bg-[#F2CE88] text-black shadow-sm" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 12h18" /></svg>
                        <span>Day</span>
                    </button>
                </div>

                {/* Przycisk Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all outline-none focus:ring-1 focus:ring-white/10",
                            hasActiveFilters ? "bg-[#1E2029] text-white ring-1 ring-amber-500/50" : "bg-[#1a1a24] text-gray-400 hover:text-white"
                        )}>
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filter</span>
                            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" />}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-[#16161f] p-2 text-gray-300 shadow-2xl rounded-xl border-none max-h-[80vh] overflow-y-auto">
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Event Types
                        </div>

                        <DropdownMenuItem
                            onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.EVENT); }}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                        >
                            <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.EVENT)} />
                            <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.EVENT) ? "text-white" : "text-gray-400")}>Events</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.TASK); }}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                        >
                            <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.TASK)} />
                            <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.TASK) ? "text-white" : "text-gray-400")}>Tasks</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.REMINDER); }}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                        >
                            <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.REMINDER)} />
                            <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.REMINDER) ? "text-white" : "text-gray-400")}>Reminders</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={(e) => { e.preventDefault(); toggleType(CalendarEventType.MEETING); }}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                        >
                            <CustomCheckbox checked={selectedTypes.includes(CalendarEventType.MEETING)} />
                            <span className={cn("transition-colors", selectedTypes.includes(CalendarEventType.MEETING) ? "text-white" : "text-gray-400")}>Meetings</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-gray-800 my-2" />

                        {projects.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Projects
                                </div>
                                {projects.map(p => (
                                    <DropdownMenuItem
                                        key={p.id}
                                        onClick={(e) => { e.preventDefault(); toggleProject(p.id); }}
                                        className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                                    >
                                        <CustomCheckbox checked={filterProjectIds.includes(p.id)} />
                                        <span className={cn("transition-colors truncate", filterProjectIds.includes(p.id) ? "text-white" : "text-gray-400")}>
                                            {p.name}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator className="bg-gray-800 my-2" />
                            </>
                        )}

                        {members.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    People
                                </div>
                                {members.map(m => (
                                    <DropdownMenuItem
                                        key={m.id}
                                        onClick={(e) => { e.preventDefault(); toggleMember(m.id); }}
                                        className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                                    >
                                        <CustomCheckbox checked={filterMemberIds.includes(m.id)} />
                                        <div className="flex items-center gap-2 truncate">
                                            {m.image ? (
                                                <img src={m.image} alt="" className="w-5 h-5 rounded-full" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-gray-300">
                                                    {m.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <span className={cn("transition-colors", filterMemberIds.includes(m.id) ? "text-white" : "text-gray-400")}>
                                                {m.name}
                                            </span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </>
                        )}

                        <div className="p-2 mt-2">
                            <button
                                onClick={() => {
                                    clearFilters()
                                    // Also clear advanced filters needs to be handled by parent prop
                                    setFilterProjectIds?.([])
                                    setFilterMemberIds?.([])
                                }}
                                className="w-full py-1.5 bg-[#1a1a24] hover:bg-[#20202b] text-gray-400 hover:text-white text-xs font-medium rounded-lg transition-colors border border-white/5"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Przycisk Schedule setting */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a24] hover:bg-[#20202b] rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-all mr-2 outline-none focus:ring-1 focus:ring-white/10">
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Schedule setting</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-[#16161f] p-2 text-gray-300 shadow-2xl rounded-xl border-none">
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            View Options
                        </div>

                        <DropdownMenuItem
                            onClick={(e) => { e.preventDefault(); setShowWeekends(!showWeekends); }}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-white/5 focus:bg-white/5 cursor-pointer outline-none"
                        >
                            <CustomCheckbox checked={showWeekends} />
                            <span className="text-gray-300">Show weekends</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-gray-800 my-2" />

                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Start of week
                        </div>
                        <DropdownMenuRadioGroup value={weekStartDay} onValueChange={(v) => setWeekStartDay(v as 'monday' | 'sunday')}>
                            <DropdownMenuRadioItem value="monday" className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-[#20202b] focus:bg-[#20202b] cursor-pointer outline-none data-[state=checked]:text-amber-500 text-gray-400 hover:text-gray-200 group transition-colors">
                                <div className="flex items-center gap-3 w-full">
                                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all", weekStartDay === 'monday' ? "border-amber-500" : "border-gray-600 group-hover:border-gray-500")}>
                                        {weekStartDay === 'monday' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                    </div>
                                    <span>Monday</span>
                                </div>
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="sunday" className="flex items-center px-2 py-2 text-sm rounded-lg hover:bg-[#20202b] focus:bg-[#20202b] cursor-pointer outline-none data-[state=checked]:text-amber-500 text-gray-400 hover:text-gray-200 group transition-colors">
                                <div className="flex items-center gap-3 w-full">
                                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all", weekStartDay === 'sunday' ? "border-amber-500" : "border-gray-600 group-hover:border-gray-500")}>
                                        {weekStartDay === 'sunday' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                    </div>
                                    <span>Sunday</span>
                                </div>
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Separator */}
                <div className="h-6 w-px bg-gray-800 hidden md:block mx-1"></div>

                {/* Nawigacja */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onPrevMonth}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onToday}
                        className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-amber-500 transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={onNextMonth}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
