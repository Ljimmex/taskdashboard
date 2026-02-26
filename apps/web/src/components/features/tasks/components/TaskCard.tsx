import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { apiFetchJson } from '@/lib/api'
import { useTasks, isTaskBlocked } from '@/hooks/useTasks'
import { LabelBadge } from '../../labels/LabelBadge'
import { SubtaskProgress } from '@/components/common/ProgressBar'
import {
    PaperclipIcon,
    PaperclipIconGold,
    CommentIcon,
    CommentIconGold,
    DocumentIcon,
    DocumentIconGold,
    PriorityUrgentIcon,
    PriorityHighIcon,
    PriorityMediumIcon,
    PriorityLowIcon,
} from './TaskIcons'

// Types matching our API schema
interface TaskLabel {
    id: string
    name: string
    color: string
}

interface TaskAssignee {
    id: string
    name: string
    avatar?: string
    image?: string
}

interface Priority {
    id: string
    name: string
    color: string
    position: number
}

export interface TaskCardProps {
    id: string
    projectName?: string
    projectColor?: string
    title: string
    description?: string | null
    type?: 'task' | 'meeting'
    priority: string
    status: string // Can be any column ID
    assignees?: TaskAssignee[]
    assigneeDetails?: TaskAssignee[]
    labels?: TaskLabel[]
    dueDate?: string | Date
    meetingLink?: string // New prop
    isOverdue?: boolean
    subtaskCount?: number
    subtaskCompleted?: number
    commentCount?: number
    attachmentCount?: number
    subtasks?: { id: string; title: string; description?: string | null; isCompleted: boolean }[]
    dependsOn?: string[]
    isCompleted?: boolean
    onClick?: () => void
    onEdit?: () => void  // Quick edit (pencil icon)
    onFullEdit?: () => void  // Full edit panel (3-dot menu Edit)
    onDelete?: () => void
    onDuplicate?: () => void
    onArchive?: () => void
    isDragging?: boolean
    userRole?: string
    userId?: string
    onQuickUpdate?: (data: { id: string; title: string; priority: string; assigneeId?: string; dueDate?: string; assignees?: string[]; isCompleted?: boolean }) => void
    isCollapsedOverride?: boolean // Added for column-wide collapse override
}

// Icon mapping based on priority ID
const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
    'urgent': PriorityUrgentIcon,
    'high': PriorityHighIcon,
    'medium': PriorityMediumIcon,
    'low': PriorityLowIcon,
}

