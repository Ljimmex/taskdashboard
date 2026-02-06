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
    setWeekStartDay
}: CalendarHeaderProps) {
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
                {/* Przycisk Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all outline-none focus:ring-1 focus:ring-white/10",
                            selectedTypes.length < 4 ? "bg-[#1E2029] text-white" : "bg-[#1a1a24] text-gray-400 hover:text-white"
                        )}>
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filter</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#16161f] p-2 text-gray-300 shadow-2xl rounded-xl border-none">
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Type
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

                        <div className="p-2 mt-2">
                            <button
                                onClick={clearFilters}
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
