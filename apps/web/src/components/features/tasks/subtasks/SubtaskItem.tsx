import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../../../lib/utils'
import type { Assignee } from '../components/AssigneePicker'

// Avatar component
const Avatar = ({ name, avatar, image, size = 'xs' }: { name: string; avatar?: string; image?: string; size?: 'xs' | 'sm' }) => {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const sizeClass = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'

    const imageUrl = avatar || image
    if (imageUrl) {
        return <img src={imageUrl} alt={name} className={`${sizeClass} rounded-full object-cover`} />
    }

    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-semibold text-black`}>
            {initials}
        </div>
    )
}

// Types
export interface Subtask {
    id: string
    title: string
    description?: string | null
    isCompleted: boolean
    assigneeId?: string | null
    assignee?: Assignee
    dependsOn?: string[] // IDs of other subtasks
}

interface SubtaskItemProps {
    subtask: Subtask
    onToggle?: () => void
    onEdit?: (updates: Partial<Subtask>) => void
    onDelete?: () => void
    onAddAfter?: () => void
    isAddingAfter?: boolean
    onAddAfterSubmit?: (title: string) => void
    onAddAfterCancel?: () => void
    availableAssignees?: Assignee[]
    otherSubtasks?: Subtask[]
}

export function SubtaskItem({
    subtask,
    onToggle,
    onEdit,
    onDelete,
    onAddAfter,
    isAddingAfter,
    onAddAfterSubmit,
    onAddAfterCancel,
    availableAssignees = [],
    otherSubtasks = []
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

    const isCompleted = subtask.isCompleted

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const [showAssigneePicker, setShowAssigneePicker] = useState(false)
    const [showDependencyPicker, setShowDependencyPicker] = useState(false)
    const assigneePickerRef = useRef<HTMLDivElement>(null)
    const dependencyPickerRef = useRef<HTMLDivElement>(null)

    // Close pickers and menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false)
            }
            if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) {
                setShowAssigneePicker(false)
            }
            if (dependencyPickerRef.current && !dependencyPickerRef.current.contains(e.target as Node)) {
                setShowDependencyPicker(false)
            }
        }
        if (showMenu || showAssigneePicker || showDependencyPicker) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showMenu, showAssigneePicker, showDependencyPicker])

    // Focus input when editing starts
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
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Assignee Picker */}
                                <div className="relative" ref={assigneePickerRef}>
                                    <button
                                        onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                                        className={cn(
                                            "p-0.5 rounded-full hover:bg-gray-800 transition-all flex items-center justify-center",
                                            subtask.assignee ? "opacity-100" : "opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300"
                                        )}
                                        title="Przypisz osobę"
                                    >
                                        {subtask.assignee ? (
                                            <Avatar name={subtask.assignee.name} avatar={subtask.assignee.avatar} size="xs" />
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                        )}
                                    </button>
                                    {showAssigneePicker && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a24] rounded-xl shadow-2xl z-50 border border-gray-700 overflow-hidden py-1">
                                            {availableAssignees.map(a => (
                                                <button
                                                    key={a.id}
                                                    onClick={() => {
                                                        onEdit?.({ assigneeId: a.id, assignee: a })
                                                        setShowAssigneePicker(false)
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                                                >
                                                    <Avatar name={a.name} avatar={a.avatar} size="xs" />
                                                    <span className="truncate">{a.name}</span>
                                                </button>
                                            ))}
                                            {availableAssignees.length === 0 && (
                                                <div className="px-3 py-2 text-xs text-gray-500 text-center">Brak dostępnych osób</div>
                                            )}
                                            {subtask.assignee && (
                                                <button
                                                    onClick={() => {
                                                        onEdit?.({ assigneeId: null, assignee: undefined })
                                                        setShowAssigneePicker(false)
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-gray-800 mt-1"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    Usuń przypisanie
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Depends On Picker */}
                                <div className="relative" ref={dependencyPickerRef}>
                                    <button
                                        onClick={() => setShowDependencyPicker(!showDependencyPicker)}
                                        className={cn(
                                            "p-1 rounded transition-colors",
                                            (subtask.dependsOn?.length || 0) > 0
                                                ? "text-amber-500 opacity-100"
                                                : "text-gray-500 hover:text-amber-500 opacity-0 group-hover:opacity-100"
                                        )}
                                        title="Zależności"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 17h.01" />
                                            <path d="M12 14h.01" />
                                            <path d="M12 11h.01" />
                                        </svg>
                                    </button>
                                    {showDependencyPicker && (
                                        <div className="absolute right-0 top-full mt-1 w-64 bg-[#1a1a24] rounded-xl shadow-2xl z-50 border border-gray-700 overflow-hidden flex flex-col max-h-64">
                                            <div className="p-2 text-xs font-semibold text-gray-500 border-b border-gray-800 flex-shrink-0 bg-[#1a1a24]">
                                                Zależy od:
                                            </div>
                                            <div className="overflow-y-auto p-1">
                                                {otherSubtasks.length > 0 ? otherSubtasks.map(s => {
                                                    const isSelected = subtask.dependsOn?.includes(s.id)
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const currentDependsOn = subtask.dependsOn || []
                                                                const newDependsOn = isSelected
                                                                    ? currentDependsOn.filter(id => id !== s.id)
                                                                    : [...currentDependsOn, s.id]
                                                                onEdit?.({ dependsOn: newDependsOn })
                                                            }}
                                                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-left hover:bg-gray-800 transition-colors mb-0.5"
                                                        >
                                                            <div className={cn(
                                                                "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                                                                isSelected ? "bg-amber-500 border-amber-500 text-black" : "border-gray-600"
                                                            )}>
                                                                {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>}
                                                            </div>
                                                            <span className={cn("truncate", s.isCompleted ? 'line-through text-gray-500' : 'text-gray-300')}>
                                                                {s.title}
                                                            </span>
                                                        </button>
                                                    )
                                                }) : (
                                                    <div className="p-3 text-center text-xs text-gray-500">Brak innych podzadań</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

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
