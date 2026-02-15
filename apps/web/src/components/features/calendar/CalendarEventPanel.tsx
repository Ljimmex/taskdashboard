import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarEventType } from './CalendarView'
import { X, Calendar as CalendarIcon, MapPin, Building, Monitor, CheckCircle2, Bell, Link as LinkIcon, RotateCw, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CustomCheckbox } from './CalendarHeader'
import { DueDatePicker } from '../tasks/components/DueDatePicker'
import { useSession } from '@/lib/auth'
import { apiFetchJson, apiFetch } from '@/lib/api'

import { LabelPicker } from '../labels/LabelPicker'
import type { Label } from '../labels/LabelBadge'
import { PrioritySelector } from '../tasks/components/PrioritySelector'
import { StatusSelector, type ProjectStage } from '../tasks/components/StatusBadge'
import { AssigneePicker, type Assignee } from '../tasks/components/AssigneePicker'
import {
    SubtaskCheckboxIcon,
} from '../tasks/components/TaskIcons'
import { useTranslation } from 'react-i18next'

interface CalendarEventPanelProps {
    isOpen: boolean
    onClose: () => void
    defaultType?: CalendarEventType
    workspaceSlug?: string
    onCreate?: () => void | Promise<void>
    initialDate?: Date
    canCreateEvents?: boolean
}



