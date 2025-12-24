import { useState, useRef, useEffect } from 'react'
import { usePanelStore } from '../../../lib/panelStore'
import { StatusBadge } from './StatusBadge'
import type { Label } from '../labels/LabelBadge'
import { LabelPicker } from '../labels/LabelPicker'
import {
    DocumentIcon,
    DocumentIconGold,
    CommentIcon,
    CommentIconGold,
    PaperclipIcon,
    PaperclipIconGold,
    HistoryIcon,
    HistoryIconGold,
} from './TaskIcons'
import { CommentList } from '../comments/CommentList'
import { CommentInput } from '../comments/CommentInput'
import { ActivityFeed, type Activity } from './ActivityFeed'
import type { Comment } from '../comments/CommentList'
import type { TaskCardProps } from './TaskCard'
import { SubtaskList, type Subtask } from './SubtaskList'
import { AssigneePicker, type Assignee } from './AssigneePicker'

// Subtask type is imported from SubtaskList


interface SharedFile {
    id: string
    name: string
    type: 'doc' | 'pdf' | 'image' | 'other'
    dateShared: string
    sharedBy: { id: string; name: string; avatar?: string }
}

interface TaskDetailsPanelProps {
    task: TaskCardProps | null
    isOpen: boolean
    onClose: () => void
    subitems?: Subtask[]
    comments?: Comment[]
    sharedFiles?: SharedFile[]
    onSubtaskToggle?: (subtaskId: string) => void
    onSubtasksChange?: (subtasks: Subtask[]) => void
    onAddComment?: (content: string) => void
    onAddSubtask?: (title: string) => void
    activities?: Activity[]
    availableLabels?: Label[]
    onCreateLabel?: (name: string, color: string) => Label
}

// Mock Data for demo
const MOCK_SUBTASKS: Subtask[] = [
    { id: '1', title: 'Set deadlines for each milestone', description: 'When setting deadlines, consider the complexity of each milestone and how much time it may realistically take to complete.', status: 'todo', priority: 'high' },
    { id: '2', title: 'Identify key milestones for Q4 roadmap', status: 'in_progress', priority: 'medium' },
    { id: '3', title: 'Define task dependencies', status: 'done', priority: 'low' },
    { id: '4', title: 'Allocate team responsibilities for each task', status: 'todo', priority: 'medium' },
    { id: '5', title: 'Review timeline with stakeholders', description: 'Before finalizing the deadlines, consult with the respective team leads.', status: 'done', priority: 'high' },
]

const MOCK_COMMENTS: Comment[] = [
    { id: '1', author: { id: '1', name: 'Marcia Cross' }, content: "Hi @Agatha Mayer, I've gathered the necessary input from the design and development departments. I'll be adding the key milestones for Q4 based on our discussions. Once the timeline is ready, I'll share it for review. Let me know if there's anything specific that should be prioritized.", createdAt: '2h ago', likes: ['user-1', 'user-2'], parentId: null },
    { id: '2', author: { id: '2', name: 'Agatha Mayer' }, content: "Just finished outlining the task dependencies and team responsibilities for the timeline. The next step is setting realistic deadlines, considering the current workload. I'll start working on it today and aim to have the first draft by tomorrow.", createdAt: '1h ago', likes: ['user-1'], parentId: null },
    { id: '3', author: { id: '2', name: 'Agatha Mayer' }, content: "I've completed the milestone definition for the marketing department. We've outlined the key campaigns for Q4 and their dependencies.", createdAt: '26m ago', likes: [], parentId: null },
    { id: '4', author: { id: '1', name: 'Marcia Cross' }, content: 'Great progress so far!', createdAt: '3m ago', likes: [], parentId: null },
    { id: '5', author: { id: '1', name: 'Marcia Cross' }, content: 'Thanks! Glad we are aligned.', createdAt: '30m ago', likes: ['user-1'], parentId: '2', replies: [] }, // Reply to comment 2
]

