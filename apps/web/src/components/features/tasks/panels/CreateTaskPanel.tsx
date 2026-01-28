import { useState, useRef, useEffect } from 'react'
import { usePanelStore } from '../../../../lib/panelStore'
import { LabelPicker } from '../../labels/LabelPicker'
import type { Label } from '../../labels/LabelBadge'
import { PrioritySelector } from '../components/PrioritySelector'
import { StatusSelector, type ProjectStage } from '../components/StatusBadge'
import { DueDatePicker } from '../components/DueDatePicker'
import { AssigneePicker, type Assignee } from '../components/AssigneePicker'
import { TemplateSelector } from '../filters/TemplateSelector'
import {
    PaperclipIcon,
    SubtaskCheckboxIcon,
    ChevronDoubleRightIcon,
} from '../components/TaskIcons'

interface Project {
    id: string
    name: string
    stages?: ProjectStage[]
}

// Types
interface CreateTaskPanelProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (task: NewTaskData) => Promise<{ id: string } | null>
    defaultStatus?: string
    defaultProject?: string
    defaultType?: 'task' | 'meeting'
    defaultDueDate?: string
    workspaceSlug?: string  // Used to fetch labels from workspace
    userId?: string  // Used for authenticated API calls
    projects?: Project[]
    columns?: { id: string; title: string; color?: string }[]
    teamMembers?: { id: string; name: string; avatar?: string }[]
}

interface NewTaskData {
    title: string
    description: string
    type: 'task' | 'meeting'
    status: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
    assignees: string[]
    dueDate?: string
    startDate?: string
    meetingLink?: string
    labels: string[]
    projectId?: string
    subtasks: { title: string; description: string; status: string; priority: string }[]
    estimate?: string
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

// Mock projects
const MOCK_PROJECTS = [
    { id: 'marketing', name: 'Marketing' },
    { id: 'development', name: 'Development' },
    { id: 'design', name: 'Design System' },
]

// Dropdown Component
const Dropdown = ({
    isOpen,
    onClose,
    children,
    className = ''
}: {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
}) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            ref={ref}
            className={`absolute top-full left-0 mt-2 bg-[#1a1a24] rounded-xl shadow-2xl z-50 overflow-hidden ${className}`}
        >
            {children}
        </div>
    )
}

