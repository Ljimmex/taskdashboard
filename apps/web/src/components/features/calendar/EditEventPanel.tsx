import { useState, useEffect, useRef } from 'react'
import { CalendarEventType } from './CalendarView'
import { X, MapPin, Building, Monitor, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CustomCheckbox } from './CalendarHeader'
import { DueDatePicker } from '../tasks/components/DueDatePicker'
import { apiFetchJson, apiFetch } from '@/lib/api'
import { CheckCircle2 } from 'lucide-react'
import type { CalendarEvent } from './DayEventListPanel'

interface EditEventPanelProps {
    event: CalendarEvent | null
    isOpen: boolean
    onClose: () => void
    workspaceSlug?: string
    onUpdated?: () => void
}

export function EditEventPanel({ event, isOpen, onClose, workspaceSlug, onUpdated }: EditEventPanelProps) {
    const [loading, setLoading] = useState(false)

    // Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isAllDay, setIsAllDay] = useState(false)
    const [location, setLocation] = useState('')
    const [meetingLink, setMeetingLink] = useState('')
    const [meetingType, setMeetingType] = useState<'physical' | 'virtual'>('physical')
    const [teamIds, setTeamIds] = useState<string[]>([])
    const [teams, setTeams] = useState<{ id: string, name: string, color?: string }[]>([])

    const titleInputRef = useRef<HTMLInputElement>(null)

    // Pre-fill form when event changes
    useEffect(() => {
        if (event && isOpen) {
            setTitle(event.title || '')
            setDescription(event.description || '')
            setStartDate(event.startAt || '')
            setEndDate(event.endAt || '')
            setIsAllDay(event.isAllDay || false)
            setLocation(event.location || '')
            setMeetingLink(event.meetingLink || '')
            setMeetingType(event.meetingType || (event.meetingLink ? 'virtual' : 'physical'))
            setTeamIds(event.teamIds || [])

            setTimeout(() => titleInputRef.current?.focus(), 100)
        }
    }, [event, isOpen])

    // Fetch teams
    useEffect(() => {
        if (!isOpen || !workspaceSlug) return
        const fetchTeams = async () => {
            try {
                const res = await apiFetchJson<any>(`/api/teams?workspaceSlug=${workspaceSlug}`)
                if (res.data) {
                    setTeams(res.data.map((t: any) => ({ id: t.id, name: t.name, color: t.color })))
                }
            } catch (err) {
                console.error('Failed to fetch teams:', err)
            }
        }
        fetchTeams()
    }, [isOpen, workspaceSlug])

    const handleSave = async () => {
        if (!event || !title.trim()) return
        if (teamIds.length === 0) {
            alert('Please select at least one team')
            return
        }

        setLoading(true)
        try {
            const payload: Record<string, any> = {
                title: title.trim(),
                description: description.trim(),
                startAt: startDate,
                endAt: endDate,
                teamIds,
                meetingLink: meetingLink.trim(),
            }

            const res = await apiFetch(`/api/calendar/${event.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error('Failed to update event')

            onUpdated?.()
            onClose()
        } catch (error) {
            console.error('Error updating event:', error)
            alert('Failed to update event')
        } finally {
            setLoading(false)
        }
    }

    if (!event || !isOpen) return null

    const eventType = event.type || CalendarEventType.EVENT

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-4 right-4 bottom-4 w-full max-w-xl bg-[#12121a] rounded-2xl shadow-2xl z-50 flex flex-col animate-slide-in-right border border-gray-800/50">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#14141b] rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            ✏️
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Edit Event</h2>
                            <p className="text-sm text-gray-500">Update event details</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {/* Title */}
                    <div>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Event title..."
                            className="w-full text-xl font-semibold text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:border-amber-500/50 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add description..."
                            rows={3}
                            className="w-full text-sm text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:border-amber-500/50 transition-colors resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-300">
                                Date & Time
                            </label>
                            {eventType === CalendarEventType.EVENT && (
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                    <CustomCheckbox checked={isAllDay} />
                                    <span className="text-sm text-gray-400">All Day</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 font-bold uppercase ml-1">Starts</span>
                                <DueDatePicker
                                    value={startDate}
                                    onChange={(date) => {
                                        setStartDate(date || '')
                                        if (date && (!endDate || new Date(date) > new Date(endDate))) {
                                            const newStart = new Date(date)
                                            setEndDate(new Date(newStart.getTime() + 60 * 60 * 1000).toISOString())
                                        }
                                    }}
                                    placeholder="Start date"
                                    showTime={!isAllDay && eventType === CalendarEventType.EVENT}
                                    className="w-full"
                                    triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                />
                            </div>

                            {eventType !== CalendarEventType.REMINDER && (
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500 font-bold uppercase ml-1">Ends</span>
                                    <DueDatePicker
                                        value={endDate}
                                        onChange={(date) => setEndDate(date || '')}
                                        placeholder="End date"
                                        showTime={!isAllDay}
                                        className="w-full"
                                        triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Team Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Teams <span className="text-red-400">*</span>
                        </label>
                        <div className="relative group">
                            <div className={cn(
                                "w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#1a1a24] text-white cursor-pointer flex flex-wrap gap-2 items-center transition-all border border-transparent ring-0 outline-none focus-within:border-amber-500/30",
                                teamIds.length === 0 && "text-gray-500"
                            )}>
                                <Select value="" onValueChange={(val) => {
                                    if (!teamIds.includes(val)) {
                                        setTeamIds([...teamIds, val])
                                    }
                                }}>
                                    <SelectTrigger className="w-full h-full border-none bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus:outline-none shadow-none text-sm font-normal">
                                        <div className="flex flex-wrap gap-2 w-full">
                                            {teamIds.length > 0 ? (
                                                teamIds.map(id => {
                                                    const team = teams.find(t => t.id === id)
                                                    if (!team) return null
                                                    return (
                                                        <div key={id} onPointerDown={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setTeamIds(teamIds.filter(t => t !== id))
                                                        }} className="flex items-center gap-1 bg-[#2a2b36] pl-2 pr-1 py-1 rounded-lg text-xs font-medium text-gray-200 border border-gray-700/50 group/tag transition-colors z-50 relative cursor-pointer">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: team.color || '#666' }} />
                                                            {team.name}
                                                            <X size={12} className="ml-1 text-gray-500 group-hover/tag:text-red-400 transition-colors" />
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <span className="text-gray-500 py-1">Select teams...</span>
                                            )}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a24] border-gray-800 text-white">
                                        {teams.map((team) => (
                                            <SelectItem
                                                key={team.id}
                                                value={team.id}
                                                className={cn(
                                                    "focus:bg-gray-800 focus:text-white cursor-pointer py-3 text-gray-300 data-[state=checked]:text-white",
                                                    teamIds.includes(team.id) && "opacity-50 pointer-events-none"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {team.color && (
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                                                    )}
                                                    {team.name}
                                                    {teamIds.includes(team.id) && <CheckCircle2 className="w-3 h-3 text-amber-500 ml-auto" />}
                                                </div>
                                            </SelectItem>
                                        ))}
                                        {teams.length === 0 && (
                                            <div className="p-3 text-xs text-gray-500 text-center">No teams found</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Meeting Type & Location */}
                    {(eventType === CalendarEventType.EVENT || eventType === CalendarEventType.MEETING) && (
                        <div className="space-y-4">
                            <div className="flex bg-[#1a1a24] p-1 rounded-full w-full">
                                <button
                                    onClick={() => {
                                        setMeetingType('physical')
                                        setMeetingLink('')
                                    }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                        meetingType === 'physical'
                                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                            : 'text-gray-500 hover:text-white'
                                    )}
                                >
                                    <Building className="w-3.5 h-3.5" />
                                    In Person
                                </button>
                                <button
                                    onClick={() => {
                                        setMeetingType('virtual')
                                        setLocation('')
                                    }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                        meetingType === 'virtual'
                                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                            : 'text-gray-500 hover:text-white'
                                    )}
                                >
                                    <Monitor className="w-3.5 h-3.5" />
                                    Virtual
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {meetingType === 'physical' ? 'Location' : 'Meeting Link'}
                                </label>
                                <div className="relative group focus-within:ring-2 ring-amber-500/30 rounded-xl transition-all">
                                    {meetingType === 'physical' ? (
                                        <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                    ) : (
                                        <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
                                    )}
                                    <input
                                        type="text"
                                        value={meetingType === 'physical' ? location : meetingLink}
                                        onChange={(e) => meetingType === 'physical' ? setLocation(e.target.value) : setMeetingLink(e.target.value)}
                                        placeholder={meetingType === 'physical' ? "Add location address..." : "Add meeting URL (e.g. Zoom, Meet)..."}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 focus:outline-none focus:bg-[#1f1f2e] transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
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
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </>
    )
}
