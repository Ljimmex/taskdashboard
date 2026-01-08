import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../../../lib/utils'
import { StatusBadge } from '../components/StatusBadge'
import {
    PriorityUrgentIcon,
    PriorityHighIcon,
    PriorityMediumIcon,
    PriorityLowIcon,
} from '../components/TaskIcons'

// Default statuses if none provided
const DEFAULT_STATUSES = [
    { id: 'todo', name: 'Do zrobienia' },
    { id: 'in_progress', name: 'W trakcie' },
    { id: 'review', name: 'Do przeglądu' },
    { id: 'done', name: 'Ukończone' },
]

// Types
export interface Subtask {
    id: string
    title: string
    description?: string | null
    status: 'todo' | 'in_progress' | 'review' | 'done' | string
    priority: 'urgent' | 'high' | 'medium' | 'low' | string
    isCompleted: boolean
}

// Priority config with icons
const priorityConfig: Record<string, { Icon: React.ComponentType<{ size?: number }>; label: string }> = {
    urgent: { Icon: PriorityUrgentIcon, label: 'Pilne' },
    high: { Icon: PriorityHighIcon, label: 'Wysoki' },
    medium: { Icon: PriorityMediumIcon, label: 'Średni' },
    low: { Icon: PriorityLowIcon, label: 'Niski' },
}

// Priority Badge Component using our icons
const PriorityBadge = ({ priority }: { priority: string }) => {
    const config = priorityConfig[priority] || priorityConfig.medium
    const Icon = config.Icon
    return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
            <Icon size={12} />
            <span>{config.label}</span>
        </span>
    )
}

interface SubtaskItemProps {
    subtask: Subtask
    availableStatuses?: { id: string; name: string }[]
    onToggle?: () => void
    onEdit?: (updates: Partial<Subtask>) => void
    onDelete?: () => void
    onAddAfter?: () => void
    isAddingAfter?: boolean
    onAddAfterSubmit?: (title: string) => void
    onAddAfterCancel?: () => void
}

