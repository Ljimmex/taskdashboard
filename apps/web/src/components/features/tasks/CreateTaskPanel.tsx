import { useState, useRef, useEffect } from 'react'
import { LabelPicker } from '../labels/LabelPicker'
import type { Label } from '../labels/LabelBadge'
import {
    FlagIcon,
    UserIcon,
    CalendarSmallIcon,
    PaperclipIcon,
    SubtaskCheckboxIcon,
    ChevronDoubleRightIcon,
} from './TaskIcons'

// Types
interface CreateTaskPanelProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (task: NewTaskData) => void
    defaultStatus?: string
    defaultProject?: string
    projects?: { id: string; name: string }[]
    columns?: { id: string; title: string; color?: string }[]
    teamMembers?: { id: string; name: string; avatar?: string }[]
}

interface NewTaskData {
    title: string
    description: string
    status: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
    assignees: string[]
    dueDate?: string
    labels: string[]
    projectId?: string
    subtasks: { title: string; description: string; status: string; priority: string }[]
    estimate?: string
}

// Priority options
const PRIORITIES = [
    { value: 'urgent', label: 'Pilne', icon: '🔥', color: 'text-red-400', bg: 'bg-red-500/20' },
    { value: 'high', label: 'Wysoki', icon: '🔴', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    { value: 'medium', label: 'Średni', icon: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { value: 'low', label: 'Niski', icon: '🔵', color: 'text-blue-400', bg: 'bg-blue-500/20' },
]

// Default labels
const DEFAULT_LABELS = [
    { id: 'bug', name: 'Bug', color: '#ef4444' },
    { id: 'feature', name: 'Feature', color: '#10b981' },
    { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
    { id: 'backend', name: 'Backend', color: '#8b5cf6' },
    { id: 'design', name: 'Design', color: '#ec4899' },
    { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
]

// Mock team members
const MOCK_TEAM = [
    { id: '1', name: 'Jan Kowalski' },
    { id: '2', name: 'Anna Nowak' },
    { id: '3', name: 'Piotr Wiśniewski' },
]

// Mock projects
const MOCK_PROJECTS = [
    { id: 'marketing', name: 'Marketing' },
    { id: 'development', name: 'Development' },
    { id: 'design', name: 'Design System' },
]

// Avatar component
const Avatar = ({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) => {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
    const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-semibold text-black`}>
            {initials}
        </div>
    )
}

// Property Chip Button
const PropertyChip = ({
    icon,
    label,
    value,
    onClick,
    className = ''
}: {
    icon: React.ReactNode
    label: string
    value?: string
    onClick: () => void
    className?: string
}) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-medium transition-colors ${className}`}
    >
        {icon}
        <span>{value || label}</span>
    </button>
)

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
            className={`absolute top-full left-0 mt-2 bg-[#1a1a24] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden ${className}`}
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
    projects = MOCK_PROJECTS,
    columns = [],
    teamMembers = MOCK_TEAM,
    availableLabels: propAvailableLabels,
    onCreateLabel: propOnCreateLabel,
}: CreateTaskPanelProps & { availableLabels?: Label[]; onCreateLabel?: (name: string, color: string) => Label }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [status, setStatus] = useState(defaultStatus)
    const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium')
    const [assignees, setAssignees] = useState<string[]>([])
    const [dueDate, setDueDate] = useState('')
    const [labels, setLabels] = useState<Label[]>([])
    const [projectId, setProjectId] = useState(defaultProject || projects[0]?.id || '')
    const [subtasks, setSubtasks] = useState<{ title: string; description: string; status: string; priority: string }[]>([])
    const [newSubtask, setNewSubtask] = useState('')
    const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null)
    const [attachments, setAttachments] = useState<{ name: string; size: number; type: string }[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [createMore, setCreateMore] = useState(false)
    const [showMore, setShowMore] = useState(false)

    // Use props if provided, otherwise fall back to local state
    const [localAvailableLabels, setLocalAvailableLabels] = useState<Label[]>(DEFAULT_LABELS)
    const availableLabels = propAvailableLabels || localAvailableLabels

    // Dropdown states
    const [showProjectDropdown, setShowProjectDropdown] = useState(false)
    const [showStatusDropdown, setShowStatusDropdown] = useState(false)
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
    const [showDatePicker, setShowDatePicker] = useState(false)

    const titleInputRef = useRef<HTMLInputElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const dateInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
        setLabels([])
        setSubtasks([])
        setNewSubtask('')
        setShowMore(false)
        setAttachments([])
        setEditingSubtaskIndex(null)
    }

    // Handle create
    const handleCreate = () => {
        if (!title.trim()) return

        onCreate({
            title: title.trim(),
            description: description.trim(),
            status,
            priority,
            assignees,
            dueDate: dueDate || undefined,
            labels: labels as any, // Label[] compatible with TaskLabel[]
            projectId: projectId || undefined,
            subtasks: subtasks.filter(s => s.title.trim()),
        })

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

    // Toggle assignee
    const toggleAssignee = (id: string) => {
        setAssignees(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        )
    }

    // Handle label creation
    const handleCreateLabel = async (name: string, color: string): Promise<Label> => {
        if (propOnCreateLabel) {
            return propOnCreateLabel(name, color)
        }
        const newLabel: Label = {
            id: `label_${Date.now()}`,
            name,
            color
        }
        setLocalAvailableLabels(prev => [...prev, newLabel])
        return newLabel
    }

    // Get status columns
    const statusOptions = columns.length > 0
        ? columns.map(c => ({ id: c.id, name: c.title, color: c.color }))
        : [
            { id: 'todo', name: 'Do zrobienia', color: '#6366f1' },
            { id: 'in_progress', name: 'W trakcie', color: '#f59e0b' },
            { id: 'done', name: 'Zrobione', color: '#10b981' },
        ]

    const selectedProject = projects.find(p => p.id === projectId)
    const selectedStatus = statusOptions.find(s => s.id === status)
    const selectedPriority = PRIORITIES.find(p => p.value === priority)

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
                className={`fixed top-4 right-4 bottom-4 w-full max-w-xl bg-[#12121a] border border-gray-800 rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
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

                        <h2 className="text-lg font-semibold text-white flex-1">Nowe zadanie</h2>
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
                            className="w-full text-xl font-semibold text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl border border-gray-800 focus:border-amber-500/50 transition-colors"
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
                            className="w-full text-sm text-gray-300 bg-[#1a1a24] rounded-xl p-4 placeholder-gray-500 outline-none resize-none border border-gray-800 focus:border-gray-700 transition-colors"
                        />
                        <p className="text-xs text-gray-600 mt-2">
                            Wskazówka: Użyj **pogrubienia**, *kursywy*, - listy
                        </p>
                    </div>

                    {/* Properties Bar */}
                    <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-800">
                        {/* Status */}
                        <div className="relative">
                            <PropertyChip
                                icon={<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedStatus?.color || '#6366f1' }} />}
                                label="Status"
                                value={selectedStatus?.name}
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            />
                            <Dropdown
                                isOpen={showStatusDropdown}
                                onClose={() => setShowStatusDropdown(false)}
                                className="w-40"
                            >
                                {statusOptions.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setStatus(s.id)
                                            setShowStatusDropdown(false)
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 ${status === s.id ? 'text-amber-400' : 'text-gray-300'
                                            }`}
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                        {s.name}
                                    </button>
                                ))}
                            </Dropdown>
                        </div>

                        {/* Priority */}
                        <div className="relative">
                            <PropertyChip
                                icon={<FlagIcon />}
                                label="Priorytet"
                                value={selectedPriority ? `${selectedPriority.icon} ${selectedPriority.label}` : undefined}
                                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                            />
                            <Dropdown
                                isOpen={showPriorityDropdown}
                                onClose={() => setShowPriorityDropdown(false)}
                                className="w-40"
                            >
                                {PRIORITIES.map(p => (
                                    <button
                                        key={p.value}
                                        onClick={() => {
                                            setPriority(p.value as any)
                                            setShowPriorityDropdown(false)
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 ${priority === p.value ? 'text-amber-400' : 'text-gray-300'
                                            }`}
                                    >
                                        <span>{p.icon}</span>
                                        {p.label}
                                    </button>
                                ))}
                            </Dropdown>
                        </div>

                        {/* Assignee */}
                        <div className="relative">
                            <PropertyChip
                                icon={<UserIcon />}
                                label="Przypisz"
                                value={assignees.length > 0 ? `${assignees.length} osób` : undefined}
                                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                            />
                            <Dropdown
                                isOpen={showAssigneeDropdown}
                                onClose={() => setShowAssigneeDropdown(false)}
                                className="w-56"
                            >
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            // Assign to me - assuming first team member is "me"
                                            if (teamMembers.length > 0) {
                                                toggleAssignee(teamMembers[0].id)
                                            }
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        👤 Przypisz do mnie
                                    </button>
                                </div>
                                <div className="border-t border-gray-800">
                                    {teamMembers.map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => toggleAssignee(member.id)}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors flex items-center gap-3"
                                        >
                                            <Avatar name={member.name} />
                                            <span className={assignees.includes(member.id) ? 'text-amber-400' : 'text-gray-300'}>
                                                {member.name}
                                            </span>
                                            {assignees.includes(member.id) && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto text-amber-400">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </Dropdown>
                        </div>

                        {/* Due Date */}
                        <div className="relative">
                            <PropertyChip
                                icon={<CalendarSmallIcon />}
                                label="Termin"
                                value={dueDate ? new Date(dueDate).toLocaleDateString('pl-PL') : undefined}
                                onClick={() => setShowDatePicker(!showDatePicker)}
                            />
                            {showDatePicker && (
                                <div className="absolute top-full left-0 mt-2 bg-[#1a1a24] border border-gray-800 rounded-xl shadow-2xl z-50 p-4">
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => {
                                            setDueDate(e.target.value)
                                            setShowDatePicker(false)
                                        }}
                                        className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 outline-none focus:border-amber-500"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    </div>

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
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                            {/* Subtasks */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3">
                                    <SubtaskCheckboxIcon />
                                    Zadania podrzędne
                                </label>
                                <div className="space-y-3">
                                    {subtasks.map((subtask, index) => (
                                        <div
                                            key={index}
                                            className="bg-gray-800/50 rounded-xl border border-gray-800 overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 px-4 py-3">
                                                <div className="w-5 h-5 rounded-md border-2 border-gray-600 flex-shrink-0" />
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
                                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500/50"
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
                                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500/50"
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
                                                            className="w-full text-xs text-gray-400 bg-gray-900/50 rounded-lg p-3 placeholder-gray-600 outline-none resize-none border border-gray-700 focus:border-amber-500/50 transition-colors"
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
                                            className="flex-1 px-4 py-3 bg-gray-800/50 rounded-xl text-sm text-white placeholder-gray-500 outline-none border border-gray-800 focus:border-amber-500/50 transition-colors"
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
                                            const newFiles = Array.from(e.target.files).map(f => ({
                                                name: f.name,
                                                size: f.size,
                                                type: f.type
                                            }))
                                            setAttachments(prev => [...prev, ...newFiles])
                                        }
                                        e.target.value = ''
                                    }}
                                />

                                {/* Uploaded files list */}
                                {attachments.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-xl border border-gray-800">
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
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                                        ? 'border-amber-500 bg-amber-500/10'
                                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
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
                                            const newFiles = Array.from(e.dataTransfer.files).map(f => ({
                                                name: f.name,
                                                size: f.size,
                                                type: f.type
                                            }))
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
                                        <p className="text-xs text-gray-600">PNG, JPG, PDF do 10MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none p-6 border-t border-gray-800 bg-[#0f0f14] rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        {/* Left side - Create more toggle */}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${createMore
                                    ? 'bg-amber-500 border-amber-500'
                                    : 'border-gray-600 hover:border-gray-500'
                                    }`}
                                onClick={() => setCreateMore(!createMore)}
                            >
                                {createMore && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-sm text-gray-400">Stwórz kolejne</span>
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
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${title.trim()
                                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
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