// Main Component
export function CreateTaskPanel({
    isOpen,
    onClose,
    onCreate,
    defaultStatus = 'todo',
    defaultProject,
    defaultType = 'task',
    defaultDueDate,
    workspaceSlug,
    userId,
    projects = MOCK_PROJECTS,
    availableLabels: propAvailableLabels,
    onCreateLabel: propOnCreateLabel,
    teamMembers = [],
}: CreateTaskPanelProps & { availableLabels?: Label[]; onCreateLabel?: (name: string, color: string) => Label }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState(defaultStatus)
    const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium')
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [dueDate, setDueDate] = useState(defaultDueDate || '')
    const [startDate, setStartDate] = useState('')
    const [labels, setLabels] = useState<Label[]>([])
    const [projectId, setProjectId] = useState(defaultProject || projects[0]?.id || '')
    const [subtasks, setSubtasks] = useState<{ title: string; description: string; status: string; priority: string }[]>([])
    const [newSubtask, setNewSubtask] = useState('')
    const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null)
    const [attachments, setAttachments] = useState<File[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [createMore, setCreateMore] = useState(false)
    const [currentStages, setCurrentStages] = useState<any[]>([])
    const [showMore, setShowMore] = useState(false)

    // Meeting type support
    const [itemType, setItemType] = useState<'task' | 'meeting'>(defaultType)
    const [meetingLink, setMeetingLink] = useState('')

    // Sync itemType when defaultType changes
    useEffect(() => {
        setItemType(defaultType)
    }, [defaultType])

    // Use props if provided, otherwise fall back to local state
    const [localAvailableLabels, setLocalAvailableLabels] = useState<Label[]>(DEFAULT_LABELS)
    const availableLabels = propAvailableLabels || localAvailableLabels

    // Fetch labels from workspace when panel opens
    useEffect(() => {
        if (isOpen && workspaceSlug && !propAvailableLabels) {
            fetch(`/api/labels?workspaceSlug=${workspaceSlug}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        setLocalAvailableLabels(data.data)
                    }
                })
                .catch(err => console.error('Failed to fetch labels:', err))
        }
    }, [isOpen, workspaceSlug, propAvailableLabels])

    // Dropdown states
    const [showProjectDropdown, setShowProjectDropdown] = useState(false)

    const titleInputRef = useRef<HTMLInputElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

    // Sync isOpen with global panel store
    useEffect(() => {
        setIsPanelOpen(isOpen)
        if (isOpen && defaultProject) {
            setProjectId(defaultProject)
        }
        if (isOpen && defaultDueDate) {
            setDueDate(defaultDueDate)
        } else if (isOpen && !defaultDueDate) {
            setDueDate('')
        }
    }, [isOpen, defaultProject, defaultDueDate, setIsPanelOpen])

    // Fetch stages when project changes
    useEffect(() => {
        if (projectId) {
            const projectData = projects.find(p => p.id === projectId)
            if (projectData?.stages) {
                setCurrentStages(projectData.stages)
                if (projectData.stages.length > 0 && !status) {
                    setStatus(projectData.stages[0].id)
                }
            } else {
                fetch(`/api/projects/${projectId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.data?.stages) {
                            setCurrentStages(data.data.stages)
                            if (data.data.stages.length > 0 && !status) {
                                setStatus(data.data.stages[0].id)
                            }
                        }
                    })
                    .catch(console.error)
            }
        }
    }, [projectId, projects, status])

    // Autofocus on title
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => titleInputRef.current?.focus(), 300)
        }
    }, [isOpen])


    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // Reset form
    const resetForm = () => {
        setTitle('')
        setDescription('')
        setStatus(defaultStatus)
        setPriority('medium')
        setAssignees([])
        setDueDate('')
        setStartDate('')
        setLabels([])
        setSubtasks([])
        setNewSubtask('')
        setShowMore(false)
        setAttachments([])
        setEditingSubtaskIndex(null)
        setItemType('task')
        setMeetingLink('')
    }

    // Handle create
    const handleCreate = async () => {
        if (!title.trim()) return

        const newTask = await onCreate({
            title: title.trim(),
            description: description.trim(),
            type: itemType,
            status: itemType === 'meeting' ? 'scheduled' : status,
            priority,
            assignees: assignees.map(a => a.id),
            dueDate: dueDate || undefined,
            startDate: startDate || undefined,
            meetingLink: itemType === 'meeting' && meetingLink ? meetingLink : undefined,
            labels: labels as any,
            projectId: projectId || undefined,
            subtasks: itemType === 'task' ? subtasks.filter(s => s.title.trim()) : [],
        })

        // Upload files if task was created successfully
        if (newTask?.id && attachments.length > 0) {
            console.log(`Uploading ${attachments.length} files to task ${newTask.id}`)
            try {
                // Wait for all uploads to complete before closing panel
                const uploadPromises = attachments.map(async (file, index) => {
                    console.log(`Starting upload ${index + 1}/${attachments.length}: ${file.name}`)
                    const formData = new FormData()
                    formData.append('file', file)

                    const response = await fetch(`/api/tasks/${newTask.id}/upload`, {
                        method: 'POST',
                        headers: {
                            'x-user-id': userId || ''
                        },
                        body: formData
                    })

                    if (!response.ok) {
                        console.error(`Upload failed for ${file.name}:`, await response.text())
                        throw new Error(`Upload failed: ${response.statusText}`)
                    }

                    console.log(`Upload ${index + 1}/${attachments.length} complete: ${file.name}`)
                    return response
                })

                await Promise.all(uploadPromises)
                console.log('All uploads completed successfully')
            } catch (error) {
                console.error('Error uploading files:', error)
                alert('Nie udało się zauploadować niektórych plików. Sprawdź konsolę.')
            }
        }

        // Only reset and close AFTER uploads complete
        if (createMore) {
            resetForm()
            setTimeout(() => titleInputRef.current?.focus(), 100)
        } else {
            resetForm()
            onClose()
        }
    }

    // Handle Enter in title
    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.metaKey || e.ctrlKey) {
                handleCreate()
            } else {
                e.preventDefault()
                descriptionRef.current?.focus()
            }
        }
    }

    // Handle Cmd+Enter anywhere
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleCreate()
        }
    }

    // Add subtask
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

    // Update subtask description
    const updateSubtask = (index: number, updates: Partial<{ title: string; description: string; status: string; priority: string }>) => {
        const updated = [...subtasks]
        updated[index] = { ...updated[index], ...updates }
        setSubtasks(updated)
    }

    // Remove subtask
    const removeSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index))
        if (editingSubtaskIndex === index) setEditingSubtaskIndex(null)
    }

    // Handle label creation - creates via API when workspaceSlug is available
    const handleCreateLabel = async (name: string, color: string): Promise<Label> => {
        // Use prop callback if provided
        if (propOnCreateLabel) {
            return propOnCreateLabel(name, color)
        }

        // Try to create via API if we have a workspace
        if (workspaceSlug) {
            try {
                const response = await fetch('/api/labels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspaceSlug, name, color }),
                })
                const data = await response.json()
                if (data.success && data.data) {
                    const newLabel = data.data as Label
                    setLocalAvailableLabels(prev => [...prev, newLabel])
                    return newLabel
                }
            } catch (err) {
                console.error('Failed to create label via API:', err)
            }
        }

        // Fallback to local creation
        const newLabel: Label = {
            id: `label_${Date.now()}`,
            name,
            color
        }
        setLocalAvailableLabels(prev => [...prev, newLabel])
        return newLabel
    }

    const selectedProject = projects.find(p => p.id === projectId)

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                onKeyDown={handleKeyDown}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-xl bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
                    }`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Zamknij"
                        >
                            <ChevronDoubleRightIcon />
                        </button>

                        {/* Project Selector - in same row */}
                        {!defaultProject && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-sm text-gray-300 transition-colors"
                                >
                                    <span className="text-lg">📁</span>
                                    <span>{selectedProject?.name || 'Wybierz projekt'}</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 9L12 15L18 9" />
                                    </svg>
                                </button>
                                <Dropdown
                                    isOpen={showProjectDropdown}
                                    onClose={() => setShowProjectDropdown(false)}
                                    className="w-48"
                                >
                                    {projects.map(project => (
                                        <button
                                            key={project.id}
                                            onClick={() => {
                                                setProjectId(project.id)
                                                setShowProjectDropdown(false)
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${projectId === project.id ? 'text-amber-400' : 'text-gray-300'
                                                }`}
                                        >
                                            {project.name}
                                        </button>
                                    ))}
                                </Dropdown>
                            </div>
                        )}

                        {/* Type Toggle - Task / Meeting */}
                        <div className="flex bg-[#1a1a24] p-1 rounded-full">
                            <button
                                type="button"
                                onClick={() => setItemType('task')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all ${itemType === 'task'
                                    ? 'bg-[#F2CE88] text-[#0a0a0f] font-bold shadow-lg shadow-amber-500/10'
                                    : 'text-gray-500 hover:text-white font-medium'
                                    }`}
                            >
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                    <path d="M8 6C8 4.89543 8.89543 4 10 4H18L24 10V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z" fill={itemType === 'task' ? '#0a0a0f' : '#9E9E9E'} />
                                    <path d="M18 4V8C18 9.10457 18.8954 10 20 10H24" fill={itemType === 'task' ? '#545454' : '#545454'} />
                                    <path d="M12 14H20" stroke={itemType === 'task' ? '#545454' : '#545454'} strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 18H20" stroke={itemType === 'task' ? '#545454' : '#545454'} strokeWidth="2" strokeLinecap="round" />
                                    <path d="M12 22H16" stroke={itemType === 'task' ? '#545454' : '#545454'} strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Zadanie
                            </button>
                            <button
                                type="button"
                                onClick={() => setItemType('meeting')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all ${itemType === 'meeting'
                                    ? 'bg-[#F2CE88] text-[#0a0a0f] font-bold shadow-lg shadow-amber-500/10'
                                    : 'text-gray-500 hover:text-white font-medium'
                                    }`}
                            >
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                    <path d="M6 10C6 7.79 7.79 6 10 6H22C24.21 6 26 7.79 26 10V24C26 26.21 24.21 28 22 28H10C7.79 28 6 26.21 6 24V10Z" fill={itemType === 'meeting' ? '#0a0a0f' : '#9E9E9E'} />
                                    <path d="M6 12H26" stroke={itemType === 'meeting' ? '#545454' : '#545454'} strokeWidth="2" />
                                    <path d="M11 4V8" stroke={itemType === 'meeting' ? '#545454' : '#545454'} strokeWidth="2" strokeLinecap="round" />
                                    <path d="M21 4V8" stroke={itemType === 'meeting' ? '#545454' : '#545454'} strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Spotkanie
                            </button>
                        </div>

                        <h2 className="text-lg font-semibold text-white flex-1">
                            {itemType === 'task' ? 'Nowe zadanie' : 'Nowe spotkanie'}
                        </h2>

                        {/* Template Selector - for tasks */}
                        {itemType === 'task' && workspaceSlug && (
                            <TemplateSelector
                                workspaceSlug={workspaceSlug}
                                userId={userId}
                                onApplyTemplate={(templateData) => {
                                    // Apply template values to form
                                    if (templateData.titlePrefix) {
                                        setTitle(templateData.titlePrefix)
                                    }
                                    if (templateData.description) {
                                        setDescription(templateData.description)
                                    }
                                    if (templateData.type) {
                                        setItemType(templateData.type)
                                    }
                                    if (templateData.priority) {
                                        setPriority(templateData.priority)
                                    }
                                    if (templateData.labels && templateData.labels.length > 0) {
                                        // Find matching labels from available labels
                                        const matchedLabels = availableLabels.filter(l =>
                                            templateData.labels?.includes(l.id) || templateData.labels?.includes(l.name)
                                        )
                                        setLabels(matchedLabels)
                                    }
                                    if (templateData.subtasks && templateData.subtasks.length > 0) {
                                        setSubtasks(templateData.subtasks.map(s => ({
                                            title: s.title,
                                            description: s.description || '',
                                            status: 'todo',
                                            priority: s.priority || 'medium'
                                        })))
                                        setShowMore(true) // Expand to show subtasks
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Main Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Title */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tytuł zadania</label>
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleTitleKeyDown}
                            placeholder="Co jest do zrobienia?"
                            className="w-full text-xl font-semibold text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:border-amber-500/50 transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <textarea
                            ref={descriptionRef}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Dodaj opis zadania... (wspiera Markdown)"
                            rows={4}
                            className="w-full text-sm text-gray-300 bg-[#1a1a24] rounded-xl p-4 placeholder-gray-500 outline-none resize-none transition-colors"
                        />
                        <p className="text-xs text-gray-600 mt-2">
                            Wskazówka: Użyj **pogrubienia**, *kursywy*, - listy
                        </p>
                    </div>

                    {/* Properties Bar - single row layout */}
                    <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-800">
                        {/* Status - only for tasks */}
                        {itemType === 'task' && (
                            <StatusSelector
                                value={status}
                                stages={currentStages}
                                onChange={(newStatus) => setStatus(newStatus)}
                            />
                        )}

                        {/* Priority */}
                        <PrioritySelector
                            value={priority}
                            onChange={setPriority}
                            size="md"
                        />

                        {/* Assignee */}
                        <div className="min-w-[160px]">
                            <AssigneePicker
                                selectedAssignees={assignees}
                                availableAssignees={teamMembers as any}
                                onSelect={setAssignees}
                                maxVisible={2}
                                placeholder={itemType === 'meeting' ? 'Zaproś osoby...' : 'Przypisz osobę...'}
                            />
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Dates - aligned right */}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Start</span>
                                <DueDatePicker
                                    value={startDate}
                                    onChange={(date) => setStartDate(date || '')}
                                    placeholder="Start"
                                    showTime={itemType === 'meeting'}
                                />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Koniec</span>
                                <DueDatePicker
                                    value={dueDate}
                                    onChange={(date) => setDueDate(date || '')}
                                    placeholder="Termin"
                                    showTime={itemType === 'meeting'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Meeting Link - only for meetings, separate section */}
                    {itemType === 'meeting' && (
                        <div className="mb-6">
                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Link do spotkania</label>
                            <input
                                type="url"
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                                placeholder="https://meet.google.com/... lub https://zoom.us/..."
                                className="w-full text-sm text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl focus:ring-1 focus:ring-amber-500/50 transition-colors"
                            />
                        </div>
                    )}

                    {/* Labels Section - Full Width Below */}
                    <div className="mb-4">
                        <LabelPicker
                            selectedLabels={labels}
                            availableLabels={availableLabels}
                            onSelect={(newLabels) => setLabels(newLabels)}
                            onCreateNew={handleCreateLabel}
                        />
                    </div>

                    {/* More Options Toggle */}
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform ${showMore ? 'rotate-180' : ''}`}
                        >
                            <path d="M6 9L12 15L18 9" />
                        </svg>
                        {showMore ? 'Mniej opcji' : 'Więcej opcji'}
                    </button>

                    {/* Extended Options */}
                    {showMore && (
                        <div className="space-y-4 pt-4 ">
                            {/* Subtasks - only for tasks */}
                            {itemType === 'task' && (
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3">
                                        <SubtaskCheckboxIcon />
                                        Zadania podrzędne
                                    </label>
                                    <div className="space-y-3">
                                        {subtasks.map((subtask, index) => (
                                            <div
                                                key={index}
                                                className="bg-gray-800/50 rounded-xl overflow-hidden"
                                            >
                                                <div className="flex items-center gap-3 px-4 py-3">
                                                    <div className="w-5 h-5 rounded-md flex-shrink-0" />
                                                    <span className="text-sm text-white flex-1 font-medium">{subtask.title}</span>
                                                    <div className="flex items-center gap-2">
                                                        {/* Status Badge */}
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${subtask.status === 'todo' ? 'bg-indigo-500/10 text-indigo-400' :
                                                            subtask.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400' :
                                                                subtask.status === 'review' ? 'bg-purple-500/10 text-purple-400' :
                                                                    'bg-emerald-500/10 text-emerald-400'
                                                            }`}>
                                                            {subtask.status === 'todo' ? 'To Do' :
                                                                subtask.status === 'in_progress' ? 'In Progress' :
                                                                    subtask.status === 'review' ? 'Review' : 'Done'}
                                                        </span>
                                                        {/* Priority Badge */}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${subtask.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                                            subtask.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                                subtask.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                                                    'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {subtask.priority}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setEditingSubtaskIndex(editingSubtaskIndex === index ? null : index)}
                                                        className="p-1 text-gray-500 hover:text-amber-400 transition-colors"
                                                        title="Edytuj szczegóły"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d={editingSubtaskIndex === index ? "M18 15L12 9L6 15" : "M6 9L12 15L18 9"} />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => removeSubtask(index)}
                                                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 6L6 18M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                {editingSubtaskIndex === index && (
                                                    <div className="px-4 pb-3 pt-0 space-y-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Status</label>
                                                                <select
                                                                    value={subtask.status}
                                                                    onChange={(e) => updateSubtask(index, { status: e.target.value })}
                                                                    className="w-full bg-gray-900 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500/50"
                                                                >
                                                                    <option value="todo">To-Do</option>
                                                                    <option value="in_progress">W trakcie</option>
                                                                    <option value="review">Recenzja</option>
                                                                    <option value="done">Gotowe</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Priorytet</label>
                                                                <select
                                                                    value={subtask.priority}
                                                                    onChange={(e) => updateSubtask(index, { priority: e.target.value as any })}
                                                                    className="w-full bg-gray-900 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500/50"
                                                                >
                                                                    <option value="low">Niski</option>
                                                                    <option value="medium">Średni</option>
                                                                    <option value="high">Wysoki</option>
                                                                    <option value="urgent">Pilne</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Opis</label>
                                                            <textarea
                                                                value={subtask.description}
                                                                onChange={(e) => updateSubtask(index, { description: e.target.value })}
                                                                placeholder="Dodaj opis tego zadania..."
                                                                rows={2}
                                                                className="w-full text-xs text-gray-400 bg-gray-900/50 rounded-lg p-3 placeholder-gray-600 outline-none resize-none focus:border-amber-500/50 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {subtask.description && editingSubtaskIndex !== index && (
                                                    <div className="px-4 pb-3 pt-0">
                                                        <p className="text-xs text-gray-500 leading-relaxed pl-8">
                                                            {subtask.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newSubtask}
                                                onChange={(e) => setNewSubtask(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                                                placeholder="Dodaj zadanie podrzędne..."
                                                className="flex-1 px-4 py-3 bg-gray-800/50 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/50 transition-colors"
                                            />
                                            <button
                                                onClick={addSubtask}
                                                disabled={!newSubtask.trim()}
                                                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${newSubtask.trim() ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'text-gray-600 cursor-not-allowed'}`}
                                            >
                                                + Dodaj
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Attachments */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3">
                                    <PaperclipIcon />
                                    Załączniki
                                </label>

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
                                            const newFiles = Array.from(e.target.files)

                                            // Validate file sizes
                                            const oversizedFiles = newFiles.filter(f => f.size > MAX_FILE_SIZE)
                                            if (oversizedFiles.length > 0) {
                                                alert(`Następujące pliki są za duże (max 100MB):\n${oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`)
                                                e.target.value = ''
                                                return
                                            }

                                            setAttachments(prev => [...prev, ...newFiles])
                                        }
                                        e.target.value = ''
                                    }}
                                />

                                {/* Uploaded files list */}
                                {attachments.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-xl">
                                                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2CE88" strokeWidth="2">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">{file.name}</p>
                                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                                <button
                                                    onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 6L6 18M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Drop zone */}
                                <div
                                    className={`rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                                        ? 'bg-amber-500/10'
                                        : 'hover:bg-gray-800/30'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault()
                                        setIsDragging(true)
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault()
                                        setIsDragging(false)
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        setIsDragging(false)
                                        if (e.dataTransfer.files) {
                                            const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
                                            const newFiles = Array.from(e.dataTransfer.files)

                                            // Validate file sizes
                                            const oversizedFiles = newFiles.filter(f => f.size > MAX_FILE_SIZE)
                                            if (oversizedFiles.length > 0) {
                                                alert(`Następujące pliki są za duże (max 100MB):\n${oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`)
                                                return
                                            }

                                            setAttachments(prev => [...prev, ...newFiles])
                                        }
                                    }}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-amber-500/20' : 'bg-gray-800'
                                            }`}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDragging ? "#F2CE88" : "#9E9E9E"} strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                        </div>
                                        <p className={`text-sm transition-colors ${isDragging ? 'text-amber-400' : 'text-gray-500'}`}>
                                            {isDragging ? 'Upuść pliki tutaj...' : 'Przeciągnij pliki lub kliknij aby dodać'}
                                        </p>
                                        <p className="text-xs text-gray-600">PNG, JPG, PDF, DOCX do 100MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-[#0f0f14] rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        {/* Left side - Create more toggle */}
                        <label
                            className="flex items-center gap-3 cursor-pointer select-none"
                            onClick={() => setCreateMore(!createMore)}
                        >
                            <div
                                className={`w-5 h-5 border border-gray-800 rounded-md flex items-center justify-center transition-all ${createMore
                                    ? 'bg-amber-500'
                                    : 'hover:bg-gray-800/30'
                                    }`}
                            >
                                {createMore && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-sm text-gray-400 font-medium">Stwórz kolejne</span>
                        </label>

                        {/* Right side - Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!title.trim()}
                                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${title.trim()
                                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Stwórz zadanie
                                <span className="text-xs opacity-75">⌘↵</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