const MOCK_FILES: SharedFile[] = [
    { id: '1', name: 'Spirit Estimate Name.doc', type: 'doc', dateShared: 'Jul 11, 2025', sharedBy: { id: '1', name: 'Marcia Cross' } },
    { id: '2', name: 'Project Estimate.pdf', type: 'pdf', dateShared: 'Jun 3, 2025', sharedBy: { id: '2', name: 'Agatha Mayer' } },
    { id: '3', name: 'Document_1.docx', type: 'doc', dateShared: 'Jun 2, 2025', sharedBy: { id: '1', name: 'Marcia Cross' } },
    { id: '4', name: 'Wiseless founder.png', type: 'image', dateShared: 'May 29, 2025', sharedBy: { id: '2', name: 'Agatha Mayer' } },
    { id: '5', name: 'Screenshot Sep 13,2024.png', type: 'image', dateShared: 'May 27, 2025', sharedBy: { id: '2', name: 'Agatha Mayer' } },
]

const MOCK_ACTIVITIES: Activity[] = [
    {
        id: '1',
        user: { id: '1', name: 'Marcia Cross' },
        type: 'status_change',
        details: 'zmieniła status zadania',
        timestamp: '2 godziny temu',
        metadata: { from: 'To do', to: 'In Progress' }
    },
    {
        id: '2',
        user: { id: '2', name: 'Agatha Mayer' },
        type: 'comment_added',
        details: 'dodała nowy komentarz do zadania',
        timestamp: '1 godzinę temu'
    },
    {
        id: '3',
        user: { id: '1', name: 'Marcia Cross' },
        type: 'label_added',
        details: 'dodała etykietę do zadania',
        timestamp: '45 minut temu',
        metadata: { labelName: 'Priority', labelColor: '#ef4444' }
    },
    {
        id: '4',
        user: { id: '2', name: 'Agatha Mayer' },
        type: 'assignment',
        details: 'przypisała zadanie do Marcia Cross',
        timestamp: '15 minut temu'
    }
]

// File type icons
const FileTypeIcon = ({ type }: { type: string }) => {
    const colors: Record<string, string> = {
        doc: '#3b82f6',
        pdf: '#ef4444',
        image: '#10b981',
        other: '#6b7280'
    }
    return (
        <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${colors[type]}20` }}
        >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M8 6C8 4.89543 8.89543 4 10 4H18L24 10V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z" fill={colors[type]} />
                <path d="M18 4V8C18 9.10457 18.8954 10 20 10H24" fill={`${colors[type]}80`} />
            </svg>
        </div>
    )
}

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

// Tab Button
const TabButton = ({
    active,
    onClick,
    icon,
    activeIcon,
    label
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    activeIcon: React.ReactNode
    label: string
}) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${active
            ? 'text-[#F2CE88] border-[#F2CE88]'
            : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
    >
        {active ? activeIcon : icon}
        {label}
    </button>
)

// Priority Badge
const PriorityBadge = ({ priority }: { priority: string }) => {
    const config: Record<string, { label: string; color: string; bg: string }> = {
        urgent: { label: 'Pilne', color: 'text-red-400', bg: 'bg-red-500/20' },
        high: { label: 'Wysoki', color: 'text-orange-400', bg: 'bg-orange-500/20' },
        medium: { label: 'Średni', color: 'text-amber-400', bg: 'bg-amber-500/20' },
        low: { label: 'Niski', color: 'text-green-400', bg: 'bg-green-500/20' },
    }
    const { label, color, bg } = config[priority] || config.medium
    return (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${bg} ${color}`}>
            {label}
        </span>
    )
}

// SubtaskItem moved to SubtaskList.tsx