export function TaskCard({
    id: _id, // Available for use but not currently needed
    title,
    description,
    type = 'task',
    priority,
    assignees = [],
    assigneeDetails,
    labels = [],
    dueDate,
    meetingLink,
    subtaskCount = 0,
    subtaskCompleted = 0,
    commentCount = 0,
    attachmentCount = 0,
    dependsOn = [],
    isCompleted = false,
    onClick,
    onFullEdit,
    onDelete,
    onDuplicate,
    onArchive,
    isDragging = false,
    userRole,
    userId,
    onQuickUpdate,
    isCollapsedOverride,
}: TaskCardProps) {
    const { t, i18n } = useTranslation()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug?: string }
    const [showMenu, setShowMenu] = useState(false)
    const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down')
    const [isCollapsedState, setIsCollapsedState] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Sync override
    useEffect(() => {
        if (isCollapsedOverride !== undefined) {
            setIsCollapsedState(isCollapsedOverride)
        }
    }, [isCollapsedOverride])

    const isCollapsed = type !== 'meeting' && isCollapsedState

    // Check permissions
    const canManageTasks = userRole !== 'member' && userRole !== 'guest'

    // Fetch workspace priorities
    const { data: workspace } = useQuery({
        queryKey: ['workspace', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return null
            const res = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
            return res
        },
        enabled: !!workspaceSlug
    })

    // Compute blocked status
    const { data: allTasks = [] } = useTasks(workspaceSlug)
    const isBlocked = isTaskBlocked({ dependsOn } as any, allTasks)

    const priorities: Priority[] = workspace?.priorities || [
        { id: 'low', name: 'Low', color: '#6b7280', position: 0 },
        { id: 'medium', name: 'Medium', color: '#3b82f6', position: 1 },
        { id: 'high', name: 'High', color: '#f59e0b', position: 2 },
        { id: 'urgent', name: 'Urgent', color: '#ef4444', position: 3 },
    ]

    // Find current priority config
    const currentPriority = priorities.find(p => p.id === priority) || priorities[1]
    const PriorityIcon = ICON_MAP[currentPriority.id] || PriorityMediumIcon

    // Deduplicate labels and assignees to ensure rendering stability
    const safeLabels = useMemo(() => {
        if (!labels || labels.length === 0) return []
        return Array.from(new Map(labels.map(l => [l.id, l])).values())
    }, [labels])

    const safeAssignees = useMemo(() => {
        const source = (assigneeDetails?.length ? assigneeDetails : (assignees || [])) as TaskAssignee[]
        if (source.length === 0) return []
        // Deduplicate by ID
        return Array.from(new Map(source.map(a => [a.id, a])).values())
    }, [assignees, assigneeDetails])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMenuToggle = () => {
        if (!showMenu && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const spaceAbove = rect.top
            const spaceBelow = window.innerHeight - rect.bottom
            // Menu is ~180px tall, prefer downward
            setMenuDirection(spaceBelow >= 180 || spaceAbove < spaceBelow ? 'down' : 'up')
        }
        setShowMenu(!showMenu)
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        // For now, just toggle the menu visibility using the existing logic
        // In a future iteration, we could position it at cursor (e.clientX, e.clientY)
        // by changing the menu to fixed positioning.
        handleMenuToggle()
    }

    const handleAssignToMe = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (userId && onQuickUpdate) {
            // Check if already assigned
            const isAssigned = assignees.some(a => a.id === userId)
            if (!isAssigned) {
                // Add me to assignees
                // Extract existing IDs
                const currentAssigneeIds = assignees.map(a => a.id)
                onQuickUpdate({
                    id: _id,
                    title,
                    priority,
                    // We need to pass the FULL list of assignees including the new one
                    // The backend/API expects 'assignees' array of IDs usually, or we might need to check 'onQuickUpdate' signature.
                    // Looking at KanbanBoard, onQuickUpdate signature is:
                    // (data: { id: string; title: string; priority: string; assigneeId?: string; dueDate?: string })
                    // It seems it only supports single 'assigneeId' in the type definition in KanbanBoard.
                    // BUT AssigneePicker supports multiple.
                    // I updated the signature in TaskCardProps above to include optional `assignees?: string[]`.
                    // I need to ensure the parent handles it.
                    // For now, let's pass it.
                    assignees: [...currentAssigneeIds, userId],
                    assigneeId: userId // Backend expects singular assigneeId
                })
            }
        }
        setShowMenu(false)
    }

    const handleToggleCompletion = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isBlocked) return // Prevent if blocked
        if (onQuickUpdate) {
            onQuickUpdate({
                id: _id,
                title,
                priority,
                isCompleted: !isCompleted
            })
        }
        setShowMenu(false)
    }

    const isAssignedToMe = userId && assignees.some(a => a.id === userId)

    // Check if overdue
    const isOverdue = dueDate ? new Date(dueDate) < new Date() : false

    // Format date
    const formatDate = (dateStr: string | Date) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })
    }

    // Normal view mode
    return (
        <div
            onClick={onClick}
            className={`
                rounded-2xl bg-[#12121a] p-4 relative flex flex-col cursor-pointer
                transition-all duration-200
                ${isDragging ? 'opacity-50 rotate-2 scale-105 shadow-2xl' : 'hover:bg-[#16161f]'}
            `}
            onContextMenu={handleContextMenu}
        >
            {/* Right side controls: Menu + Chevron (if task) */}
            <div ref={menuRef} className="absolute top-4 right-4 flex items-center gap-1">
                {type !== 'meeting' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsCollapsedState(!isCollapsedState) }}
                        className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white transition-all bg-[#1a1a24]/50 border border-transparent hover:border-gray-700"
                        title={isCollapsedState ? "Expand" : "Collapse"}
                    >
                        {isCollapsedState ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 15l-6-6-6 6" />
                            </svg>
                        )}
                    </button>
                )}
                <button
                    ref={buttonRef}
                    onClick={(e) => { e.stopPropagation(); handleMenuToggle() }}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white transition-all"
                >
                    ⋮
                </button>

                {/* Dropdown Menu - smart positioning based on available space */}
                {showMenu && (
                    <div className={`absolute right-4 w-36 bg-[#1a1a24] rounded-xl shadow-2xl overflow-hidden z-50 p-2 space-y-1 ${menuDirection === 'up' ? 'bottom-full mb-2' : 'top-10'
                        }`}>
                        <button onClick={(e) => { e.stopPropagation(); onFullEdit?.(); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover/item:hidden">
                                <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#545454" />
                                <path d="M12 25L7 20L4 28L12 25Z" fill="#9E9E9E" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover/item:block">
                                <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#7A664E" />
                                <path d="M12 25L7 20L4 28L12 25Z" fill="#F2CE88" />
                            </svg>
                            {t('tasks.card.menu.edit')}
                        </button>

                        {type !== 'meeting' && !isAssignedToMe && (canManageTasks || userRole === 'member') && (
                            <button onClick={handleAssignToMe} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover/item:hidden">
                                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#545454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#545454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="hidden group-hover/item:block">
                                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#F2CE88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#F2CE88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {t('tasks.card.menu.assign_to_me')}
                            </button>
                        )}

                        {/* Mark as Done / Undone */}
                        {(canManageTasks || userRole === 'member') && (
                            <button
                                onClick={handleToggleCompletion}
                                disabled={isBlocked}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors group/item
                                    ${isBlocked ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88]'}`
                                }
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover/item:hidden">
                                    <path d="M20 6L9 17L4 12" stroke={isCompleted ? "#545454" : (isBlocked ? "#333333" : "#545454")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="hidden group-hover/item:block">
                                    <path d="M20 6L9 17L4 12" stroke={isBlocked ? "#333333" : "#F2CE88"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {isCompleted ? t('tasks.edit.mark_incomplete') : t('tasks.edit.mark_complete')}
                            </button>
                        )}

                        {canManageTasks && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); onDuplicate?.(); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item">
                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover/item:hidden">
                                        <rect x="10" y="10" width="16" height="16" rx="3" fill="#9E9E9E" />
                                        <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                                    </svg>
                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover/item:block">
                                        <rect x="10" y="10" width="16" height="16" rx="3" fill="#F2CE88" />
                                        <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
                                    </svg>
                                    {t('tasks.card.menu.duplicate')}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onArchive?.(); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item">
                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover/item:hidden">
                                        <rect x="4" y="12" width="24" height="16" rx="3" fill="#545454" />
                                        <rect x="6" y="8" width="20" height="4" rx="1" fill="#9E9E9E" />
                                    </svg>
                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover/item:block">
                                        <rect x="4" y="12" width="24" height="16" rx="3" fill="#7A664E" />
                                        <rect x="6" y="8" width="20" height="4" rx="1" fill="#F2CE88" />
                                    </svg>
                                    {t('tasks.card.menu.archive')}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete?.(); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item">
                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover/item:hidden">
                                        <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#545454" />
                                        <rect x="4" y="6" width="24" height="4" rx="2" fill="#9E9E9E" />
                                    </svg>
                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover/item:block">
                                        <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#7A664E" />
                                        <rect x="4" y="6" width="24" height="4" rx="2" fill="#F2CE88" />
                                    </svg>
                                    {t('tasks.card.menu.delete')}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Header: Title */}
            <div className={`flex items-start gap-2 mb-2 ${type !== 'meeting' ? 'pr-16' : 'pr-8'}`}>
                {isBlocked && (
                    <div className="mt-0.5 flex-shrink-0" title={t('tasks.blocked_by_dependencies')}>
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12V8C9 4.13401 12.134 1 16 1C19.866 1 23 4.13401 23 8V12" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                            <rect x="5" y="12" width="22" height="18" rx="3" fill="#9E9E9E" />
                            <circle cx="16" cy="21" r="3" fill="#545454" />
                        </svg>
                    </div>
                )}
                <h3 className={`font-semibold line-clamp-2 ${isBlocked ? 'text-gray-500' : (isCompleted ? 'line-through text-gray-500' : 'text-white')} ${isCollapsed ? 'mb-0' : ''}`}>{title}</h3>
            </div>

            {/* If collapsed, we show assignees + due date right under the title or to the side, then return early to hide the rest. */}
            {isCollapsed ? (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/50">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 flex-shrink-0"
                            style={{
                                backgroundColor: `${currentPriority.color}33`,
                                color: currentPriority.color,
                            }}
                        >
                            <PriorityIcon size={10} />
                            {currentPriority.name}
                        </span>

                        {/* Inline Labels */}
                        {safeLabels.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap overflow-hidden">
                                {safeLabels.slice(0, 2).map((label, i) => (
                                    <div
                                        key={label.id || i}
                                        className="h-4 px-1.5 rounded transition-colors whitespace-nowrap overflow-hidden max-w-[60px] text-[9px] font-medium flex items-center"
                                        style={{ backgroundColor: `${label.color || '#6B7280'}20`, color: label.color || '#6B7280' }}
                                        title={label.name}
                                    >
                                        <span className="truncate">{label.name}</span>
                                    </div>
                                ))}
                                {safeLabels.length > 2 && (
                                    <span className="text-[10px] text-gray-500 ml-0.5">+{safeLabels.length - 2}</span>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Small Avatars for Collapsed View */}
                    <div className="flex -space-x-1.5">
                        {safeAssignees.slice(0, 3).map((assignee, i) => {
                            const userImage = assignee.avatar || assignee.image
                            const initials = assignee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                            return (
                                <div key={assignee.id || i} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-black border border-[#1a1a24] overflow-hidden ${userImage ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`} style={{ zIndex: safeAssignees.length - i }} title={assignee.name}>
                                    {userImage ? <img src={userImage} alt={assignee.name} className="w-full h-full object-cover" /> : initials}
                                </div>
                            )
                        })}
                        {safeAssignees.length > 3 && (
                            <div className="w-4 h-4 rounded-full border border-[#1a1a24] bg-gray-700 flex items-center justify-center text-white text-[8px] font-bold" style={{ zIndex: 0 }}>
                                +{safeAssignees.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Priority / Date Badge */}
                    <div className="flex items-center justify-between mb-3">
                        {/* Left side: Date Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {type === 'meeting' ? (
                                dueDate ? (
                                    <span className="px-2.5 py-0.5 rounded-md text-xs font-medium flex-shrink-0 flex items-center gap-1.5 bg-[#2a2b36] text-gray-300 border border-gray-700/50">
                                        {/* Calendar Icon */}
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        {formatDate(dueDate)}
                                    </span>
                                ) : null
                            ) : (
                                <span
                                    className="px-2.5 py-0.5 rounded-md text-xs font-medium flex-shrink-0 flex items-center gap-1.5"
                                    style={{
                                        backgroundColor: `${currentPriority.color}33`,
                                        color: currentPriority.color,
                                        borderColor: `${currentPriority.color}4D`
                                    }}
                                >
                                    <PriorityIcon size={12} />
                                    {currentPriority.name}
                                </span>
                            )}
                        </div>

                    </div>

                    {/* Inline Labels */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        {safeLabels.slice(0, 3).map((label, i) => (
                            <LabelBadge key={label.id || i} label={label} size="sm" />
                        ))}
                        {safeLabels.length > 3 && (
                            <span className="text-[10px] text-gray-500">+{safeLabels.length - 3}</span>
                        )}
                    </div>

                    {/* Description */}
                    {description && (
                        <div className="text-gray-500 text-xs mb-auto line-clamp-2 [&>p]:mb-0 [&>ul]:mb-0 [&>ol]:mb-0 [&>*]:inline">
                            <Markdown rehypePlugins={[rehypeSanitize]}>{description}</Markdown>
                        </div>
                    )}



                    {/* Due Date / Progress (like Project Card) - Only for tasks */}
                    {type !== 'meeting' && (dueDate || subtaskCount > 0) && (
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                                {dueDate && (
                                    <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                                        {/* Flag Icon - Grey */}
                                        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                                            <path d="M8 28V6" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                                            <path d="M10 7C10 7 14 5 18 7C22 9 26 7 26 7V17C26 17 22 19 18 17C14 15 10 17 10 17V7Z" fill="#9E9E9E" />
                                        </svg>
                                        <span className="text-xs">{formatDate(dueDate)}</span>
                                    </div>
                                )}
                            </div>
                            {subtaskCount > 0 && (
                                <SubtaskProgress completed={subtaskCompleted} total={subtaskCount} />
                            )}
                        </div>
                    )}

                    {/* Footer: Avatars + Action Icons */}
                    <div className="flex items-center justify-between mt-4">
                        {/* Assignees */}
                        <div className="flex -space-x-2">
                            {safeAssignees.slice(0, 4).map((assignee, i) => {
                                const userImage = assignee.avatar || assignee.image
                                const initials = assignee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'

                                return (
                                    <div
                                        key={assignee.id || i}
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-black border border-[#1a1a24] overflow-hidden ${userImage ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
                                        style={{ zIndex: safeAssignees.length - i }}
                                        title={assignee.name}
                                    >
                                        {userImage ? (
                                            <img src={userImage} alt={assignee.name} className="w-full h-full object-cover" />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                )
                            })}
                            {safeAssignees.length > 4 && (
                                <div className="w-5 h-5 rounded-full border border-[#1a1a24] bg-gray-700 flex items-center justify-center text-white text-[9px] font-bold" style={{ zIndex: 0 }}>
                                    +{safeAssignees.length - 4}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {type === 'meeting' ? (
                                meetingLink ? (
                                    <button
                                        className="w-8 h-8 rounded-full bg-[#2a2b36] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(meetingLink, '_blank')
                                        }}
                                        title="Join Meeting"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                                        </svg>
                                    </button>
                                ) : null
                            ) : (
                                <>
                                    {subtaskCount > 0 && (
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group/btn" title={`${subtaskCompleted}/${subtaskCount} subtasks`}>
                                            {/* Document Icon for Subtasks - Grey */}
                                            <div className="group-hover/btn:hidden"><DocumentIcon /></div>
                                            {/* Document Icon for Subtasks - Gold */}
                                            <div className="hidden group-hover/btn:block"><DocumentIconGold /></div>
                                            <span className="text-xs text-gray-400 group-hover/btn:text-[#F2CE88]">{subtaskCompleted}/{subtaskCount}</span>
                                        </div>
                                    )}
                                    {commentCount > 0 && (
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group/btn" title={`${commentCount} comments`}>
                                            {/* Comment Icon - Grey */}
                                            <div className="group-hover/btn:hidden"><CommentIcon /></div>
                                            {/* Comment Icon - Gold */}
                                            <div className="hidden group-hover/btn:block"><CommentIconGold /></div>
                                            <span className="text-xs text-gray-400 group-hover/btn:text-[#F2CE88]">{commentCount}</span>
                                        </div>
                                    )}
                                    {attachmentCount > 0 && (
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group/btn" title={`${attachmentCount} attachments`}>
                                            {/* Paperclip Icon - Grey */}
                                            <div className="group-hover/btn:hidden"><PaperclipIcon /></div>
                                            {/* Paperclip Icon - Gold */}
                                            <div className="hidden group-hover/btn:block"><PaperclipIconGold /></div>
                                            <span className="text-xs text-gray-400 group-hover/btn:text-[#F2CE88]">{attachmentCount}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

        </div>
    )
}

// Add New Task Card - matching existing AddNewTaskCard style
export function AddTaskCard({ onClick, label: propLabel }: { onClick?: () => void, label?: string }) {
    const { t } = useTranslation()
    const label = propLabel || t('tasks.card.add_task')
    return (
        <button
            onClick={onClick}
            className="rounded-2xl border-2 border-dashed border-gray-700 bg-[#12121a]/50 p-4 flex flex-col items-center justify-center h-[140px] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
        >
            <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-amber-500/20 flex items-center justify-center mb-3 transition-colors">
                <span className="text-2xl text-gray-500 group-hover:text-amber-400">+</span>
            </div>
            <span className="text-gray-400 group-hover:text-amber-400 font-medium transition-colors">{label}</span>
        </button>
    )
}
