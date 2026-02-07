import { useState, useEffect } from 'react'
import { CalendarEventType } from './CalendarView'
import { X, Calendar as CalendarIcon, MapPin, AlignLeft, Users, RefreshCw, Building, Monitor, CheckCircle2, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CustomCheckbox } from './CalendarHeader'
import { DueDatePicker } from '../tasks/components/DueDatePicker'

interface CalendarEventPanelProps {
    isOpen: boolean
    onClose: () => void
    defaultType?: CalendarEventType
}

export function CalendarEventPanel({ isOpen, onClose, defaultType = CalendarEventType.EVENT }: CalendarEventPanelProps) {
    const [title, setTitle] = useState('')
    const [selectedType, setSelectedType] = useState<CalendarEventType>(defaultType)
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [isAllDay, setIsAllDay] = useState(false)
    const [description, setDescription] = useState('')
    const [location, setLocation] = useState('')
    const [calendarId, setCalendarId] = useState('work')

    useEffect(() => {
        if (isOpen) {
            setSelectedType(defaultType)
            // Initialize with current date/time if needed
            const now = new Date()
            setStartDate(now.toISOString())
            const end = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour
            setEndDate(end.toISOString())
        }
    }, [isOpen, defaultType])

    if (!isOpen) return null

    const getTypeIcon = (type: CalendarEventType) => {
        switch (type) {
            case CalendarEventType.EVENT: return <CalendarIcon className="w-5 h-5 text-amber-500" />
            case CalendarEventType.TASK: return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            case CalendarEventType.REMINDER: return <Bell className="w-5 h-5 text-blue-500" />
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#14141b] rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            {getTypeIcon(selectedType)}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                {selectedType === CalendarEventType.EVENT ? 'Add New Event' :
                                    selectedType === CalendarEventType.TASK ? 'Add New Task' : 'Add Reminder'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {selectedType === CalendarEventType.EVENT ? 'Schedule a new event' :
                                    selectedType === CalendarEventType.TASK ? 'Create a new task' : 'Set a reminder'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs for Type Selection */}
                <div className="px-6  bg-[#14141b]">
                    <div className="flex gap-4">
                        {[CalendarEventType.EVENT, CalendarEventType.TASK, CalendarEventType.REMINDER].map((type) => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={cn(
                                    "py-3 text-sm font-medium border-b-2 transition-colors relative",
                                    selectedType === type
                                        ? "border-amber-500 text-white"
                                        : "border-transparent text-gray-400 hover:text-white hover:border-gray-700"
                                )}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={selectedType === CalendarEventType.EVENT ? "e.g., Team Sync" : "e.g., Complete Report"}
                            className="w-full px-4 py-3 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all font-medium"
                            autoFocus
                        />
                    </div>

                    {/* Date & Time Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-300">
                                Date & Time
                            </label>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                <CustomCheckbox checked={isAllDay} />
                                <span className="text-sm text-gray-400">All Day</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Start Date */}
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 ml-1 font-medium uppercase">Start</span>
                                <DueDatePicker
                                    value={startDate}
                                    onChange={(date) => setStartDate(date || '')}
                                    placeholder="Start date"
                                    showTime={!isAllDay}
                                    className="w-full"
                                    triggerClassName="bg-[#1a1a24] text-white hover:bg-[#1a1a24] hover:text-white border-none rounded-xl px-4 py-3 h-auto"
                                />
                            </div>

                            {/* End Date */}
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 ml-1 font-medium uppercase">Ends</span>
                                <DueDatePicker
                                    value={endDate}
                                    onChange={(date) => setEndDate(date || '')}
                                    placeholder="End date"
                                    showTime={!isAllDay}
                                    className="w-full"
                                    triggerClassName="bg-[#1a1a24] text-white hover:bg-[#1a1a24] hover:text-white border-none rounded-xl px-4 py-3 h-auto"
                                />
                            </div>
                        </div>

                        {/* Recurrence */}
                        <Select>
                            <SelectTrigger className="w-full h-auto px-4 py-3 rounded-xl bg-[#1a1a24] border-none text-white focus:ring-2 focus:ring-amber-500/30 transition-all data-[placeholder]:text-gray-500 justify-start">
                                <RefreshCw className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="text-sm">Does not repeat</span>
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a24] border-gray-800 text-white">
                                <SelectItem value="none">Does not repeat</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Guests & Calendar */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Guests
                            </label>
                            <Select>
                                <SelectTrigger className="w-full h-auto px-4 py-3 rounded-xl bg-[#1a1a24] border-none text-white focus:ring-2 focus:ring-amber-500/30 transition-all">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Users className="w-4 h-4 text-gray-500 shrink-0" />
                                        <span className="truncate">Add guests</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-gray-800 text-white">
                                    <SelectItem value="guest1">Guest 1</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Calendar
                            </label>
                            <Select value={calendarId} onValueChange={setCalendarId}>
                                <SelectTrigger className="w-full h-auto px-4 py-3 rounded-xl bg-[#1a1a24] border-none text-white focus:ring-2 focus:ring-amber-500/30 transition-all">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`w-3 h-3 rounded-full shrink-0 ${calendarId === 'work' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                        <span className="truncate">{calendarId === 'work' ? 'Work' : 'Personal'}</span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] text-white">
                                    <SelectItem value="work">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" />Work</div>
                                    </SelectItem>
                                    <SelectItem value="personal">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" />Personal</div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Location
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Add location"
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 flex items-start justify-center">
                                <AlignLeft className="w-5 h-5" />
                            </div>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add description"
                                rows={3}
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all resize-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Meeting Type Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:bg-[#20202b] hover:border-gray-700 transition-all text-sm font-medium">
                            <Building className="w-4 h-4 text-gray-500" />
                            Meeting Room
                        </button>
                        <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:bg-[#20202b] hover:border-gray-700 transition-all text-sm font-medium">
                            <Monitor className="w-4 h-4 text-gray-500" />
                            Virtual
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 flex gap-3 bg-[#12121a] rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-800 text-gray-300 font-medium hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold transition-all shadow-lg shadow-amber-500/20"
                    >
                        {selectedType === CalendarEventType.EVENT ? 'Add Event' :
                            selectedType === CalendarEventType.TASK ? 'Add Task' : 'Set Reminder'}
                    </button>
                </div>
            </div>
        </>
    )
}