// Main Component
export function TaskDetailsPanel({
    task,
    isOpen,
    onClose,
    subitems = MOCK_SUBTASKS,
    comments: propComments = MOCK_COMMENTS,
    sharedFiles = MOCK_FILES,
    activities: propActivities = MOCK_ACTIVITIES,
    onSubtaskToggle,
    onSubtasksChange,
    onAddComment,
    availableLabels: propAvailableLabels,
    onCreateLabel: propOnCreateLabel,
}: TaskDetailsPanelProps) {
    const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'shared' | 'activity'>('subtasks')
    const panelRef = useRef<HTMLDivElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

    // Sync isOpen with global panel store
    useEffect(() => {
        setIsPanelOpen(isOpen)
    }, [isOpen, setIsPanelOpen])

    // Subtasks state for interactive demo
    const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subitems)

    // Sync subtasks changes with parent component
    useEffect(() => {
        onSubtasksChange?.(localSubtasks)
    }, [localSubtasks, onSubtasksChange])

    // Labels state - use props if provided, otherwise fall back to defaults
    const [taskLabels, setTaskLabels] = useState<Label[]>(task?.labels || [])

    // Assignees state for interactive demo
    const [localAssignees, setLocalAssignees] = useState<Assignee[]>(
        task?.assignees?.map(a => ({ id: a.id, name: a.name, avatar: a.avatar })) || []
    )


    // Comments state for interactive demo
    const [localComments, setLocalComments] = useState<Comment[]>(propComments)

    // Activities state for interactive demo
    const [localActivities, setLocalActivities] = useState<Activity[]>(propActivities)

    const defaultLabels: Label[] = [
        { id: 'bug', name: 'Bug', color: '#ef4444' },
        { id: 'feature', name: 'Feature', color: '#10b981' },
        { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
        { id: 'backend', name: 'Backend', color: '#8b5cf6' },
        { id: 'design', name: 'Design', color: '#ec4899' },
        { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
    ]
    const availableLabels = propAvailableLabels || defaultLabels

    const handleCreateLabel = async (name: string, color: string): Promise<Label> => {
        if (propOnCreateLabel) {
            return propOnCreateLabel(name, color)
        }
        const newLabel: Label = { id: `label_${Date.now()}`, name, color }
        return newLabel
    }

    // Reply state
    const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null)

    const handleSubtaskToggle = (subtaskId: string) => {
        onSubtaskToggle?.(subtaskId)

        // Find the subtask to get its title
        const subtask = subitems.find(s => s.id === subtaskId)
        if (subtask) {
            const isNowDone = !(subtask.status === 'done' || subtask.completed)
            const newActivity: Activity = {
                id: `activity_${Date.now()}`,
                user: { id: 'user-1', name: 'Ja (Ty)' },
                type: 'status_change',
                details: `${isNowDone ? 'ukończył(a)' : 'przywrócił(a)'} podzadanie: ${subtask.title}`,
                timestamp: 'Przed chwilą'
            }
            setLocalActivities(prev => [newActivity, ...prev])
        }
    }

    const handleLikeComment = (commentId: string) => {
        setLocalComments(prev => prev.map(comment => {
            if (comment.id === commentId) {
                const currentLikes = comment.likes || []
                const isLiked = currentLikes.includes('user-1')

                // Optional: Log like activity (commented out to avoid clutter, but could be added)
                /*
                const newActivity: Activity = {
                    id: `activity_${Date.now()}_like`,
                    user: { id: 'user-1', name: 'Ja (Ty)' },
                    type: 'comment_added',
                    details: `${isLiked ? 'przestał(a) lubić' : 'polubił(a)'} komentarz ${comment.author.name}`,
                    timestamp: 'Przed chwilą'
                }
                setLocalActivities(prev => [newActivity, ...prev])
                */

                return {
                    ...comment,
                    likes: isLiked
                        ? currentLikes.filter(id => id !== 'user-1')
                        : [...currentLikes, 'user-1']
                }
            }
            return comment
        }))
    }

    const handleReplyToComment = (commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, author: authorName })
    }

    const handleSendComment = (content: string) => {
        const newCommentObj: Comment = {
            id: `comment_${Date.now()}`,
            author: { id: 'user-1', name: 'Ja (Ty)' },
            content,
            createdAt: 'Przed chwilą',
            likes: [],
            parentId: replyingTo?.id || null,
            replies: []
        }

        setLocalComments(prev => [...prev, newCommentObj])

        // Log activity
        const newActivity: Activity = {
            id: `activity_${Date.now()}`,
            user: { id: 'user-1', name: 'Ja (Ty)' },
            type: 'comment_added',
            details: replyingTo ? `odpowiedział(a) na komentarz ${replyingTo.author}` : 'dodał(a) nowy komentarz',
            timestamp: 'Przed chwilą'
        }
        setLocalActivities(prev => [newActivity, ...prev])

        onAddComment?.(content)
        setReplyingTo(null)
    }

    const handleLabelChange = (labels: Label[]) => {
        setTaskLabels(labels)

        // Simple logic to detect if it's an add or remove for logging
        if (labels.length > taskLabels.length) {
            const addedLabel = labels.find(l => !taskLabels.some(tl => tl.id === l.id))
            if (addedLabel) {
                const newActivity: Activity = {
                    id: `activity_${Date.now()}`,
                    user: { id: 'user-1', name: 'Ja (Ty)' },
                    type: 'label_added',
                    details: 'dodał(a) etykietę',
                    timestamp: 'Przed chwilą',
                    metadata: { labelName: addedLabel.name, labelColor: addedLabel.color }
                }
                setLocalActivities(prev => [newActivity, ...prev])
            }
        }
    }

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

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    if (!task) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-lg bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
                    }`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 rounded-t-2xl">
                    {/* Top row with collapse and actions */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Zamknij"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 17L18 12L13 7" />
                                <path d="M6 17L11 12L6 7" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M3 9H21" />
                                </svg>
                            </button>
                            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3H21V9" />
                                    <path d="M21 3L14 10" />
                                </svg>
                            </button>
                            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="5" r="2" />
                                    <circle cx="12" cy="12" r="2" />
                                    <circle cx="12" cy="19" r="2" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Task Title */}
                    <h2 className="text-xl font-bold text-white mb-4">{task.title}</h2>

                    {/* Task Meta */}
                    <div className="space-y-3">
                        {/* Project */}
                        {task.projectName && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500 w-20">Project</span>
                                <span className="text-sm text-white">{task.projectName}</span>
                            </div>
                        )}

                        {/* Assignees */}
                        <div className="flex items-start gap-4">
                            <span className="text-sm text-gray-500 w-20 pt-2">Assignee</span>
                            <div className="flex-1">
                                <AssigneePicker
                                    selectedAssignees={localAssignees}
                                    onSelect={setLocalAssignees}
                                    maxVisible={2}
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 w-20">Status</span>
                            <StatusBadge status={task.status} />
                        </div>

                        {/* Due Date */}
                        {task.dueDate && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500 w-20">End Date</span>
                                <span className="text-sm text-white">{task.dueDate}</span>
                            </div>
                        )}

                        {/* Priority */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 w-20">Priority</span>
                            <PriorityBadge priority={task.priority} />
                        </div>

                        {/* Labels */}
                        <div className="flex items-start gap-4">
                            <span className="text-sm text-gray-500 w-20 pt-2">Labels</span>
                            <div className="flex-1">
                                <LabelPicker
                                    selectedLabels={taskLabels}
                                    availableLabels={availableLabels}
                                    onSelect={handleLabelChange}
                                    onCreateNew={handleCreateLabel}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <div className="flex-none p-6 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
                        <p className="text-sm text-gray-400 leading-relaxed break-words">{task.description}</p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex-none border-b border-gray-800">
                    <div className="flex gap-2 px-6">
                        <TabButton
                            active={activeTab === 'subtasks'}
                            onClick={() => setActiveTab('subtasks')}
                            icon={<DocumentIcon />}
                            activeIcon={<DocumentIconGold />}
                            label="Subtasks"
                        />
                        <TabButton
                            active={activeTab === 'comments'}
                            onClick={() => setActiveTab('comments')}
                            icon={<CommentIcon />}
                            activeIcon={<CommentIconGold />}
                            label="Comments"
                        />
                        <TabButton
                            active={activeTab === 'shared'}
                            onClick={() => setActiveTab('shared')}
                            icon={<PaperclipIcon />}
                            activeIcon={<PaperclipIconGold />}
                            label="Shared"
                        />
                        <TabButton
                            active={activeTab === 'activity'}
                            onClick={() => setActiveTab('activity')}
                            icon={<HistoryIcon />}
                            activeIcon={<HistoryIconGold />}
                            label="Activity"
                        />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Subtasks Tab */}
                    {activeTab === 'subtasks' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Podzadania</h3>
                                <span className="text-xs text-gray-500">{localSubtasks.filter(s => s.status === 'done' || s.completed).length}/{localSubtasks.length}</span>
                            </div>
                            <SubtaskList
                                subtasks={localSubtasks}
                                onToggle={(subtaskId) => {
                                    setLocalSubtasks(prev => prev.map(s =>
                                        s.id === subtaskId
                                            ? { ...s, status: s.status === 'done' ? 'todo' : 'done', completed: s.status !== 'done' }
                                            : s
                                    ))
                                    handleSubtaskToggle(subtaskId)
                                }}
                                onReorder={(newOrder) => setLocalSubtasks(newOrder)}
                                onEdit={(id, updates) => {
                                    setLocalSubtasks(prev => prev.map(s =>
                                        s.id === id ? { ...s, ...updates } : s
                                    ))
                                }}
                                onDelete={(id) => {
                                    setLocalSubtasks(prev => prev.filter(s => s.id !== id))
                                }}
                                onAdd={(title, afterId) => {
                                    if (title.trim()) {
                                        const newSubtask: Subtask = {
                                            id: `subtask_${Date.now()}`,
                                            title: title.trim(),
                                            status: 'todo',
                                            priority: 'medium',
                                        }
                                        if (afterId) {
                                            // Insert after the specified subtask
                                            setLocalSubtasks(prev => {
                                                const index = prev.findIndex(s => s.id === afterId)
                                                if (index !== -1) {
                                                    const newList = [...prev]
                                                    newList.splice(index + 1, 0, newSubtask)
                                                    return newList
                                                }
                                                return [...prev, newSubtask]
                                            })
                                        } else {
                                            // Add at the end
                                            setLocalSubtasks(prev => [...prev, newSubtask])
                                        }
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <div className="flex flex-col h-full bg-[#12121a]">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-semibold text-white">Dyskusja</h3>
                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded-full">{localComments.length}</span>
                                </div>
                                <CommentList
                                    comments={localComments}
                                    currentUserId="user-1"
                                    onLike={handleLikeComment}
                                    onReply={handleReplyToComment}
                                />
                            </div>

                            <CommentInput
                                onSend={handleSendComment}
                                replyingTo={replyingTo}
                                onCancelReply={() => setReplyingTo(null)}
                            />
                        </div>
                    )}

                    {/* Shared Tab */}
                    {activeTab === 'shared' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Shared</h3>
                                <div className="flex items-center gap-2">
                                    <button className="px-3 py-1 text-xs font-medium text-white bg-gray-800 rounded-full">Files</button>
                                    <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">Links</button>
                                </div>
                            </div>

                            {/* Files Table */}
                            <div className="rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left bg-gray-800/50 rounded-xl">
                                            <th className="px-4 py-3 text-xs font-medium text-gray-400 first:rounded-l-xl">Name</th>
                                            <th className="px-4 py-3 text-xs font-medium text-gray-400">Date Shared</th>
                                            <th className="px-4 py-3 text-xs font-medium text-gray-400">Shared By</th>
                                            <th className="px-4 py-3 w-10 last:rounded-r-xl"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sharedFiles.map(file => (
                                            <tr key={file.id} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <FileTypeIcon type={file.type} />
                                                        <span className="text-sm text-white">{file.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-400">{file.dateShared}</td>
                                                <td className="px-4 py-3">
                                                    <Avatar name={file.sharedBy.name} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button className="p-1 text-gray-500 hover:text-amber-400 transition-colors">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" />
                                                            <path d="M7 10L12 15L17 10" />
                                                            <path d="M12 15V3" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-semibold text-white">Aktywność</h3>
                                <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded-full">{localActivities.length}</span>
                            </div>
                            <ActivityFeed activities={localActivities} />
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
