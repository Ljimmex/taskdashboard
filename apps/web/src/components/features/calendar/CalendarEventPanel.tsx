import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarEventType } from './CalendarView'
import { X, Clock, Calendar as CalendarIcon, MapPin, AlignLeft, Users, RefreshCw, Video, Building, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomCheckbox } from './CalendarHeader'

interface CalendarEventPanelProps {
    isOpen: boolean
    onClose: () => void
    defaultType?: CalendarEventType
}

export function CalendarEventPanel({ isOpen, onClose, defaultType = CalendarEventType.EVENT }: CalendarEventPanelProps) {
    const [title, setTitle] = useState('')
    const [selectedType, setSelectedType] = useState<CalendarEventType>(defaultType)
    const [startDate, setStartDate] = useState<Date>(new Date())
    const [isAllDay, setIsAllDay] = useState(false)
    const [description, setDescription] = useState('')
    const [location, setLocation] = useState('')

    // Mock data for dropdowns
    const timeOptions = Array.from({ length: 48 }).map((_, i) => {
        const h = Math.floor(i / 2)
        const m = i % 2 === 0 ? '00' : '30'
        return `${h}:${m}`
    })

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-[400px] bg-[#16161f] z-50 border-l border-gray-800/50 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-300">
                {/* Header / Title */}
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-end">
                        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-[#1a1a24] rounded-lg p-1 flex items-center gap-2 border border-gray-800/50">
                        <div className="p-2 text-gray-400">
                            <span className="sr-only">Title</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </div>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Add title"
                            className="border-none bg-transparent focus-visible:ring-0 text-lg placeholder:text-gray-500 px-0"
                        />
                    </div>

                    {/* Type Selector (Tabs) */}
                    <div className="flex items-center gap-1">
                        {[CalendarEventType.EVENT, CalendarEventType.TASK, CalendarEventType.REMINDER].map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    selectedType === type
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
                                )}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-6">
                    {/* Date & Time Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            {/* Start Date */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="flex-1 flex items-center justify-start gap-2 bg-[#1a1a24] hover:bg-[#20202b] border border-gray-800/50 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors">
                                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                                        <span>{format(startDate, 'EEE, MMM d')}</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-[#16161f] border-gray-800">
                                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                                </PopoverContent>
                            </Popover>

                            {/* Start Time */}
                            <Select>
                                <SelectTrigger className="w-[100px] bg-[#1a1a24] border-gray-800/50 text-gray-300">
                                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                                    <SelectValue placeholder="Time" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#16161f] border-gray-800 text-gray-300">
                                    {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {/* End Time */}
                            <Select>
                                <SelectTrigger className="w-[100px] bg-[#1a1a24] border-gray-800/50 text-gray-300">
                                    <SelectValue placeholder="End" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#16161f] border-gray-800 text-gray-300">
                                    {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-3 px-1">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                <CustomCheckbox checked={isAllDay} />
                                <span className="text-sm text-gray-400">All Day</span>
                            </div>
                        </div>

                        {/* Recurrence */}
                        <Select>
                            <SelectTrigger className="w-full bg-[#1a1a24] border-gray-800/50 text-gray-300 justify-start">
                                <RefreshCw className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="flex-1 text-left">Does not repeat</span>
                            </SelectTrigger>
                            <SelectContent className="bg-[#16161f] border-gray-800 text-gray-300">
                                <SelectItem value="none">Does not repeat</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* People / Category */}
                    <div className="grid grid-cols-2 gap-2">
                        <Select>
                            <SelectTrigger className="w-full bg-[#1a1a24] border-gray-800/50 text-gray-300">
                                <Users className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="truncate">Add guests</span>
                            </SelectTrigger>
                            <SelectContent className="bg-[#16161f] border-gray-800 text-gray-300">
                                <SelectItem value="guest1">Guest 1</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select>
                            <SelectTrigger className="w-full bg-[#1a1a24] border-gray-800/50 text-gray-300">
                                <div className="w-3 h-3 rounded bg-amber-500 mr-2" />
                                <span>Work</span>
                            </SelectTrigger>
                            <SelectContent className="bg-[#16161f] border-gray-800 text-gray-300">
                                <SelectItem value="work">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500" />Work</div>
                                </SelectItem>
                                <SelectItem value="personal">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500" />Personal</div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Meeting Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meeting Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button className="flex items-center justify-center gap-2 p-2 bg-[#1a1a24] hover:bg-[#20202b] rounded-lg border border-gray-800/50 text-sm text-gray-300 transition-colors">
                                <Building className="w-4 h-4 text-gray-500" />
                                Meeting Room
                            </button>
                            <button className="flex items-center justify-center gap-2 p-2 bg-[#1a1a24] hover:bg-[#20202b] rounded-lg border border-gray-800/50 text-sm text-gray-300 transition-colors">
                                <Monitor className="w-4 h-4 text-gray-500" />
                                Virtual
                            </button>
                        </div>
                        <button className="w-full flex items-center gap-3 p-2 bg-[#1a1a24] hover:bg-[#20202b] rounded-lg border border-gray-800/50 text-sm text-gray-300 transition-colors text-left">
                            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                                <Video className="w-3.5 h-3.5 text-white" />
                            </div>
                            Google Meet video conferencing
                        </button>
                    </div>

                    {/* Location */}
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Add location"
                            className="pl-9 bg-[#1a1a24] border-gray-800/50 text-gray-300 placeholder:text-gray-500"
                        />
                    </div>

                    {/* Description */}
                    <div className="relative">
                        <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add description"
                            className="w-full min-h-[100px] pl-9 pr-3 py-2 rounded-md bg-[#1a1a24] border border-gray-800/50 text-sm text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800/50 flex items-center justify-between bg-[#16161f]">
                    <button className="text-sm text-gray-400 hover:text-white transition-colors">
                        More options
                    </button>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
                        Add Event
                    </Button>
                </div>
            </div>
        </>
    )
}