export function CalendarEventPanel({ isOpen, onClose, defaultType = CalendarEventType.EVENT, workspaceSlug, onCreate, initialDate, canCreateEvents = true }: CalendarEventPanelProps) {
// Default labels
const DEFAULT_LABELS = [
    { id: 'bug', name: 'Bug', color: '#ef4444' },
    { id: 'feature', name: 'Feature', color: '#10b981' },
    { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
    { id: 'backend', name: 'Backend', color: '#8b5cf6' },
    { id: 'design', name: 'Design', color: '#ec4899' },
    { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
]

export function CalendarEventPanel({ isOpen, onClose, defaultType = CalendarEventType.EVENT, workspaceSlug, onCreate, initialDate }: CalendarEventPanelProps) {
    const { t } = useTranslation()
    // Common State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [meetingLink, setMeetingLink] = useState('')
    const [selectedType, setSelectedType] = useState<CalendarEventType>(defaultType)
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)

    // Event/Reminder State
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [isAllDay, setIsAllDay] = useState(false)
    const [location, setLocation] = useState('')
    const [teamIds, setTeamIds] = useState<string[]>([])
    const [meetingType, setMeetingType] = useState<'physical' | 'virtual'>('physical')
    const [recurrence, setRecurrence] = useState<string>('none')
    const [recurrenceEnd, setRecurrenceEnd] = useState<string>('')


    // Scope State
    const [scope, setScope] = useState<'team' | 'personal'>('team')
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])

    // Data State
    const [teams, setTeams] = useState<{ id: string, name: string, color?: string }[]>([])
    const [teamMembers, setTeamMembers] = useState<{ id: string, name: string, avatar?: string }[]>([])

    const titleInputRef = useRef<HTMLInputElement>(null)
    const canCreateCalendarEvents = canCreateEvents
    const isCalendarEventType = selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.MEETING

    // Filter type options
    const typeOptions = canCreateCalendarEvents
        ? [CalendarEventType.EVENT, CalendarEventType.MEETING, CalendarEventType.REMINDER]
        : [CalendarEventType.REMINDER]

    // Reset Form
    const resetForm = () => {
        setTitle('')
        setDescription('')
        const baseDate = initialDate || new Date()
        setStartDate(baseDate.toISOString())
        setEndDate(new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString())
        setIsAllDay(false)
        setLocation('')
        setMeetingType('physical')
        setRecurrence('none')
        setRecurrenceEnd('')
        setScope(canCreateCalendarEvents ? 'team' : 'personal')
        setSelectedMembers([])
    }

    // Initialize & Fetch Data
    useEffect(() => {
        if (isOpen) {
            setSelectedType(canCreateCalendarEvents ? defaultType : CalendarEventType.REMINDER)
            setScope(canCreateCalendarEvents ? 'team' : 'personal')

            if (!canCreateCalendarEvents && session?.user?.id) {
                setSelectedMembers([session.user.id])
            }

            const baseDate = initialDate || new Date()
            if (!startDate) setStartDate(baseDate.toISOString())
            if (!endDate) setEndDate(new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString())

            // Focus title
            setTimeout(() => titleInputRef.current?.focus(), 100)

            const fetchData = async () => {
                if (!workspaceSlug) return

                try {
                    // Fetch Teams
                    const teamsRes = await apiFetchJson<any>(`/api/teams?workspaceSlug=${workspaceSlug}`, {
                        headers: { 'x-user-id': session?.user?.id || '' }
                    })
                    if (teamsRes.data) {
                        setTeams(teamsRes.data)
                        // If no teams selected yet, select first one
                        if (teamsRes.data.length > 0 && teamIds.length === 0) setTeamIds([teamsRes.data[0].id])
                    }

                    // Fetch Members (for Assignees/Guests)
                    const membersRes = await apiFetchJson<any>(`/api/workspaces/${workspaceSlug}/members`, {
                        headers: { 'x-user-id': session?.user?.id || '' }
                    })
                    if (membersRes.data) {
                        const members = membersRes.data.map((m: any) => ({
                            id: m.user?.id || m.id || m.userId,
                            name: m.user?.name || m.name || m.userName,
                            avatar: m.user?.image || m.image || m.userImage
                        })).filter((m: any) => m.id)
                        setTeamMembers(members)
                    }

                } catch (e) {
                    console.error("Failed to fetch calendar data", e)
                }
            }
            fetchData()
        }
    }, [isOpen, defaultType, workspaceSlug, session?.user?.id, canCreateCalendarEvents, initialDate, startDate, endDate])


    // Handle Create
    const handleCreate = async () => {
        if (!title.trim()) return

        // Scope validation
        if (scope === 'team' && teamIds.length === 0) {
            alert(t('calendar.panels.common.alerts.select_team'))
            return
        }
        if (scope === 'personal' && selectedMembers.length === 0) {
            alert(t('calendar.panels.common.alerts.select_member'))
            return
        }

        setLoading(true)
        try {
            // Create Event or Reminder
            let assigneeIds: string[] = []

            if (scope === 'team') {
                const selectedTeamsData = teams.filter(t => teamIds.includes(t.id))
                const memberIds = new Set<string>()
                selectedTeamsData.forEach((team: any) => {
                    if (team.members) {
                        team.members.forEach((m: any) => memberIds.add(m.userId))
                    }
                })
                assigneeIds = Array.from(memberIds)
            } else {
                assigneeIds = selectedMembers
            }

            const payload = {
                teamIds: scope === 'team' ? teamIds : [], // Send array of teamIds
                title: title.trim(),
                description: description.trim(),
                type: selectedType, // 'event' or 'reminder'
                startAt: startDate,
                endAt: selectedType === CalendarEventType.REMINDER ? startDate : endDate, // Reminders are point-in-time
                location: location,
                recurrence: recurrence !== 'none' ? {
                    frequency: recurrence === 'biweekly' || recurrence === 'quarterly'
                        ? (recurrence === 'biweekly' ? 'weekly' : 'monthly')
                        : recurrence,
                    interval: recurrence === 'biweekly' ? 2 : recurrence === 'quarterly' ? 3 : 1,
                    until: recurrenceEnd || undefined
                } : null,

                // Add meeting link if present
                meetingLink: meetingLink.trim(),

                meetingType: (selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.MEETING) ? meetingType : undefined,
                isAllDay,
                assignees: assigneeIds.map(id => ({ id })),
                assigneeIds: assigneeIds,
                workspaceSlug
            }


            const res = await apiFetch('/api/calendar', {
                method: 'POST',
                headers: { 'x-user-id': session?.user?.id || '' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to create event')

            if (onCreate) await onCreate()
            onClose()
            resetForm()
        } catch (error) {
            console.error('Failed to create event:', error)
            alert('Failed to create event')
        } finally {
            setLoading(false)
        }
    }





    if (!isOpen) return null

    const getTypeIcon = (type: CalendarEventType) => {
        switch (type) {
            case CalendarEventType.EVENT: return <CalendarIcon className="w-5 h-5 text-amber-500" />
            case CalendarEventType.REMINDER: return <Bell className="w-5 h-5 text-blue-500" />
            default: return <CalendarIcon className="w-5 h-5" />
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
            <div className="fixed top-4 right-4 bottom-4 w-full max-w-xl bg-[#12121a] rounded-2xl shadow-2xl z-50 flex flex-col animate-slide-in-right border border-gray-800/50">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#14141b] rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            {getTypeIcon(selectedType)}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                {selectedType === CalendarEventType.EVENT ? t('calendar.panels.add_event.title_event') : t('calendar.panels.add_event.title_reminder')}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {selectedType === CalendarEventType.EVENT ? t('calendar.panels.add_event.subtitle_event') : t('calendar.panels.add_event.subtitle_reminder')}
                                {selectedType === CalendarEventType.EVENT ? t('calendar.panels.add_event_title') :
                                    selectedType === CalendarEventType.TASK ? t('calendar.panels.add_task_title') : t('calendar.panels.add_reminder_title')}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {selectedType === CalendarEventType.EVENT ? t('calendar.panels.add_event_subtitle') :
                                    selectedType === CalendarEventType.TASK ? t('calendar.panels.add_task_subtitle') : t('calendar.panels.add_reminder_subtitle')}
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
                <div className="px-6 bg-[#14141b]">
                    <div className="flex gap-4">
                        {typeOptions.map((type) => (
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
                                {type === CalendarEventType.EVENT ? t('calendar.panels.types.event') :
                                    type === CalendarEventType.MEETING ? t('calendar.panels.types.meeting') : t('calendar.panels.types.reminder')}
                                    type === CalendarEventType.MEETING ? t('calendar.panels.types.meeting') :
                                        type === CalendarEventType.TASK ? t('calendar.panels.types.task') : t('calendar.panels.types.reminder')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {/* Title Input - Common */}
                    <div>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={selectedType === CalendarEventType.REMINDER ? t('calendar.panels.common.title_placeholder_reminder') : t('calendar.panels.common.title_placeholder_event')}
                            placeholder={selectedType === CalendarEventType.TASK ? t('calendar.panels.title_placeholder_task') : t('calendar.panels.title_placeholder_event')}
                            className="w-full text-xl font-semibold text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:border-amber-500/50 transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Description - Common */}
                    <div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('calendar.panels.common.desc_placeholder')}
                            placeholder={t('calendar.panels.description_placeholder')}
                            rows={3}
                            className="w-full text-sm text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:border-amber-500/50 transition-colors resize-none"
                        />
                    </div>

                    {/* Scope Switch */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-300">
                            {t('calendar.scope.label')}
                        </label>
                        <div className="flex bg-[#1a1a24] p-1 rounded-full w-full">
                    {/* ==================== TASK FORM ==================== */}
                    {selectedType === CalendarEventType.TASK && (
                        <div className="space-y-6">
                            {/* Properties Row */}
                            <div className="flex flex-wrap items-center gap-3 pb-6 border-b border-gray-800">
                                {/* Project Selector */}
                                <Select value={projectId} onValueChange={setProjectId}>
                                    <SelectTrigger className="h-9 px-3 rounded-lg bg-[#2a2b36] border-none text-xs font-medium text-gray-300 hover:text-white hover:bg-[#32333e] transition-colors focus:ring-0 w-auto min-w-[140px]">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen size={14} className="text-gray-400" />
                                            <span className="truncate max-w-[120px]">
                                                {projects.find(p => p.id === projectId)?.name || t('calendar.panels.select_project')}
                                            </span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a24] border-gray-800 text-white">
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white">
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <StatusSelector
                                    value={status}
                                    stages={currentStages}
                                    onChange={setStatus}
                                />

                                <PrioritySelector
                                    value={priority}
                                    onChange={setPriority}
                                    size="sm"
                                />

                                <div className="min-w-[120px]">
                                    <AssigneePicker
                                        selectedAssignees={assignees}
                                        availableAssignees={teamMembers}
                                        onSelect={setAssignees}
                                        maxVisible={2}
                                    />
                                </div>
                            </div>

                            {/* Dates Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.panels.start_date')}</span>
                                    <DueDatePicker
                                        value={taskStartDate}
                                        onChange={(d) => setTaskStartDate(d || '')}
                                        placeholder={t('calendar.panels.start_date')}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.panels.due_date')}</span>
                                    <DueDatePicker
                                        value={dueDate}
                                        onChange={(d) => setDueDate(d || '')}
                                        placeholder={t('calendar.panels.due_date')}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* Labels */}
                            <div>
                                <LabelPicker
                                    selectedLabels={labels}
                                    availableLabels={availableLabels}
                                    onSelect={setLabels}
                                    onCreateNew={handleCreateLabel}
                                />
                            </div>

                            {/* Subtasks Toggle */}
                            <button
                                onClick={() => setScope('team')}
                                disabled={!canCreateCalendarEvents}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                    scope === 'team'
                                        ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                        : 'text-gray-500 hover:text-white',
                                    !canCreateCalendarEvents && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Building className="w-3.5 h-3.5" />
                                {t('calendar.scope.team')}
                            </button>
                            <button
                                onClick={() => setScope('personal')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                    scope === 'personal'
                                        ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                        : 'text-gray-500 hover:text-white'
                                )}
                            >
                                <User className="w-3.5 h-3.5" />
                                {t('calendar.scope.personal')}
                            </button>
                        </div>
                    </div>

                    {/* Team or Member Selection */}
                    {scope === 'team' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                {t('calendar.fields.teams')} <span className="text-red-400">*</span>
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
                                                    <span className="text-gray-500 py-1">{t('calendar.placeholders.select_teams')}</span>
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
                                                <div className="p-3 text-xs text-gray-500 text-center">{t('calendar.placeholders.no_teams_found')}</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                <SubtaskCheckboxIcon />
                                {showMore ? t('calendar.panels.hide_subtasks') : t('calendar.panels.add_subtasks')}
                            </button>

                            {/* Subtasks Section */}
                            {showMore && (
                                <div className="space-y-3 bg-[#1a1a24]/50 p-4 rounded-xl border border-gray-800/50">
                                    {subtasks.map((subtask, index) => (
                                        <div key={index} className="flex items-center gap-3 bg-[#12121a] p-3 rounded-lg border border-gray-800/50">
                                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                                            <span className="text-sm text-gray-300 flex-1">{subtask.title}</span>
                                            <button onClick={() => removeSubtask(index)} className="text-gray-500 hover:text-red-400">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newSubtask}
                                            onChange={(e) => setNewSubtask(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                                            placeholder={t('calendar.panels.add_subtask_placeholder')}
                                            className="flex-1 px-3 py-2 bg-[#12121a] rounded-lg text-sm text-white border border-gray-800/50 focus:border-amber-500/50 outline-none"
                                        />
                                        <button onClick={addSubtask} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-xs">{t('calendar.panels.add_btn')}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== EVENT / REMINDER / MEETING FORM ==================== */}
                    {(selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.REMINDER || selectedType === CalendarEventType.MEETING) && (
                        <div className="space-y-6">
                            {/* Date & Time */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-300">
                                        Date & Time
                                    </label>
                                    {selectedType === CalendarEventType.EVENT && (
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                            <CustomCheckbox checked={isAllDay} />
                                            <span className="text-sm text-gray-400">{t('calendar.panels.all_day')}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.panels.starts')}</span>
                                        <DueDatePicker
                                            value={startDate}
                                            onChange={(date) => {
                                                setStartDate(date || '')
                                                // Auto update end date if explicit
                                                if (date && (!endDate || new Date(date) > new Date(endDate))) {
                                                    const newStart = new Date(date)
                                                    setEndDate(new Date(newStart.getTime() + 60 * 60 * 1000).toISOString())
                                                }
                                            }}
                                            placeholder={t('calendar.panels.starts')}
                                            showTime={!isAllDay && selectedType === CalendarEventType.EVENT}
                                            className="w-full"
                                            triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                        />
                                    </div>

                                    {selectedType === CalendarEventType.EVENT && (
                                        <div className="space-y-1">
                                            <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.panels.ends')}</span>
                                            <DueDatePicker
                                                value={endDate}
                                                onChange={(date) => setEndDate(date || '')}
                                                placeholder={t('calendar.panels.ends')}
                                                showTime={!isAllDay}
                                                className="w-full"
                                                triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                            />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">
                                    {t('calendar.hints.team_selection')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                {t('calendar.fields.members')} <span className="text-red-400">*</span>
                            </label>
                            {!canCreateCalendarEvents ? (
                                <div className="w-full px-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 border border-transparent flex items-center gap-2">
                                    {session?.user?.image && <img src={session.user.image} className="w-6 h-6 rounded-full" />}
                                    <span className="text-sm font-medium">{session?.user?.name || 'Me'}</span>
                                </div>
                            ) : (

                            {/* Recurrence Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {t('calendar.panels.repeat')}
                                </label>
                                <Select value={recurrence} onValueChange={(val) => { console.log('Selected recurrence:', val); setRecurrence(val) }}>
                                    <SelectTrigger className="w-full h-11 px-4 rounded-xl bg-[#1a1a24] border-none text-gray-300 hover:text-white hover:bg-[#20202b] transition-colors focus:ring-0">
                                        <div className="flex items-center gap-3">
                                            <RotateCw size={18} className="text-gray-500" />
                                            <span>
                                                {recurrence === 'none' ? t('calendar.panels.recurrence.none') :
                                                    recurrence === 'daily' ? t('calendar.panels.recurrence.daily') :
                                                        recurrence === 'weekly' ? t('calendar.panels.recurrence.weekly') :
                                                            recurrence === 'biweekly' ? t('calendar.panels.recurrence.biweekly') :
                                                                recurrence === 'monthly' ? t('calendar.panels.recurrence.monthly') :
                                                                    recurrence === 'quarterly' ? t('calendar.panels.recurrence.quarterly') :
                                                                        recurrence === 'yearly' ? t('calendar.panels.recurrence.yearly') : t('calendar.panels.recurrence.custom')}
                                            </span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a24] border-gray-800 text-white">
                                        <SelectItem value="none" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.none')}</SelectItem>
                                        <SelectItem value="daily" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.daily')}</SelectItem>
                                        <SelectItem value="weekly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.weekly')}</SelectItem>
                                        <SelectItem value="biweekly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.biweekly')}</SelectItem>
                                        <SelectItem value="monthly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.monthly')}</SelectItem>
                                        <SelectItem value="quarterly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.quarterly')}</SelectItem>
                                        <SelectItem value="yearly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.yearly')}</SelectItem>
                                        <SelectItem value="custom" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.panels.recurrence.custom')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Recurrence End Date (Until) */}
                            {recurrence !== 'none' && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.panels.until')}</span>
                                    <DueDatePicker
                                        value={recurrenceEnd}
                                        onChange={(date) => setRecurrenceEnd(date || '')}
                                        placeholder={t('calendar.panels.until')}
                                        className="w-full"
                                        triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                    />
                                </div>
                            )}

                            {/* Team Selection (Multi-select) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {t('calendar.panels.teams_label')} <span className="text-red-400">*</span>
                                </label>
                                <div className="relative group">
                                    <div className={cn(
                                        "w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#1a1a24] text-white cursor-pointer flex flex-wrap gap-2 items-center transition-all border border-transparent ring-0 outline-none focus-within:border-amber-500/30",
                                        selectedMembers.length === 0 && "text-gray-500"
                                    )}>
                                        <Select value="" onValueChange={(val) => {
                                            if (!selectedMembers.includes(val)) {
                                                setSelectedMembers([...selectedMembers, val])
                                            }
                                        }}>
                                            <SelectTrigger className="w-full h-full border-none bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 focus:outline-none shadow-none text-sm font-normal">
                                                <div className="flex flex-wrap gap-2 w-full">
                                                    {selectedMembers.length > 0 ? (
                                                        selectedMembers.map(id => {
                                                            const member = teamMembers.find(m => m.id === id)
                                                            if (!member) return null
                                                            return (
                                                                <div key={id} onPointerDown={(e) => {
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                    setSelectedMembers(selectedMembers.filter(m => m !== id))
                                                                }} className="flex items-center gap-1 bg-[#2a2b36] pl-2 pr-1 py-1 rounded-lg text-xs font-medium text-gray-200 border border-gray-700/50 group/tag transition-colors z-50 relative cursor-pointer">
                                                                    {member.avatar && <img src={member.avatar} className="w-4 h-4 rounded-full" />}
                                                                    {member.name}
                                                                    <X size={12} className="ml-1 text-gray-500 group-hover/tag:text-red-400 transition-colors" />
                                                                </div>
                                                            )
                                                        })
                                                    ) : (
                                                        <span className="text-gray-500 py-1">{t('calendar.placeholders.select_members')}</span>
                                                        <span className="text-gray-500 py-1">{t('settings.organization.edit_panel.select_teams')}</span>
                                                    )}
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1a1a24] border-gray-800 text-white max-h-[200px]">
                                                {teamMembers.map((member) => (
                                                    <SelectItem
                                                        key={member.id}
                                                        value={member.id}
                                                        className={cn(
                                                            "focus:bg-gray-800 focus:text-white cursor-pointer py-3 text-gray-300 data-[state=checked]:text-white",
                                                            selectedMembers.includes(member.id) && "opacity-50 pointer-events-none"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {member.avatar && <img src={member.avatar} className="w-5 h-5 rounded-full" />}
                                                            {member.name}
                                                            {selectedMembers.includes(member.id) && <CheckCircle2 className="w-3 h-3 text-amber-500 ml-auto" />}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                                {teamMembers.length === 0 && (
                                                    <div className="p-3 text-xs text-gray-500 text-center">{t('calendar.placeholders.no_members_found')}</div>
                                                {teams.length === 0 && (
                                                    <div className="p-3 text-xs text-gray-500 text-center">{t('settings.organization.edit_panel.no_teams_found')}</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1.5 ml-1">
                                        {t('calendar.panels.teams_help')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date & Time */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-300">
                                {t('calendar.fields.date_time')}
                            </label>
                            {selectedType === CalendarEventType.EVENT && (
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                    <CustomCheckbox checked={isAllDay} />
                                    <span className="text-sm text-gray-400">{t('calendar.fields.all_day')}</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.fields.starts')}</span>
                                <DueDatePicker
                                    value={startDate}
                                    onChange={(date) => {
                                        setStartDate(date || '')
                                        // Auto update end date if explicit
                                        if (date && (!endDate || new Date(date) > new Date(endDate))) {
                                            const newStart = new Date(date)
                                            setEndDate(new Date(newStart.getTime() + 60 * 60 * 1000).toISOString())
                                        }
                                    }}
                                    placeholder={t('calendar.placeholders.start_date')}
                                    showTime={!isAllDay && selectedType === CalendarEventType.EVENT}
                                    className="w-full"
                                    triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                />
                            </div>

                            {selectedType === CalendarEventType.EVENT && (
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.fields.ends')}</span>
                                    <DueDatePicker
                                        value={endDate}
                                        onChange={(date) => setEndDate(date || '')}
                                        placeholder={t('calendar.placeholders.end_date')}
                                        showTime={!isAllDay}
                                        className="w-full"
                                        triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                    />
                            {/* Meeting Type & Location (Event Only) */}
                            {(selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.MEETING) && (
                                <div className="space-y-4">
                                    <div className="flex bg-[#1a1a24] p-1 rounded-full w-full">
                                        <button
                                        onClick={() => {
                                            setMeetingType('physical')
                                            setLocation('') // Reset location/link when switching
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                            meetingType === 'physical'
                                                ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                                : 'text-gray-500 hover:text-white'
                                        )}
                                    >
                                        <Building className="w-3.5 h-3.5" />
                                        {t('calendar.panels.in_person')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMeetingType('virtual')
                                            setLocation('') // Reset location/link when switching
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                            meetingType === 'virtual'
                                                ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                                : 'text-gray-500 hover:text-white'
                                        )}
                                    >
                                        <Monitor className="w-3.5 h-3.5" />
                                        {t('calendar.panels.virtual')}
                                    </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            {meetingType === 'physical' ? t('calendar.panels.location') : t('calendar.panels.meeting_link')}
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
                                                placeholder={meetingType === 'physical' ? t('calendar.panels.location_placeholder') : t('calendar.panels.meeting_link_placeholder')}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1a1a24] text-white placeholder-gray-500 focus:outline-none focus:bg-[#1f1f2e] transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recurrence Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('calendar.fields.repeat')}
                        </label>
                        <Select value={recurrence} onValueChange={(val) => { setRecurrence(val) }}>
                            <SelectTrigger className="w-full h-11 px-4 rounded-xl bg-[#1a1a24] border-none text-gray-300 hover:text-white hover:bg-[#20202b] transition-colors focus:ring-0">
                                <div className="flex items-center gap-3">
                                    <RotateCw size={18} className="text-gray-500" />
                                    <span>
                                        {recurrence === 'none' ? t('calendar.recurrence.none') :
                                            recurrence === 'daily' ? t('calendar.recurrence.daily') :
                                                recurrence === 'weekly' ? t('calendar.recurrence.weekly') :
                                                    recurrence === 'biweekly' ? t('calendar.recurrence.biweekly') :
                                                        recurrence === 'monthly' ? t('calendar.recurrence.monthly') :
                                                            recurrence === 'quarterly' ? t('calendar.recurrence.quarterly') :
                                                                recurrence === 'yearly' ? t('calendar.recurrence.yearly') : t('calendar.recurrence.custom')}
                                    </span>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a24] border-gray-800 text-white">
                                <SelectItem value="none" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.none')}</SelectItem>
                                <SelectItem value="daily" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.daily')}</SelectItem>
                                <SelectItem value="weekly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.weekly')}</SelectItem>
                                <SelectItem value="biweekly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.biweekly')}</SelectItem>
                                <SelectItem value="monthly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.monthly')}</SelectItem>
                                <SelectItem value="quarterly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.quarterly')}</SelectItem>
                                <SelectItem value="yearly" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.yearly')}</SelectItem>
                                <SelectItem value="custom" className="text-sm cursor-pointer focus:bg-gray-800 text-gray-300 focus:text-white py-2">{t('calendar.recurrence.custom')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Recurrence End Date (Until) */}
                    {recurrence !== 'none' && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            <span className="text-xs text-gray-500 font-bold uppercase ml-1">{t('calendar.fields.until')}</span>
                            <DueDatePicker
                                value={recurrenceEnd}
                                onChange={(date) => setRecurrenceEnd(date || '')}
                                placeholder={t('calendar.recurrence.forever')}
                                className="w-full"
                                triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                            />
                        </div>
                    )}

                    {/* Meeting Type & Location (Event Only) */}
                    {(selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.MEETING) && (
                        <div className="space-y-4">
                            <div className="flex bg-[#1a1a24] p-1 rounded-full w-full">
                                <button
                                    onClick={() => {
                                        setMeetingType('physical')
                                        setLocation('')
                                    }}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                        meetingType === 'physical'
                                            ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                                            : 'text-gray-500 hover:text-white'
                                    )}
                                >
                                    <Building className="w-3.5 h-3.5" />
                                    {t('calendar.actions.in_person')}
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
                                    {t('calendar.actions.virtual')}
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {meetingType === 'physical' ? t('calendar.fields.location') : t('calendar.fields.meeting_link')}
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
                                        placeholder={meetingType === 'physical' ? t('calendar.placeholders.add_location') : t('calendar.placeholders.add_meeting_url')}
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
                        {t('calendar.actions.cancel')}
                        {t('calendar.panels.cancel')}
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading || (isCalendarEventType && !canCreateCalendarEvents)}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                        {loading ? t('calendar.actions.creating') : selectedType === CalendarEventType.EVENT ? t('calendar.actions.add_event') : t('calendar.actions.set_reminder')}
                        {loading ? t('calendar.panels.creating') : selectedType === CalendarEventType.EVENT ? t('calendar.panels.add_event_btn') :
                            selectedType === CalendarEventType.TASK ? t('calendar.panels.add_task_btn') : t('calendar.panels.set_reminder_btn')}
                    </button>
                </div>
            </div>
        </>
    )
}
