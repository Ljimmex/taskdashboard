import { useState, useRef, useEffect } from 'react'
import { LabelBadge } from '../labels/LabelBadge'
import { SubtaskProgress } from './ProgressBar'
import {
    UserIcon,
    CalendarSmallIcon,
    CheckIcon,
    CloseIcon,
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
}

export interface TaskCardProps {
    id: string
    projectName?: string
    projectColor?: string
    title: string
    description?: string | null
    priority: 'urgent' | 'high' | 'medium' | 'low'
    status: string // Can be any column ID
    assignees?: TaskAssignee[]
    labels?: TaskLabel[]
    dueDate?: string | null
    subtaskCount?: number
    subtaskCompleted?: number
    commentCount?: number
    attachmentCount?: number
    subitems?: { id: string; title: string; description?: string; status: string; priority: string }[]
    onClick?: () => void
    onEdit?: () => void
    onDelete?: () => void
    onDuplicate?: () => void
    onArchive?: () => void
    isDragging?: boolean
}

export function TaskCard({
    id,
    title,
    description,
    priority,
    assignees = [],
    labels = [],
    dueDate,
    subtaskCount = 0,
    subtaskCompleted = 0,
    commentCount = 0,
    attachmentCount = 0,
    onClick,
    onEdit,
    onDelete,
    onDuplicate,
    onArchive,
    isDragging = false,
}: TaskCardProps) {
    const [showMenu, setShowMenu] = useState(false)
    const [showQuickEdit, setShowQuickEdit] = useState(false)
    const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down')
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Calculate menu direction based on button position
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

    // Priority styles with custom icons
    const priorityConfig = {
        urgent: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Pilne', Icon: PriorityUrgentIcon },
        high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: 'Wysoki', Icon: PriorityHighIcon },
        medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Średni', Icon: PriorityMediumIcon },
        low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Niski', Icon: PriorityLowIcon },
    }

    // Check if overdue
    const isOverdue = dueDate ? new Date(dueDate) < new Date() : false

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    // Edit mode state
    const [editTitle, setEditTitle] = useState(title)
    const [editPriority, setEditPriority] = useState(priority)
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)

    const priorities = [
        { value: 'urgent', label: 'Pilne', color: 'text-red-400', bgColor: 'bg-red-500/20', Icon: PriorityUrgentIcon },
        { value: 'high', label: 'Wysoki', color: 'text-orange-400', bgColor: 'bg-orange-500/20', Icon: PriorityHighIcon },
        { value: 'medium', label: 'Średni', color: 'text-amber-400', bgColor: 'bg-amber-500/20', Icon: PriorityMediumIcon },
        { value: 'low', label: 'Niski', color: 'text-blue-400', bgColor: 'bg-blue-500/20', Icon: PriorityLowIcon },
    ]

    const handleEditSubmit = () => {
        console.log('Task updated:', { id, title: editTitle, priority: editPriority })
        onEdit?.()
        setShowQuickEdit(false)
    }



    // If in edit mode, render the edit form INSTEAD of the card
    if (showQuickEdit) {
        return (
            <div className="rounded-2xl bg-[#1a1a24] border border-gray-700 p-4 relative flex flex-col">
                {/* Close button */}
                <button
                    onClick={() => setShowQuickEdit(false)}
                    className="absolute top-3 right-3 w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                    <CloseIcon />
                </button>

                {/* Title input */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex-shrink-0" />
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
                        autoFocus
                        className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm font-medium"
                    />
                </div>

                {/* Priority dropdown with badge */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <div className="relative">
                        <button
                            onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 text-xs hover:bg-gray-700 transition-colors"
                        >
                            {(() => {
                                const p = priorities.find(p => p.value === editPriority)
                                return p ? <p.Icon size={12} /> : null
                            })()}
                            Priorytet
                        </button>
                        {showPriorityDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-32 bg-[#1a1a24] rounded-lg shadow-xl border border-gray-800 py-1 z-20">
                                {priorities.map(p => (
                                    <button
                                        key={p.value}
                                        onClick={() => { setEditPriority(p.value as typeof priority); setShowPriorityDropdown(false) }}
                                        className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-800 transition-colors flex items-center gap-2 ${editPriority === p.value ? p.color : 'text-gray-400'}`}
                                    >
                                        <p.Icon size={14} />
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Priority Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${editPriority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        editPriority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            editPriority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-green-500/20 text-green-400'
                        }`}>
                        {priorities.find(p => p.value === editPriority)?.label}
                    </span>

                    {/* Date badge (if exists) */}
                    {dueDate && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-400 flex items-center gap-1">
                            <CalendarSmallIcon />
                            {formatDate(dueDate)}
                        </span>
                    )}

                    {/* Assignees badge */}
                    {assignees && assignees.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-400 flex items-center gap-1">
                            <UserIcon />
                            {assignees.length}
                        </span>
                    )}
                </div>

                {/* Bottom actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    <div className="flex items-center gap-2">
                        {/* Assignee button */}
                        <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                            <UserIcon />
                        </button>
                        {/* Date button */}
                        <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                            <CalendarSmallIcon />
                        </button>
                    </div>
                    {/* Submit button */}
                    <button
                        onClick={handleEditSubmit}
                        className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black hover:bg-amber-400 transition-colors"
                    >
                        <CheckIcon />
                    </button>
                </div>
            </div>
        )
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
        >
            {/* Menu Button - always visible in top right */}
            <div ref={menuRef}>
                <button
                    ref={buttonRef}
                    onClick={(e) => { e.stopPropagation(); handleMenuToggle() }}
                    className="absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white transition-all"
                >
                    ⋮
                </button>

                {/* Dropdown Menu - smart positioning based on available space */}
                {showMenu && (
                    <div className={`absolute right-4 w-36 bg-[#1a1a24] rounded-xl shadow-2xl overflow-hidden z-50 p-2 space-y-1 ${menuDirection === 'up' ? 'bottom-full mb-2' : 'top-10'
                        }`}>
                        <button onClick={(e) => { e.stopPropagation(); onEdit?.(); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover/item:hidden">
                                <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#545454" />
                                <path d="M12 25L7 20L4 28L12 25Z" fill="#9E9E9E" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover/item:block">
                                <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#7A664E" />
                                <path d="M12 25L7 20L4 28L12 25Z" fill="#F2CE88" />
                            </svg>
                            Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDuplicate?.(); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover/item:hidden">
                                <rect x="10" y="10" width="16" height="16" rx="3" fill="#9E9E9E" />
                                <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover/item:block">
                                <rect x="10" y="10" width="16" height="16" rx="3" fill="#F2CE88" />
                                <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            Duplicate
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
                            Archive
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
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Header: Title + Priority Badge + Edit pencil on hover */}
            <div className="flex items-center gap-2 mb-3 pr-8 group/title">
                <h3 className="font-semibold text-white truncate flex-1">{title}</h3>
                {/* Pencil edit icon - shows on hover */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowQuickEdit(true) }}
                    className="opacity-0 group-hover/title:opacity-100 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-[#F2CE88] transition-all"
                    title="Quick edit"
                >
                    <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                        <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="currentColor" />
                        <path d="M12 25L7 20L4 28L12 25Z" fill="currentColor" />
                    </svg>
                </button>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium flex-shrink-0 flex items-center gap-1.5 ${priorityConfig[priority].bg} ${priorityConfig[priority].text}`}>
                    {(() => {
                        const PriorityIcon = priorityConfig[priority].Icon
                        return <PriorityIcon size={12} />
                    })()}
                    {priorityConfig[priority].label}
                </span>
            </div>

            {/* Description */}
            {description && (
                <p className="text-gray-500 text-xs mb-auto line-clamp-2">{description}</p>
            )}


            {/* Labels Row */}
            {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {labels.slice(0, 3).map(label => (
                        <LabelBadge key={label.id} label={label} size="sm" />
                    ))}
                    {labels.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{labels.length - 3}</span>
                    )}
                </div>
            )}

            {/* Due Date / Progress (like Project Card) */}
            {(dueDate || subtaskCount > 0) && (
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

            {/* Footer: Avatars + Action Icons - like Meeting Card */}
            <div className="flex items-center justify-between mt-4">
                {/* Assignees */}
                <div className="flex -space-x-2">
                    {assignees.slice(0, 4).map((assignee, i) => (
                        <div
                            key={assignee.id}
                            className="w-8 h-8 rounded-full border-2 border-[#12121a] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black text-xs font-bold"
                            style={{ zIndex: assignees.length - i }}
                            title={assignee.name}
                        >
                            {assignee.avatar ? (
                                <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                assignee.name.charAt(0)
                            )}
                        </div>
                    ))}
                    {assignees.length > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-[#12121a] bg-gray-700 flex items-center justify-center text-white text-xs">
                            +{assignees.length - 4}
                        </div>
                    )}
                </div>

                {/* Action Icons with counts - like Meeting Card */}
                <div className="flex items-center gap-2">
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
                </div>
            </div>

        </div>
    )
}

// Add New Task Card - matching existing AddNewTaskCard style
export function AddTaskCard({ onClick }: { onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="rounded-2xl border-2 border-dashed border-gray-700 bg-[#12121a]/50 p-4 flex flex-col items-center justify-center h-[140px] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
        >
            <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-amber-500/20 flex items-center justify-center mb-3 transition-colors">
                <span className="text-2xl text-gray-500 group-hover:text-amber-400">+</span>
            </div>
            <span className="text-gray-400 group-hover:text-amber-400 font-medium transition-colors">Add New Task</span>
        </button>
    )
}