export function SubtaskItem({
    subtask,
    availableStatuses = DEFAULT_STATUSES,
    onToggle,
    onEdit,
    onDelete,
    onAddAfter,
    isAddingAfter,
    onAddAfterSubmit,
    onAddAfterCancel,
}: SubtaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: subtask.id })

    const [showMenu, setShowMenu] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(subtask.title)
    const [expanded, setExpanded] = useState(false)
    const [addAfterTitle, setAddAfterTitle] = useState('')
    const menuRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const addAfterInputRef = useRef<HTMLInputElement>(null)

    const isCompleted = subtask.status === 'done' || subtask.isCompleted

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false)
            }
        }
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showMenu])

    // Focus input when editing
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    // Focus add after input
    useEffect(() => {
        if (isAddingAfter && addAfterInputRef.current) {
            addAfterInputRef.current.focus()
        }
    }, [isAddingAfter])

    const handleSaveEdit = () => {
        if (editTitle.trim() && editTitle !== subtask.title) {
            onEdit?.({ title: editTitle.trim() })
        }
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit()
        } else if (e.key === 'Escape') {
            setEditTitle(subtask.title)
            setIsEditing(false)
        }
    }

    const handleAddAfterKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && addAfterTitle.trim()) {
            onAddAfterSubmit?.(addAfterTitle.trim())
            setAddAfterTitle('')
        } else if (e.key === 'Escape') {
            setAddAfterTitle('')
            onAddAfterCancel?.()
        }
    }

    const priorities = ['urgent', 'high', 'medium', 'low']

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    'rounded-xl p-3 bg-gray-900/30 border border-transparent hover:border-gray-700 transition-all group',
                    isDragging && 'opacity-50 shadow-2xl border-amber-500/50'
                )}
            >
                <div className="flex items-start gap-2">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="5" r="2" />
                            <circle cx="15" cy="5" r="2" />
                            <circle cx="9" cy="12" r="2" />
                            <circle cx="15" cy="12" r="2" />
                            <circle cx="9" cy="19" r="2" />
                            <circle cx="15" cy="19" r="2" />
                        </svg>
                    </button>

                    {/* Checkbox */}
                    <button
                        onClick={onToggle}
                        className={cn(
                            'w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                            isCompleted
                                ? 'bg-[#F2CE88] border-[#F2CE88]'
                                : 'border-gray-600 hover:border-[#F2CE88]'
                        )}
                    >
                        {isCompleted && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1a24" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                {isEditing ? (
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-gray-800 text-white text-sm font-medium px-2 py-1 rounded-lg border border-gray-700 focus:border-[#F2CE88] focus:outline-none"
                                    />
                                ) : (
                                    <span
                                        className={cn(
                                            'text-sm font-medium block truncate',
                                            isCompleted ? 'text-gray-500 line-through' : 'text-white'
                                        )}
                                    >
                                        {subtask.title}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <StatusBadge status={subtask.status} />
                                    <PriorityBadge priority={subtask.priority} />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Expand Description */}
                                {subtask.description && (
                                    <button
                                        onClick={() => setExpanded(!expanded)}
                                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className={cn('transition-transform', expanded && 'rotate-180')}
                                        >
                                            <path d="M6 9L12 15L18 9" />
                                        </svg>
                                    </button>
                                )}

                                {/* Add After */}
                                <button
                                    onClick={onAddAfter}
                                    className="p-1 text-gray-500 hover:text-[#F2CE88] transition-colors opacity-0 group-hover:opacity-100"
                                    title="Dodaj podzadanie poniżej"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5V19M5 12H19" />
                                    </svg>
                                </button>

                                {/* 3-Dot Menu */}
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="5" r="2" />
                                            <circle cx="12" cy="12" r="2" />
                                            <circle cx="12" cy="19" r="2" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {showMenu && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a24] rounded-xl shadow-2xl z-50 overflow-hidden">
                                            <button
                                                onClick={() => {
                                                    setIsEditing(true)
                                                    setShowMenu(false)
                                                }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                                </svg>
                                                Edytuj
                                            </button>

                                            {/* Status Submenu */}
                                            <div className="border-t border-gray-800">
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase">
                                                    Status
                                                </div>
                                                {availableStatuses.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            onEdit?.({ status: s.id, isCompleted: s.id === 'done' })
                                                            setShowMenu(false)
                                                        }}
                                                        className={cn(
                                                            'flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors',
                                                            subtask.status === s.id
                                                                ? 'bg-gray-800 text-[#F2CE88]'
                                                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                        )}
                                                    >
                                                        <StatusBadge status={s.id} />
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Priority Submenu */}
                                            <div className="border-t border-gray-800">
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase">
                                                    Priorytet
                                                </div>
                                                {priorities.map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => {
                                                            onEdit?.({ priority: p })
                                                            setShowMenu(false)
                                                        }}
                                                        className={cn(
                                                            'flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors',
                                                            subtask.priority === p
                                                                ? 'bg-gray-800 text-[#F2CE88]'
                                                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                                        )}
                                                    >
                                                        <PriorityBadge priority={p} />
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="border-t border-gray-800">
                                                <button
                                                    onClick={() => {
                                                        onDelete?.()
                                                        setShowMenu(false)
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/delete"
                                                >
                                                    {/* Trash Icon - grey default, gold on hover */}
                                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover/delete:hidden">
                                                        <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#545454" />
                                                        <path d="M12 16V22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M20 16V22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                                                        <rect x="4" y="6" width="24" height="4" rx="2" fill="#9E9E9E" />
                                                        <rect x="13" y="4" width="6" height="2" rx="1" fill="#9E9E9E" />
                                                    </svg>
                                                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover/delete:block">
                                                        <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#7A664E" />
                                                        <path d="M12 16V22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
                                                        <path d="M20 16V22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
                                                        <rect x="4" y="6" width="24" height="4" rx="2" fill="#F2CE88" />
                                                        <rect x="13" y="4" width="6" height="2" rx="1" fill="#F2CE88" />
                                                    </svg>
                                                    Usuń
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Description */}
                        {subtask.description && expanded && (
                            <p className="mt-2 text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-2">
                                {subtask.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Inline Add After Input */}
            {isAddingAfter && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900/50 border border-[#F2CE88]/30 ml-7">
                    <div className="w-5 h-5 rounded-md border-2 border-gray-600 flex-shrink-0" />
                    <input
                        ref={addAfterInputRef}
                        type="text"
                        value={addAfterTitle}
                        onChange={(e) => setAddAfterTitle(e.target.value)}
                        onKeyDown={handleAddAfterKeyDown}
                        placeholder="Wpisz tytuł podzadania..."
                        className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                    />
                    <button
                        onClick={() => {
                            if (addAfterTitle.trim()) {
                                onAddAfterSubmit?.(addAfterTitle.trim())
                                setAddAfterTitle('')
                            }
                        }}
                        disabled={!addAfterTitle.trim()}
                        className="px-3 py-1 rounded-lg bg-[#F2CE88] text-black text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d4b476] transition-colors"
                    >
                        Dodaj
                    </button>
                    <button
                        onClick={() => {
                            setAddAfterTitle('')
                            onAddAfterCancel?.()
                        }}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </>
    )
}
