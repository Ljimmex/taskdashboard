import { useState, useEffect, useRef } from 'react'
import { CalendarEventType } from './CalendarView'
import { X, Calendar as CalendarIcon, MapPin, Building, Monitor, CheckCircle2, Bell, FolderOpen, Link as LinkIcon } from 'lucide-react'
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

interface CalendarEventPanelProps {
    isOpen: boolean
    onClose: () => void
    defaultType?: CalendarEventType
    workspaceSlug?: string
    onCreate?: () => void | Promise<void>
}

interface Project {
    id: string
    name: string
    stages?: ProjectStage[]
}

// Default labels
const DEFAULT_LABELS = [
    { id: 'bug', name: 'Bug', color: '#ef4444' },
    { id: 'feature', name: 'Feature', color: '#10b981' },
    { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
    { id: 'backend', name: 'Backend', color: '#8b5cf6' },
    { id: 'design', name: 'Design', color: '#ec4899' },
    { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
]

export function CalendarEventPanel({ isOpen, onClose, defaultType = CalendarEventType.EVENT, workspaceSlug, onCreate }: CalendarEventPanelProps) {
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
    // const [recurrence, setRecurrence] = useState('none') // Future implementation

    // Task State
    const [projectId, setProjectId] = useState<string>('')
    const [status, setStatus] = useState('todo')
    const [priority, setPriority] = useState<string>('medium')
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [dueDate, setDueDate] = useState('')
    const [taskStartDate, setTaskStartDate] = useState('')
    const [labels, setLabels] = useState<Label[]>([])
    const [subtasks, setSubtasks] = useState<{ title: string; description: string; status: string; priority: string }[]>([])
    const [newSubtask, setNewSubtask] = useState('')
    const [showMore, setShowMore] = useState(false)
    // const [meetingLink, setMeetingLink] = useState('') // Future implementation

    // Data State
    const [teams, setTeams] = useState<{ id: string, name: string, color?: string }[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [teamMembers, setTeamMembers] = useState<Assignee[]>([])
    const [availableLabels, setAvailableLabels] = useState<Label[]>(DEFAULT_LABELS)
    const [currentStages, setCurrentStages] = useState<ProjectStage[]>([])

    const titleInputRef = useRef<HTMLInputElement>(null)

    // Reset Form
    const resetForm = () => {
        setTitle('')
        setDescription('')
        // selectedType maintained
        const now = new Date()
        setStartDate(now.toISOString())
        setEndDate(new Date(now.getTime() + 60 * 60 * 1000).toISOString())
        setIsAllDay(false)
        setLocation('')
        // teamIds maintained if possible, or reset? Let's keep it if user wants to create multiple
        // setTeamIds([]) 
        setMeetingType('physical')
        // setRecurrence('none')

        // Task resets
        // projectId maintained
        setStatus('todo')
        setPriority('medium')
        setAssignees([])
        setDueDate('')
        setTaskStartDate('')
        setLabels([])
        setSubtasks([])
        setNewSubtask('')
        setShowMore(false)
        // setMeetingLink('')
    }

    // Initialize & Fetch Data
    useEffect(() => {
        if (isOpen) {
            setSelectedType(defaultType)
            const now = new Date()
            if (!startDate) setStartDate(now.toISOString())
            if (!endDate) setEndDate(new Date(now.getTime() + 60 * 60 * 1000).toISOString())

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

                    // Fetch Projects (for Tasks)
                    const projectsRes = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`, {
                        headers: { 'x-user-id': session?.user?.id || '' }
                    })
                    if (projectsRes.data) {
                        setProjects(projectsRes.data)
                        if (projectsRes.data.length > 0 && !projectId) setProjectId(projectsRes.data[0].id)
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

                    // Fetch Labels
                    const labelsRes = await apiFetchJson<any>(`/api/labels?workspaceSlug=${workspaceSlug}`, {
                        headers: { 'x-user-id': session?.user?.id || '' }
                    })
                    if (labelsRes.data) {
                        setAvailableLabels(labelsRes.data)
                    }

                } catch (e) {
                    console.error("Failed to fetch calendar data", e)
                }
            }
            fetchData()
        }
    }, [isOpen, defaultType, workspaceSlug, session?.user?.id])

    // Update stages when project changes
    useEffect(() => {
        if (projectId && projects.length > 0) {
            const project = projects.find(p => p.id === projectId)
            if (project?.stages) {
                setCurrentStages(project.stages)
                // Default to first stage or keep current if valid
                if (!status || !project.stages.find(s => s.id === status)) {
                    setStatus(project.stages[0]?.id || 'todo')
                }
            } else {
                // Fallback if stages not loaded
                apiFetchJson<any>(`/api/projects/${projectId}`).then(res => {
                    if (res.data?.stages) {
                        setCurrentStages(res.data.stages)
                        if (!status || !res.data.stages.find((s: any) => s.id === status)) {
                            setStatus(res.data.stages[0]?.id || 'todo')
                        }
                    }
                })
            }
        }
    }, [projectId, projects])


    // Handle Create
    const handleCreate = async () => {
        if (!title.trim()) return
        if (selectedType === CalendarEventType.EVENT && teamIds.length === 0) {
            alert('Please select at least one team')
            return
        }
        if (selectedType === CalendarEventType.TASK && !projectId) {
            alert('Please select a project')
            return
        }

        setLoading(true)
        try {
            if (selectedType === CalendarEventType.TASK) {
                // Create Task
                const payload = {
                    projectId,
                    title: title.trim(),
                    description: description.trim(),
                    type: 'task',
                    status,
                    priority,
                    assignees: assignees.map(a => a.id),
                    dueDate: dueDate || undefined,
                    startDate: taskStartDate || undefined,
                    labels: labels.map(l => l.id),
                    subtasks: subtasks,
                    estimatedHours: null
                }

                const res = await apiFetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'x-user-id': session?.user?.id || '' },
                    body: JSON.stringify(payload)
                })

                if (!res.ok) throw new Error('Failed to create task')

            } else {
                // Create Event or Reminder
                // Auto-add members from selected teams
                const selectedTeamsData = teams.filter(t => teamIds.includes(t.id))
                const memberIds = new Set<string>()

                selectedTeamsData.forEach((team: any) => {
                    if (team.members) {
                        team.members.forEach((m: any) => memberIds.add(m.userId))
                    }
                })

                // For Reminder, we can treat it as an event with specific type or maybe 0 duration if simpler
                // For Reminder, we can treat it as an event with specific type or maybe 0 duration if simpler
                const payload = {
                    teamIds: teamIds, // Send array of teamIds
                    title: title.trim(),
                    description: description.trim(),
                    type: selectedType, // 'event' or 'reminder'
                    startAt: startDate,
                    endAt: selectedType === CalendarEventType.REMINDER ? startDate : endDate, // Reminders are point-in-time
                    location: location,

                    // Add meeting link if present
                    meetingLink: meetingLink.trim(),

                    meetingType: (selectedType === CalendarEventType.EVENT || selectedType === CalendarEventType.MEETING) ? meetingType : undefined,
                    isAllDay,
                    assignees: Array.from(memberIds).map(id => ({ id })),
                    assigneeIds: Array.from(memberIds)
                }

                const res = await apiFetch('/api/calendar', {
                    method: 'POST',
                    headers: { 'x-user-id': session?.user?.id || '' },
                    body: JSON.stringify(payload)
                })

                if (!res.ok) throw new Error('Failed to create event')
            }

            resetForm()
            if (onCreate) {
                await onCreate()
            }

            onClose()
        } catch (error) {
            console.error('Error creating item:', error)
            alert('Failed to create item')
        } finally {
            setLoading(false)
        }
    }

    // Subtask Helpers
    const addSubtask = () => {
        if (newSubtask.trim()) {
            setSubtasks([...subtasks, {
                title: newSubtask.trim(),
                description: '',
                status: 'todo',
                priority: 'medium'
            }])
            setNewSubtask('')
        }
    }

    const removeSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index))
    }

    // Label Helpers
    const handleCreateLabel = async (name: string, color: string): Promise<Label> => {
        if (workspaceSlug) {
            try {
                const data = await apiFetchJson<any>('/api/labels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': session?.user?.id || '' },
                    body: JSON.stringify({ workspaceSlug, name, color }),
                })
                if (data.success && data.data) {
                    const newLabel = data.data as Label
                    setAvailableLabels(prev => [...prev, newLabel])
                    return newLabel
                }
            } catch (err) {
                console.error('Failed to create label:', err)
            }
        }
        const newLabel = { id: `temp_${Date.now()}`, name, color }
        setAvailableLabels(prev => [...prev, newLabel])
        return newLabel
    }

    if (!isOpen) return null

    const getTypeIcon = (type: CalendarEventType) => {
        switch (type) {
            case CalendarEventType.EVENT: return <CalendarIcon className="w-5 h-5 text-amber-500" />
            case CalendarEventType.TASK: return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
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
                <div className="px-6 bg-[#14141b]">
                    <div className="flex gap-4">
                        {[CalendarEventType.EVENT, CalendarEventType.MEETING, CalendarEventType.TASK, CalendarEventType.REMINDER].map((type) => (
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
                                {type === CalendarEventType.EVENT ? 'Event' :
                                    type === CalendarEventType.MEETING ? 'Meeting' :
                                        type === CalendarEventType.TASK ? 'Task' : 'Reminder'}
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
                            placeholder={selectedType === CalendarEventType.TASK ? "Task title..." : "Event title..."}
                            className="w-full text-xl font-semibold text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:border-amber-500/50 transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Description - Common */}
                    <div>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add description..."
                            rows={3}
                            className="w-full text-sm text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:border-amber-500/50 transition-colors resize-none"
                        />
                    </div>

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
                                                {projects.find(p => p.id === projectId)?.name || 'Select Project'}
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
                                    <span className="text-xs text-gray-500 font-bold uppercase ml-1">Start Date</span>
                                    <DueDatePicker
                                        value={taskStartDate}
                                        onChange={(d) => setTaskStartDate(d || '')}
                                        placeholder="Pick start date"
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500 font-bold uppercase ml-1">Due Date</span>
                                    <DueDatePicker
                                        value={dueDate}
                                        onChange={(d) => setDueDate(d || '')}
                                        placeholder="Pick due date"
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
                                onClick={() => setShowMore(!showMore)}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                <SubtaskCheckboxIcon />
                                {showMore ? 'Hide Subtasks' : 'Add Subtasks'}
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
                                            placeholder="Add subtask..."
                                            className="flex-1 px-3 py-2 bg-[#12121a] rounded-lg text-sm text-white border border-gray-800/50 focus:border-amber-500/50 outline-none"
                                        />
                                        <button onClick={addSubtask} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-xs">Add</button>
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
                                                // Auto update end date if explicit
                                                if (date && (!endDate || new Date(date) > new Date(endDate))) {
                                                    const newStart = new Date(date)
                                                    setEndDate(new Date(newStart.getTime() + 60 * 60 * 1000).toISOString())
                                                }
                                            }}
                                            placeholder="Start date"
                                            showTime={!isAllDay && selectedType === CalendarEventType.EVENT}
                                            className="w-full"
                                            triggerClassName="w-full pl-4 pr-4 py-3 rounded-xl bg-[#1a1a24] text-gray-300 hover:text-white hover:bg-[#1a1a24] placeholder-gray-500 border-none justify-start text-left font-normal shadow-none"
                                        />
                                    </div>

                                    {selectedType === CalendarEventType.EVENT && (
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

                            {/* Team Selection (Multi-select) */}
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
                                    <p className="text-[10px] text-gray-500 mt-1.5 ml-1">
                                        Selected event will appear on calendars of all chosen teams.
                                    </p>
                                </div>
                            </div>

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
                                            In Person
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
                        onClick={handleCreate}
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : selectedType === CalendarEventType.EVENT ? 'Add Event' :
                            selectedType === CalendarEventType.TASK ? 'Add Task' : 'Set Reminder'}
                    </button>
                </div>
            </div>
        </>
    )
}
