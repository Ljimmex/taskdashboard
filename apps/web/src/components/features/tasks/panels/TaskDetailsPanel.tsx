import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from '@tanstack/react-router'
import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { usePanelStore } from '../../../../lib/panelStore'
import { StatusBadge } from '../components/StatusBadge'
import type { Label } from '../../labels/LabelBadge'
import { DocumentIcon, DocumentIconGold, CommentIcon, CommentIconGold, PaperclipIcon, PaperclipIconGold, HistoryIcon, HistoryIconGold } from '../components/TaskIcons'
import { PriorityBadge } from '../components/PrioritySelector'
import { LinksList } from '../links/LinksList'
import type { TaskLink } from '@taskdashboard/types'
import { CommentList } from '../../comments/CommentList'
import { CommentInput } from '../../comments/CommentInput'
import { ActivityFeed, type Activity } from '@/components/common/ActivityFeed'
import { Marquee } from '@/components/ui/Marquee'
import type { Comment } from '../../comments/CommentList'
import type { TaskCardProps } from '../components/TaskCard'
import { SubtaskList, type Subtask } from '../subtasks/SubtaskList'
import type { Assignee } from '../components/AssigneePicker'
import { useTaskFiles } from '../../../../hooks/useTaskFiles'
import { useTasks } from '../../../../hooks/useTasks'
import {
    ChevronsRight,
    CheckCircle2,
    Maximize2,
    Minimize2,
    Link as LinkIcon,
    Paperclip,
    MoreHorizontal,
    Edit2,
    Trash2
} from 'lucide-react'

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
    subtasks?: Subtask[]
    comments?: Comment[]
    onSubtaskToggle?: (subtaskId: string) => void
    onSubtasksChange?: (subtasks: Subtask[]) => void
    onAddComment?: (content: string, parentId?: string | null) => void
    onLikeComment?: (commentId: string) => void
    onAddSubtask?: (title: string, subtask?: Subtask) => void
    onEdit?: (subtaskId: string, updates: Partial<Subtask>) => void
    onDelete?: (subtaskId: string) => void
    onArchive?: () => void
    onAssigneesChange?: (assignees: Assignee[]) => void
    onLabelsChange?: (labels: Label[]) => void
    activities?: Activity[]
    availableLabels?: Label[]
    onCreateLabel?: (name: string, color: string) => Promise<Label | undefined>
    stages?: { id: string; name: string; color: string; position: number }[]
    teamMembers?: Assignee[]
    onTaskClick?: (taskId: string) => void
    onEditTask?: () => void
    onDeleteTask?: () => void
    onToggleStatus?: () => void
}

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
const Avatar = ({ name, image, avatar, size = 'sm' }: { name: string; image?: string; avatar?: string; size?: 'sm' | 'md' }) => {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
    const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'

    const imageUrl = image || avatar
    if (imageUrl) {
        return <img src={imageUrl} alt={name} className={`${sizeClass} rounded-full object-cover`} />
    }

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
        className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg font-medium text-sm transition-all flex-1 min-w-0 ${active
            ? 'bg-amber-500/10 text-amber-500'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
    >
        <div className="flex-shrink-0">{active ? activeIcon : icon}</div>
        <Marquee className="flex-1" speed={20}>
            {label}
        </Marquee>
    </button>
)



// SubtaskItem moved to SubtaskList.tsx



// Main Component
export function TaskDetailsPanel({
    task,
    isOpen,
    onClose,
    subtasks = [],
    comments: propComments = [],
    activities: propActivities = [],
    onSubtaskToggle,
    onAddComment,
    onLikeComment,
    onLabelsChange,
    onArchive,
    availableLabels: propAvailableLabels,
    stages = [],
    teamMembers = [],
    onTaskClick,
    onEditTask,
    onDeleteTask,
    onToggleStatus,
}: TaskDetailsPanelProps) {
    const { t, i18n } = useTranslation()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'shared' | 'activity'>(task?.type === 'meeting' ? 'comments' : 'subtasks')
    const [sharedView, setSharedView] = useState<'files' | 'links'>('files')
    const panelRef = useRef<HTMLDivElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const [isMaximized, setIsMaximized] = useState(false)
    const [showMoreMenu, setShowMoreMenu] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const moreMenuRef = useRef<HTMLDivElement>(null)

    // Handle click outside for more menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMoreMenu(false)
            }
        }
        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showMoreMenu])

    // Fetch tasks to resolve dependencies
    const { data: allTasks = [] } = useTasks(workspaceSlug)
    const dependsOnIds = (task as any)?.dependsOn || []
    const dependentTasks = allTasks.filter(t => dependsOnIds.includes(t.id))
    const isBlocked = dependentTasks.some(dep => !dep.isCompleted)

    // Fetch task files
    const { data: taskFiles = [] } = useTaskFiles(task?.id)

    // Extract links from task
    const taskLinks = (task as any)?.links as TaskLink[] || []

    // Map task files to SharedFile format
    const mappedFiles: SharedFile[] = taskFiles.map(f => {
        // Determine file type from mime type
        let fileType: 'doc' | 'pdf' | 'image' | 'other' = 'other'
        if (f.mimeType?.includes('pdf')) fileType = 'pdf'
        else if (f.mimeType?.startsWith('image/')) fileType = 'image'
        else if (f.mimeType?.includes('document') || f.mimeType?.includes('word')) fileType = 'doc'

        return {
            id: f.id,
            name: f.name,
            type: fileType,
            dateShared: new Date(f.createdAt).toLocaleDateString(i18n.language, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }),
            sharedBy: {
                id: f.uploader?.id || 'unknown',
                name: f.uploader?.name || 'Unknown',
                avatar: f.uploader?.image || undefined
            }
        }
    })

    // Sync isOpen with global panel store
    useEffect(() => {
        setIsPanelOpen(isOpen)
    }, [isOpen, setIsPanelOpen])

    // Specific logic for meetings: switch to comments tab when opened
    useEffect(() => {
        if (isOpen && task?.type === 'meeting' && activeTab === 'subtasks') {
            setActiveTab('comments')
        }
    }, [isOpen, task?.type])

    // Use props directly - no local state syncing needed
    // Parent component is responsible for data and refetching after mutations

    // Labels (from task props - resolve IDs to objects)
    const availableLabels = propAvailableLabels || [
        { id: 'bug', name: 'Bug', color: '#ef4444' },
        { id: 'feature', name: 'Feature', color: '#10b981' },
        { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
        { id: 'backend', name: 'Backend', color: '#8b5cf6' },
        { id: 'design', name: 'Design', color: '#ec4899' },
        { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
    ]

    const taskLabelIds = (task?.labels as unknown as string[]) || []
    const taskLabels = taskLabelIds
        .map(id => availableLabels.find(l => l.id === id))
        .filter((l): l is Label => !!l)

    // Assignees (from task props - favor assigneeDetails for rich info)
    const assignees = task?.assigneeDetails || task?.assignees || []

    // Comments (from props)
    const comments = propComments

    // Activities (from props)
    const activities = propActivities

    // Reply state (this one is fine as local UI state)
    const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null)

    const handleSubtaskToggle = (subtaskId: string) => {
        // Just call the callback - parent handles API and refetch
        onSubtaskToggle?.(subtaskId)
    }

    const handleLikeComment = (commentId: string) => {
        // Just call the callback - parent handles API and refetch
        onLikeComment?.(commentId)
    }

    const handleReplyToComment = (commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, author: authorName })
    }

    const handleSendComment = (content: string) => {
        if (!content.trim()) return
        // Just call the callback - parent handles API and refetch
        onAddComment?.(content, replyingTo?.id)
        setReplyingTo(null)
    }

    const handleDownload = async (fileId: string) => {
        try {
            const { apiFetchJson } = await import('@/lib/api')
            const json = await apiFetchJson<any>(`/api/files/${fileId}/download`)
            const { downloadUrl } = json
            window.open(downloadUrl, '_blank')
        } catch (error) {
            console.error('Download failed:', error)
            alert(t('files.messages.download_failed') + ' ' + (error as Error).message)
        }
    }

    // Unused: handleLabelChange removed - TaskDetailsPanel is now read-only
    void onLabelsChange // Suppress lint warning - prop kept for interface compatibility

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
                className={`fixed top-4 right-4 bottom-4 w-full bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-all duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
                    } ${isMaximized ? 'max-w-5xl' : 'max-w-lg'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 rounded-t-2xl">
                    {/* Top row with collapse and actions */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                title={t('projects.details.close')}
                            >
                                <ChevronsRight size={18} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (onToggleStatus) onToggleStatus()
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${task.isCompleted
                                    ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                                title={task.isCompleted ? t('tasks.details.mark_incomplete', { defaultValue: 'Oznacz jako niedokończone' }) : t('tasks.details.mark_complete', { defaultValue: 'Oznacz jako gotowe' })}
                            >
                                <CheckCircle2 size={16} className={task.isCompleted ? 'fill-emerald-500/20' : ''} />
                                <span>{task.isCompleted ? t('tasks.status.done', { defaultValue: 'Gotowe' }) : t('tasks.details.mark_complete', { defaultValue: 'Oznacz jako gotowe' })}</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                title={isMaximized ? t('tasks.details.minimize') : t('tasks.details.maximize')}
                            >
                                {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>

                            <div className="relative flex items-center">
                                <button
                                    onClick={() => {
                                        const url = new URL(window.location.href)
                                        url.searchParams.set('taskId', task.id)
                                        navigator.clipboard.writeText(url.toString())
                                        setIsCopied(true)
                                        setTimeout(() => setIsCopied(false), 2000)
                                    }}
                                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                    title={t('tasks.details.copy_link')}
                                >
                                    <LinkIcon size={18} />
                                </button>
                                {isCopied && (
                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-xs px-2.5 py-1.5 rounded-md shadow-xl text-white whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-2">
                                        {t('tasks.details.copied', 'Copied!')}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => setActiveTab('shared')}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                title={t('tasks.details.attachments')}
                            >
                                <Paperclip size={18} />
                            </button>

                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                    className={`p-2 rounded-lg transition-colors ${showMoreMenu ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                                    title={t('tasks.details.more_options')}
                                >
                                    <MoreHorizontal size={18} />
                                </button>

                                {showMoreMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a24] rounded-xl shadow-2xl py-1.5 z-[100]">
                                        {(onEditTask !== undefined) && (
                                            <button
                                                onClick={() => {
                                                    setShowMoreMenu(false)
                                                    onEditTask()
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-2"
                                            >
                                                <Edit2 size={14} />
                                                {t('common.edit', { defaultValue: 'Edytuj' })}
                                            </button>
                                        )}
                                        {onDeleteTask && (
                                            <button
                                                onClick={() => {
                                                    setShowMoreMenu(false)
                                                    onDeleteTask()
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 flex items-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                {t('common.delete', { defaultValue: 'Usuń' })}
                                            </button>
                                        )}
                                        {onArchive && (
                                            <button
                                                onClick={() => {
                                                    setShowMoreMenu(false)
                                                    onArchive()
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 flex items-center gap-2"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
                                                    <rect x="4" y="12" width="24" height="16" rx="3" fill="currentColor" opacity="0.7" />
                                                    <rect x="6" y="8" width="20" height="4" rx="1" fill="currentColor" />
                                                </svg>
                                                {t('projects.menu.archive')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Task Title */}
                    <div className="flex items-start gap-3 mb-4">
                        {isBlocked && (
                            <div className="mt-1 flex-shrink-0" title={t('tasks.blocked_by_dependencies')}>
                                <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 12V8C9 4.13401 12.134 1 16 1C19.866 1 23 4.13401 23 8V12" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                                    <rect x="5" y="12" width="22" height="18" rx="3" fill="#9E9E9E" />
                                    <circle cx="16" cy="21" r="3" fill="#545454" />
                                </svg>
                            </div>
                        )}
                        <h2 className={`text-xl font-bold ${isBlocked ? 'text-gray-500' : (task.isCompleted ? 'line-through text-gray-500' : 'text-white')}`}>
                            {task.title}
                        </h2>
                    </div>

                    {/* Task Meta */}
                    <div className="space-y-3">
                        {/* Project */}
                        {task.projectName && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500 w-24 flex-shrink-0">{t('projects.details.meta.project')}</span>
                                <div className="w-64 overflow-hidden border-b border-gray-800/30">
                                    <Marquee className="text-sm text-white" speed={25}>
                                        {task.projectName}
                                    </Marquee>
                                </div>
                            </div>
                        )}

                        {/* Assignees - Read Only */}
                        <div className="flex items-start gap-4 h-8">
                            <span className="text-sm text-gray-500 w-24 pt-[5px] flex-shrink-0">{t('projects.details.meta.assignee')}</span>
                            <div className="flex-1">
                                {assignees.length > 0 ? (
                                    <div className="flex flex-row items-center gap-1">
                                        {assignees.slice(0, 2).map((a: any) => (
                                            <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a24] rounded-full">
                                                {a.avatar || (a as any).image ? (
                                                    <img src={a.avatar || (a as any).image} alt={a.name} className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                                        {a.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-gray-200">{a.name}</span>
                                            </div>
                                        ))}
                                        {assignees.length > 2 && (
                                            <div className="group relative">
                                                <div className="flex items-center justify-center w-7 h-7 bg-gray-800 rounded-full cursor-default">
                                                    <span className="text-xs font-medium text-gray-300">+{assignees.length - 2}</span>
                                                </div>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 py-2 px-3 bg-[#1a1a24] border border-gray-800 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[150px] flex flex-col gap-2">
                                                    {assignees.slice(2).map((a: any) => (
                                                        <div key={a.id} className="flex items-center gap-2">
                                                            {a.avatar || (a as any).image ? (
                                                                <img src={a.avatar || (a as any).image} alt={a.name} className="w-5 h-5 rounded-full" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                                    {a.name.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span className="text-xs text-gray-300 truncate">{a.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-500 pt-[5px] block">{t('projects.details.no_assignees')}</span>
                                )}
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 w-24 flex-shrink-0">{t('projects.details.meta.status')}</span>
                            <div className="w-64 text-left">
                                <StatusBadge status={task.status} stages={stages} />
                            </div>
                        </div>

                        {/* Due Date */}
                        {task.dueDate && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500 w-24 flex-shrink-0">{t('projects.details.meta.end_date')}</span>
                                <div className="w-64 overflow-hidden">
                                    <span className="text-sm text-white block truncate">
                                        {new Date(task.dueDate).toLocaleDateString(i18n.language, {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Priority */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 w-24 flex-shrink-0">{t('projects.details.meta.priority')}</span>
                            <div className="w-64 text-left">
                                <PriorityBadge priority={task.priority} />
                            </div>
                        </div>

                        {/* Labels - Read Only */}
                        <div className="flex items-start gap-4">
                            <span className="text-sm text-gray-500 w-24 pt-0.5 flex-shrink-0">{t('projects.details.meta.labels')}</span>
                            <div className="w-64">
                                {taskLabels.length > 0 ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {taskLabels.map(label => (
                                            <span
                                                key={label.id}
                                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                style={{ backgroundColor: `${label.color}20`, color: label.color }}
                                            >
                                                {label.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-500">{t('projects.details.no_labels')}</span>
                                )}
                            </div>
                        </div>

                        {/* Depends On - Read Only */}
                        {dependentTasks.length > 0 && (
                            <div className="flex items-start gap-4">
                                <span className="text-sm text-gray-500 w-24 pt-0.5 flex-shrink-0">{t('tasks.create.dependencies')}</span>
                                <div className="w-64">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {dependentTasks.slice(0, 3).map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => onTaskClick?.(t.id)}
                                                className={`flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded-full max-w-[220px] overflow-hidden transition-colors ${onTaskClick ? 'cursor-pointer hover:bg-gray-700' : ''}`}
                                            >
                                                <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0" style={{ maxWidth: '100%' }}>
                                                    {t.title.length > 20 ? (
                                                        <Marquee className="text-xs text-gray-300 font-medium" speed={20}>
                                                            <span className="mr-8">{t.title}</span>
                                                        </Marquee>
                                                    ) : (
                                                        <span className="text-xs text-gray-300 font-medium truncate block">{t.title}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {dependentTasks.length > 3 && (
                                            <div className="relative group">
                                                <span className="inline-flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider px-2 py-1 bg-gray-800 rounded-full cursor-default mt-1 opacity-80 hover:opacity-100 transition-opacity">
                                                    {t('tasks.details.dependencies_more', { count: dependentTasks.length - 3 })}
                                                </span>
                                                <div className="absolute left-0 top-full mt-1 w-64 bg-[#1a1a24] rounded-lg border border-gray-800 shadow-xl p-2 z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                                                    {dependentTasks.slice(3).map(t => (
                                                        <div
                                                            key={t.id}
                                                            onClick={() => onTaskClick?.(t.id)}
                                                            className={`text-xs text-gray-300 truncate py-1.5 px-2 rounded-md transition-colors ${onTaskClick ? 'cursor-pointer hover:bg-gray-800 text-amber-500/80 hover:text-amber-400' : ''}`}
                                                        >
                                                            {t.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <div className="flex-none p-6 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white mb-2">{t('projects.details.description')}</h3>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            <div className="prose prose-sm prose-invert max-w-none text-gray-400 leading-relaxed break-words [&>h1]:text-white [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-white [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1.5 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mb-2 [&>li]:mb-1 [&>blockquote]:border-l-2 [&>blockquote]:border-amber-500 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-gray-500 [&>code]:bg-gray-800 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-amber-400 [&>code]:text-xs [&>strong]:text-white [&>strong]:font-semibold [&>em]:italic">
                                <Markdown rehypePlugins={[rehypeSanitize]}>{task.description}</Markdown>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex-none border-b border-gray-800">
                    <div className="flex gap-1 px-4 py-2">
                        {task?.type !== 'meeting' && (
                            <TabButton
                                active={activeTab === 'subtasks'}
                                onClick={() => setActiveTab('subtasks')}
                                icon={<DocumentIcon />}
                                activeIcon={<DocumentIconGold />}
                                label={t('projects.details.tabs.subtasks')}
                            />
                        )}
                        <TabButton
                            active={activeTab === 'comments'}
                            onClick={() => setActiveTab('comments')}
                            icon={<CommentIcon />}
                            activeIcon={<CommentIconGold />}
                            label={t('projects.details.tabs.comments')}
                        />
                        <TabButton
                            active={activeTab === 'shared'}
                            onClick={() => setActiveTab('shared')}
                            icon={<PaperclipIcon />}
                            activeIcon={<PaperclipIconGold />}
                            label={t('projects.details.tabs.shared')}
                        />
                        <TabButton
                            active={activeTab === 'activity'}
                            onClick={() => setActiveTab('activity')}
                            icon={<HistoryIcon />}
                            activeIcon={<HistoryIconGold />}
                            label={t('projects.details.tabs.activity')}
                        />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Subtasks Tab */}
                    {activeTab === 'subtasks' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">{t('projects.details.subtasks.title')}</h3>
                                <span className="text-xs text-gray-500">{subtasks.filter(s => s.isCompleted).length}/{subtasks.length}</span>
                            </div>
                            <SubtaskList
                                subtasks={subtasks}
                                readOnly={true}
                                availableAssignees={teamMembers}
                                onToggle={isBlocked ? undefined : handleSubtaskToggle}
                            />
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <div className="flex flex-col h-full bg-[#12121a]">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-semibold text-white">{t('projects.details.discussion.title')}</h3>
                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded-full">{comments.length}</span>
                                </div>
                                <CommentList
                                    comments={comments}
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
                            {/* Files/Links Toggle */}
                            <div className="flex items-center gap-4 mb-4 border-b border-gray-800">
                                <button
                                    onClick={() => setSharedView('files')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${sharedView === 'files'
                                        ? 'text-amber-500 border-amber-500'
                                        : 'text-gray-400 border-transparent hover:text-gray-300'
                                        }`}
                                >
                                    {t('projects.details.shared.files')}
                                </button>
                                <button
                                    onClick={() => setSharedView('links')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${sharedView === 'links'
                                        ? 'text-amber-500 border-amber-500'
                                        : 'text-gray-400 border-transparent hover:text-gray-300'
                                        }`}
                                >
                                    {t('projects.details.shared.links')}
                                </button>
                            </div>

                            {/* Files View */}
                            {sharedView === 'files' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                                                <th className="pb-3 font-medium min-w-[150px] whitespace-nowrap">{t('projects.details.shared.name')}</th>
                                                <th className="pb-3 font-medium min-w-[120px] whitespace-nowrap">{t('projects.details.shared.shared_by')}</th>
                                                <th className="pb-3 font-medium min-w-[100px] whitespace-nowrap">{t('projects.details.shared.date')}</th>
                                                <th className="pb-3 font-medium w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mappedFiles.map((file) => (
                                                <tr key={file.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                                    <td className="py-3 max-w-[200px]">
                                                        <div className="flex items-center gap-3 pr-4">
                                                            <FileTypeIcon type={file.type} />
                                                            <span className="text-sm text-white font-medium truncate" title={file.name}>{file.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2 pr-4">
                                                            <Avatar name={file.sharedBy.name} size="sm" />
                                                            <span className="text-sm text-gray-400 truncate max-w-[120px]" title={file.sharedBy.name}>{file.sharedBy.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="text-sm text-gray-500 whitespace-nowrap">{file.dateShared}</span>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <button
                                                            onClick={() => handleDownload(file.id)}
                                                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                                            title={t('files.actions.download')}
                                                        >
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" />
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
                            )}

                            {/* Links View */}
                            {sharedView === 'links' && (
                                <LinksList links={taskLinks} readOnly={true} />
                            )}
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-semibold text-white">{t('projects.details.activity.title')}</h3>
                                <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded-full">{activities.length}</span>
                            </div>
                            <ActivityFeed activities={activities} />
                        </div>
                    )}
                </div>
            </div >
        </>
    )
}
