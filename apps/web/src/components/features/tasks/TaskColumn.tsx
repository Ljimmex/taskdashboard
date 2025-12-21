import { useState, useRef, useEffect } from 'react'
import { TaskCard, TaskCardProps } from './TaskCard'
import {
    EditIconDefault,
    ArchiveIconDefault,
    DeleteIconDefault,
} from '@/components/dashboard/icons'

// Flag icon (from TaskCard - for Priority)
import {
    FlagIcon,
    CloseIcon,
    UserIcon,
    CalendarSmallIcon,
    CheckIcon,
    SortIcon,
    BellIcon,
    ArrowRightSmallIcon,
    ZapIcon,
    GripVerticalIcon,
    PaletteIcon,
    HashIcon
} from './TaskIcons'

const COLUMN_COLORS = [
    '#6B7280', // Gray
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#d946ef', // Fuchsia
    '#ec4899', // Pink
]

interface TaskColumnProps {
    id: string
    title: string
    status: 'todo' | 'in_progress' | 'review' | 'done'
    tasks: TaskCardProps[]
    taskCount?: number
    color?: string
    onAddTask?: (taskData: { title: string; priority: string; status: string }) => void
    onTaskClick?: (taskId: string) => void
    onTaskEdit?: (taskId: string) => void
    onTaskDelete?: (taskId: string) => void
    onTaskDuplicate?: (taskId: string) => void
    onTaskArchive?: (taskId: string) => void
    // Column actions
    onRename?: (newName: string) => void
    onSetWipLimit?: (limit: number) => void
    onChangeColor?: (color: string) => void
    onWatch?: () => void
    onMoveAllCards?: () => void
    onArchiveAll?: () => void
    onAddRule?: () => void
    onDeleteColumn?: () => void
    dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

// Status configuration with colors and icons
const statusConfig = {
    todo: { label: 'To Do', color: '#6366f1', bgColor: 'bg-indigo-500/10', textColor: 'text-indigo-400' },
    in_progress: { label: 'In Progress', color: '#f59e0b', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400' },
    review: { label: 'Review', color: '#8b5cf6', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400' },
    done: { label: 'Done', color: '#10b981', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
}

// Quick Add Task Popup Component
function QuickAddTask({
    status,
    onAdd,
    onClose
}: {
    status: string
    onAdd: (data: { title: string; priority: string; status: string }) => void
    onClose: () => void
}) {
    const [title, setTitle] = useState('')
    const [priority, setPriority] = useState('medium')
    const [showPriority, setShowPriority] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const handleSubmit = () => {
        if (title.trim()) {
            onAdd({ title: title.trim(), priority, status })
            onClose()
        }
    }

    const priorities = [
        { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
        { value: 'high', label: 'High', color: 'text-orange-400' },
        { value: 'medium', label: 'Medium', color: 'text-amber-400' },
        { value: 'low', label: 'Low', color: 'text-green-400' },
    ]

    return (
        <div
            ref={containerRef}
            className="rounded-2xl bg-[#1a1a24] border border-gray-800 p-4 shadow-2xl mb-3"
        >
            {/* Task name input */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Wpisz nazwę zadania"
                    autoFocus
                    className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                />
            </div>

            {/* Priority dropdown with badge */}
            <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                    <button
                        onClick={() => setShowPriority(!showPriority)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 text-xs hover:bg-gray-700 transition-colors"
                    >
                        <FlagIcon />
                        Priorytet
                    </button>
                    {showPriority && (
                        <div className="absolute top-full left-0 mt-1 w-32 bg-[#1a1a24] rounded-lg shadow-xl border border-gray-800 py-1 z-20">
                            {priorities.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => { setPriority(p.value); setShowPriority(false) }}
                                    className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-800 transition-colors ${priority === p.value ? p.color : 'text-gray-400'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Priority Badge - shown when selected */}
                {priority && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-green-500/20 text-green-400'
                        }`}>
                        {priorities.find(p => p.value === priority)?.label}
                    </span>
                )}
            </div>

            {/* Bottom actions - no attachment button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2">
                    {/* Assignee */}
                    <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                        <UserIcon />
                    </button>
                    {/* Date */}
                    <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                        <CalendarSmallIcon />
                    </button>
                </div>
                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-amber-400 transition-colors"
                >
                    <CheckIcon />
                </button>
            </div>
        </div>
    )
}

// Quick Edit Task Popup Component (for inline editing via pencil icon)
export function QuickEditTask({
    task,
    onUpdate,
    onClose
}: {
    task: { id: string; title: string; priority: string; dueDate?: string; assignees?: { id: string; name: string }[] }
    onUpdate: (data: { id: string; title: string; priority: string }) => void
    onClose: () => void
}) {
    const [title, setTitle] = useState(task.title)
    const [priority, setPriority] = useState(task.priority)
    const [showPriority, setShowPriority] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const handleSubmit = () => {
        if (title.trim()) {
            onUpdate({ id: task.id, title: title.trim(), priority })
            onClose()
        }
    }

    const priorities = [
        { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
        { value: 'high', label: 'High', color: 'text-orange-400' },
        { value: 'medium', label: 'Medium', color: 'text-amber-400' },
        { value: 'low', label: 'Low', color: 'text-green-400' },
    ]

    return (
        <div
            ref={containerRef}
            className="absolute left-0 right-0 top-0 z-50 rounded-2xl bg-[#1a1a24] border border-gray-800 p-4 shadow-2xl"
        >
            {/* Task name input */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex-shrink-0" />
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                    className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                />
            </div>

            {/* Priority dropdown with badge */}
            <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                    <button
                        onClick={() => setShowPriority(!showPriority)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 text-xs hover:bg-gray-700 transition-colors"
                    >
                        <FlagIcon />
                        Priorytet
                    </button>
                    {showPriority && (
                        <div className="absolute top-full left-0 mt-1 w-32 bg-[#1a1a24] rounded-lg shadow-xl border border-gray-800 py-1 z-20">
                            {priorities.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => { setPriority(p.value); setShowPriority(false) }}
                                    className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-800 transition-colors ${priority === p.value ? p.color : 'text-gray-400'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Priority Badge - shown when selected */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-green-500/20 text-green-400'
                    }`}>
                    {priorities.find(p => p.value === priority)?.label}
                </span>
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2">
                    {/* Assignee */}
                    <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                        <UserIcon />
                    </button>
                    {/* Date */}
                    <button className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                        <CalendarSmallIcon />
                    </button>
                </div>
                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black hover:bg-amber-400 transition-colors"
                >
                    <CheckIcon />
                </button>
            </div>
        </div>
    )
}

// Column Menu Component with 5 groups
function ColumnMenu({
    onClose,
    onRename,
    onSetWipLimit,
    onChangeColor,
    onWatch,
    onMoveAllCards,
    onArchiveAll,
    onAddRule,
    onDeleteColumn
}: {
    onClose: () => void
    onRename?: () => void
    onSetWipLimit?: () => void
    onChangeColor?: (color: string) => void
    onWatch?: () => void
    onMoveAllCards?: () => void
    onArchiveAll?: () => void
    onAddRule?: () => void
    onDeleteColumn?: () => void
}) {
    const menuRef = useRef<HTMLDivElement>(null)
    const [view, setView] = useState<'main' | 'colors'>('main')

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const MenuSection = ({ children, title }: { children: React.ReactNode; title?: string }) => (
        <div className="py-1">
            {title && <div className="px-3 py-1 text-[10px] font-medium text-gray-500 uppercase tracking-wider">{title}</div>}
            {children}
        </div>
    )

    const MenuItem = ({ icon, label, onClick, danger = false }: { icon?: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }) => (
        <button
            onClick={() => { onClick?.() }}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${danger
                ? 'text-red-400 hover:bg-gray-800 hover:text-[#F2CE88]'
                : 'text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88]'
                }`}
        >
            {icon}
            {label}
        </button>
    )

    if (view === 'colors') {
        return (
            <div
                ref={menuRef}
                className="absolute right-0 top-8 z-20 w-52 bg-[#1a1a24] rounded-xl shadow-2xl overflow-hidden border border-gray-800"
            >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
                    <button
                        onClick={() => setView('main')}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 19L5 12L12 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span className="text-sm font-medium text-white">Wybierz kolor</span>
                </div>
                <div className="p-3 grid grid-cols-5 gap-2">
                    {COLUMN_COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => { onChangeColor?.(color); onClose() }}
                            className="w-6 h-6 rounded-full border border-gray-700 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-8 z-20 w-52 bg-[#1a1a24] rounded-xl shadow-2xl overflow-hidden border border-gray-800"
        >
            {/* Group 1: Configuration */}
            <MenuSection title="Konfiguracja">
                <MenuItem
                    icon={<EditIconDefault />}
                    label="Zmień nazwę"
                    onClick={onRename}
                />
                <MenuItem
                    icon={<HashIcon />}
                    label="Ustaw limit (WIP)"
                    onClick={onSetWipLimit}
                />
                <MenuItem
                    icon={<PaletteIcon />}
                    label="Zmień kolor"
                    onClick={() => setView('colors')}
                />
            </MenuSection>

            <div className="border-t border-gray-800" />

            {/* Group 2: Sort & Filter */}
            <MenuSection title="Sortowanie">
                <MenuItem
                    icon={<SortIcon />}
                    label="Sortuj według..."
                />
                <MenuItem
                    icon={<BellIcon />}
                    label="Obserwuj listę"
                    onClick={onWatch}
                />
            </MenuSection>

            <div className="border-t border-gray-800" />

            {/* Group 3: Bulk Actions */}
            <MenuSection title="Akcje masowe">
                <MenuItem
                    icon={<ArrowRightSmallIcon />}
                    label="Przenieś wszystkie..."
                    onClick={onMoveAllCards}
                />
                <MenuItem
                    icon={<ArchiveIconDefault />}
                    label="Archiwizuj wszystkie"
                    onClick={onArchiveAll}
                />
            </MenuSection>

            <div className="border-t border-gray-800" />

            {/* Group 4: Automation (Pro) */}
            <MenuSection title="Automatyzacje">
                <MenuItem
                    icon={<ZapIcon />}
                    label="Dodaj regułę"
                    onClick={onAddRule}
                />
            </MenuSection>

            <div className="border-t border-gray-800" />

            {/* Group 5: Danger Zone */}
            <MenuSection>
                <MenuItem
                    icon={<DeleteIconDefault />}
                    label="Usuń kolumnę"
                    onClick={onDeleteColumn}
                    danger
                />
            </MenuSection>
        </div>
    )
}

export function TaskColumn({
    title,
    status,
    tasks,
    onAddTask,
    onTaskClick,
    onTaskEdit,
    onTaskDelete,
    onTaskDuplicate,
    onTaskArchive,
    onRename,
    onSetWipLimit,
    onChangeColor,
    onWatch,
    onMoveAllCards,
    onArchiveAll,
    onAddRule,
    onDeleteColumn,
    color,
    children,
    dragHandleProps,
}: TaskColumnProps & { children?: React.ReactNode }) {
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [showColumnMenu, setShowColumnMenu] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)
    const [renameTitle, setRenameTitle] = useState('')

    const config = statusConfig[status] || {
        label: title,
        color: color || '#6B7280',
        bgColor: 'bg-gray-800',
        textColor: 'text-gray-400'
    }

    const handleQuickAdd = (data: { title: string; priority: string; status: string }) => {
        onAddTask?.(data)
    }

    const handleRenameSubmit = () => {
        if (renameTitle.trim()) {
            onRename?.(renameTitle)
        }
        setIsRenaming(false)
    }

    return (
        <div className="flex flex-col min-w-[320px] max-w-[320px] h-full">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-1 relative group/column-header">
                <div className="flex items-center gap-2 flex-1">
                    {/* Drag Handle */}
                    <div
                        className="cursor-grab hover:text-gray-200 text-gray-600 opacity-0 group-hover/column-header:opacity-100 transition-opacity"
                        {...dragHandleProps}
                    >
                        <GripVerticalIcon className="w-4 h-4" />
                    </div>

                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color || config.color }} />
                    {isRenaming ? (
                        <input
                            type="text"
                            value={renameTitle}
                            onChange={(e) => setRenameTitle(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                            autoFocus
                            className="bg-[#12121a] border border-gray-700 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-amber-500 w-full mr-2"
                        />
                    ) : (
                        <h3 className="font-semibold text-white text-sm">{title || config.label}</h3>
                    )}
                    {!isRenaming && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                            {tasks.length}
                        </span>
                    )}
                </div>

                {/* Action buttons: Add + Menu */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-amber-400 transition-colors"
                        title="Add task"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setShowColumnMenu(!showColumnMenu)}
                        className="w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                        title="Column options"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                        </svg>
                    </button>
                </div>

                {/* Column Menu */}
                {showColumnMenu && (
                    <ColumnMenu
                        onClose={() => setShowColumnMenu(false)}
                        onRename={() => {
                            setRenameTitle(title || config.label)
                            setIsRenaming(true)
                            setShowColumnMenu(false)
                        }}
                        onSetWipLimit={() => onSetWipLimit?.(5)}
                        onChangeColor={onChangeColor}
                        onWatch={onWatch}
                        onMoveAllCards={onMoveAllCards}
                        onArchiveAll={onArchiveAll}
                        onAddRule={onAddRule}
                        onDeleteColumn={onDeleteColumn}
                    />
                )}
            </div>

            {/* Quick Add Task Popup */}
            {showQuickAdd && (
                <QuickAddTask
                    status={status}
                    onAdd={handleQuickAdd}
                    onClose={() => setShowQuickAdd(false)}
                />
            )}

            {/* Tasks container - scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1 pb-4">
                {children ? children : tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        {...task}
                        onClick={() => onTaskClick?.(task.id)}
                        onEdit={() => onTaskEdit?.(task.id)}
                        onDelete={() => onTaskDelete?.(task.id)}
                        onDuplicate={() => onTaskDuplicate?.(task.id)}
                        onArchive={() => onTaskArchive?.(task.id)}
                    />
                ))}
            </div>
        </div>
    )
}

// Add Column Component
export function AddColumn({
    onAdd
}: {
    onAdd?: (title: string, color: string) => void
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [color, setColor] = useState('#6B7280')

    const handleAdd = () => {
        if (!title.trim()) return
        onAdd?.(title, color)
        setTitle('')
        setColor('#6B7280')
        setIsAdding(false)
    }

    if (!isAdding) {
        return (
            <div className="flex flex-col min-w-[320px] max-w-[320px] h-full">
                <div className="h-10 mb-4" /> {/* Spacer for header alignment */}
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 hover:border-gray-700 hover:bg-gray-800/50 transition-all group"
                >
                    <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center mb-4 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 group-hover:text-amber-400 transition-colors">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </div>
                    <p className="text-gray-500 group-hover:text-gray-300 font-medium transition-colors">Add Column</p>
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-w-[320px] max-w-[320px] h-full">
            <div className="h-10 mb-4 flex items-center justify-between">
                <span className="font-semibold text-white text-sm">Nowa kolumna</span>
                <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white">
                    <CloseIcon />
                </button>
            </div>

            <div className="p-4 bg-[#1a1a24] rounded-xl border border-gray-800 space-y-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Nazwa kolumny</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Np. Weryfikacja"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        className="w-full bg-[#12121a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-gray-600"
                    />
                </div>

                <div>
                    <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">Kolor</label>
                    <div className="grid grid-cols-6 gap-2">
                        {COLUMN_COLORS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleAdd}
                        disabled={!title.trim()}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <CheckIcon />
                        Dodaj kolumnę
                    </button>
                </div>
            </div>
        </div>
    )
}
