import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
    teamMembers?: { id: string; name: string; avatar?: string }[]
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
}: TaskDetailsPanelProps) {
    const { t, i18n } = useTranslation()
    const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'shared' | 'activity'>(task?.type === 'meeting' ? 'comments' : 'subtasks')
    const [sharedView, setSharedView] = useState<'files' | 'links'>('files')
    const panelRef = useRef<HTMLDivElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

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
                            title={t('projects.details.close')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 17L18 12L13 7" />
                                <path d="M6 17L11 12L6 7" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2">
                            {onArchive && (
                                <button
                                    onClick={onArchive}
                                    className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition-colors"
                                    title={t('projects.details.archive')}
                                >
                                    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                                        <rect x="4" y="12" width="24" height="16" rx="3" fill="currentColor" opacity="0.7" />
                                        <rect x="6" y="8" width="20" height="4" rx="1" fill="currentColor" />
                                    </svg>
                                </button>
                            )}
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
                                <span className="text-sm text-gray-500 w-24 flex-shrink-0">{t('projects.details.meta.project')}</span>
                                <div className="w-64 overflow-hidden border-b border-gray-800/30">
                                    <Marquee className="text-sm text-white" speed={25}>
                                        {task.projectName}
                                    </Marquee>
                                </div>
                            </div>
                        )}

                        {/* Assignees - Read Only */}
                        <div className="flex items-start gap-4">
                            <span className="text-sm text-gray-500 w-24 pt-0.5 flex-shrink-0">{t('projects.details.meta.assignee')}</span>
                            <div className="w-64 overflow-hidden">
                                {assignees.length > 0 ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {assignees.map((a: any) => (
                                            <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded-full">
                                                {a.avatar || (a as any).image ? (
                                                    <img src={a.avatar || (a as any).image} alt={a.name} className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] font-bold text-black">
                                                        {a.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-300">{a.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-500">{t('projects.details.no_assignees')}</span>
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
                    </div>
                </div>

                {/* Description */}
                {task.description && (
                    <div className="flex-none p-6 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white mb-2">{t('projects.details.description')}</h3>
                        <div className="prose prose-sm prose-invert max-w-none text-gray-400 leading-relaxed break-words [&>h1]:text-white [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-white [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-white [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1.5 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mb-2 [&>li]:mb-1 [&>blockquote]:border-l-2 [&>blockquote]:border-amber-500 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-gray-500 [&>code]:bg-gray-800 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-amber-400 [&>code]:text-xs [&>strong]:text-white [&>strong]:font-semibold [&>em]:italic">
                            <Markdown rehypePlugins={[rehypeSanitize]}>{task.description}</Markdown>
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
                                onToggle={(subtaskId) => {
                                    handleSubtaskToggle(subtaskId)
                                }}
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
                                                <th className="pb-3 font-medium">{t('projects.details.shared.name')}</th>
                                                <th className="pb-3 font-medium">{t('projects.details.shared.shared_by')}</th>
                                                <th className="pb-3 font-medium">{t('projects.details.shared.date')}</th>
                                                <th className="pb-3 font-medium w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mappedFiles.map((file) => (
                                                <tr key={file.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-3">
                                                            <FileTypeIcon type={file.type} />
                                                            <span className="text-sm text-white font-medium">{file.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar name={file.sharedBy.name} size="sm" />
                                                            <span className="text-sm text-gray-400">{file.sharedBy.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="text-sm text-gray-500">{file.dateShared}</span>
                                                    </td>
                                                    <td className="py-3">
                                                        <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
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
