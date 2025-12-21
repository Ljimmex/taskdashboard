import { useState, useMemo, useRef, useEffect } from 'react'
import type { TaskCardProps } from './TaskCard'
import {
    DocumentIcon,
    DocumentIconGold,
    PencilIcon,
    PencilIconGold,
    DuplicateIcon,
    DuplicateIconGold,
    ArchiveIcon,
    ArchiveIconGold,
    TrashIcon,
    TrashRedIcon
} from './TaskIcons'

interface TaskListViewProps {
    tasks: TaskCardProps[]
    onTaskClick?: (taskId: string) => void
    onTaskSelect?: (taskId: string, selected: boolean) => void
    onSelectAll?: (selected: boolean) => void
    onTaskEdit?: (taskId: string) => void
    onTaskDelete?: (taskId: string) => void
    onTaskDuplicate?: (taskId: string) => void
    onTaskArchive?: (taskId: string) => void
    selectedTasks?: string[]
    columns?: any[] // Added for dynamic status labels
    onSort?: (by: string, dir: 'asc' | 'desc') => void
}

// Custom checkbox component
const Checkbox = ({ checked, onChange, indeterminate = false }: {
    checked: boolean
    onChange: (checked: boolean) => void
    indeterminate?: boolean
}) => (
    <button
        onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked || indeterminate
            ? 'bg-amber-500 border-amber-500'
            : 'bg-transparent border-gray-600 hover:border-gray-500'
            }`}
    >
        {checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        )}
        {indeterminate && !checked && (
            <div className="w-2.5 h-0.5 bg-black rounded-full" />
        )}
    </button>
)



// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
        todo: { label: 'To-Do', bg: 'bg-indigo-500', text: 'text-white' },
        in_progress: { label: 'In Progress', bg: 'bg-amber-500', text: 'text-black' },
        review: { label: 'Review', bg: 'bg-purple-500', text: 'text-white' },
        done: { label: 'Completed', bg: 'bg-emerald-500', text: 'text-white' },
        cancelled: { label: 'Cancelled', bg: 'bg-red-500', text: 'text-white' },
    }
    const config = statusConfig[status] || statusConfig.todo
    return (
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    )
}

// Priority badge component
const PriorityBadge = ({ priority }: { priority: string }) => {
    const priorityConfig: Record<string, { label: string; color: string }> = {
        urgent: { label: 'Urgent', color: 'text-red-400' },
        high: { label: 'High', color: 'text-orange-400' },
        medium: { label: 'Medium', color: 'text-amber-400' },
        low: { label: 'Low', color: 'text-green-400' },
    }
    const config = priorityConfig[priority] || priorityConfig.medium
    return (
        <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {config.label}
        </span>
    )
}

// Assignee avatars
const AssigneeAvatars = ({ assignees }: { assignees: { id: string; name: string; avatar?: string }[] }) => {
    if (!assignees || assignees.length === 0) return <span className="text-gray-500 text-xs">-</span>

    const displayAssignees = assignees.slice(0, 3)
    const remainingCount = assignees.length - 3

    return (
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                {displayAssignees.map((assignee) => (
                    <div
                        key={assignee.id}
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] font-semibold text-black border-2 border-[#12121a]"
                        title={assignee.name}
                    >
                        {assignee.avatar ? (
                            <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            assignee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        )}
                    </div>
                ))}
                {remainingCount > 0 && (
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-300 border-2 border-[#12121a]">
                        +{remainingCount}
                    </div>
                )}
            </div>
            {assignees.length === 1 && (
                <span className="text-xs text-gray-400">{assignees[0].name}</span>
            )}
        </div>
    )
}

// Sort indicator icon
const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-gray-500">
        <path d="M6 2L9 5H3L6 2Z" fill={direction === 'asc' ? '#F2CE88' : 'currentColor'} />
        <path d="M6 10L3 7H9L6 10Z" fill={direction === 'desc' ? '#F2CE88' : 'currentColor'} />
    </svg>
)

// 3-dot vertical menu - same as TaskCard
const RowMenu = ({
    onEdit,
    onDelete,
    onDuplicate,
    onArchive
}: {
    onEdit?: () => void
    onDelete?: () => void
    onDuplicate?: () => void
    onArchive?: () => void
}) => {
    const [open, setOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
                className="w-6 h-6 rounded-lg hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                </svg>
            </button>
            {open && (
                <div className="absolute right-0 top-8 z-10 w-36 bg-[#1a1a24] rounded-xl shadow-2xl overflow-hidden p-2 space-y-1">
                    {/* Edit */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(); setOpen(false) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item"
                    >
                        <div className="group-hover/item:hidden"><PencilIcon /></div>
                        <div className="hidden group-hover/item:block"><PencilIconGold /></div>
                        Edit
                    </button>
                    {/* Duplicate */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate?.(); setOpen(false) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item"
                    >
                        <div className="group-hover/item:hidden"><DuplicateIcon /></div>
                        <div className="hidden group-hover/item:block"><DuplicateIconGold /></div>
                        Duplicate
                    </button>
                    {/* Archive */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive?.(); setOpen(false) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group/item"
                    >
                        <div className="group-hover/item:hidden"><ArchiveIcon /></div>
                        <div className="hidden group-hover/item:block"><ArchiveIconGold /></div>
                        Archive
                    </button>
                    {/* Delete */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete?.(); setOpen(false) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-red-400 transition-colors group/item"
                    >
                        <div className="group-hover/item:hidden"><TrashIcon /></div>
                        <div className="hidden group-hover/item:block"><TrashRedIcon /></div>
                        Delete
                    </button>
                </div>
            )}
        </div>
    )
}

type SortColumn = 'name' | 'project' | 'subtasks' | 'status' | 'priority' | 'startDate' | 'endDate'

export function TaskListView({
    tasks,
    onTaskClick,
    onTaskSelect,
    onSelectAll,
    onTaskEdit,
    onTaskDelete,
    onTaskDuplicate,
    onTaskArchive,
    selectedTasks = []
}: TaskListViewProps) {
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    // Sort tasks
    const sortedTasks = useMemo(() => {
        if (!sortColumn) return tasks

        return [...tasks].sort((a, b) => {
            let comparison = 0

            switch (sortColumn) {
                case 'name':
                    comparison = a.title.localeCompare(b.title)
                    break
                case 'project':
                    comparison = (a.projectName || '').localeCompare(b.projectName || '')
                    break
                case 'subtasks':
                    comparison = (a.subtaskCount || 0) - (b.subtaskCount || 0)
                    break
                case 'status':
                    comparison = a.status.localeCompare(b.status)
                    break
                case 'priority':
                    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
                    comparison = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
                    break
                case 'startDate':
                case 'endDate':
                    comparison = new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
                    break
            }

            return sortDirection === 'asc' ? comparison : -comparison
        })
    }, [tasks, sortColumn, sortDirection])

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length
    const someSelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length

    const getSortDirection = (column: SortColumn): 'asc' | 'desc' | null => {
        return sortColumn === column ? sortDirection : null
    }

    return (
        <div className="rounded-2xl bg-[#12121a] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="w-12 p-4">
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={(selected) => onSelectAll?.(selected)}
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-2">Task Name <SortIcon direction={getSortDirection('name')} /></div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('project')}>
                                <div className="flex items-center gap-2">Project Name <SortIcon direction={getSortDirection('project')} /></div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('subtasks')}>
                                <div className="flex items-center gap-2">Subtasks <SortIcon direction={getSortDirection('subtasks')} /></div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                                <div className="flex items-center justify-center gap-2">Status <SortIcon direction={getSortDirection('status')} /></div>
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('priority')}>
                                <div className="flex items-center justify-center gap-2">Priority <SortIcon direction={getSortDirection('priority')} /></div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('startDate')}>
                                <div className="flex items-center gap-2">Start Date <SortIcon direction={getSortDirection('startDate')} /></div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('endDate')}>
                                <div className="flex items-center gap-2">End Date <SortIcon direction={getSortDirection('endDate')} /></div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Assignee</th>
                            <th className="w-12 p-4"></th>
                        </tr>
                    </thead>

                    <tbody>
                        {sortedTasks.map((task, index) => (
                            <tr
                                key={task.id}
                                className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/20'}`}
                                onClick={() => onTaskClick?.(task.id)}
                            >
                                <td className="w-12 p-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox checked={selectedTasks.includes(task.id)} onChange={(checked) => onTaskSelect?.(task.id, checked)} />
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-white font-medium hover:text-amber-400 transition-colors">{task.title}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm text-gray-400">{task.projectName || '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-400 group/subtasks">
                                        <div className="group-hover/subtasks:hidden"><DocumentIcon /></div>
                                        <div className="hidden group-hover/subtasks:block"><DocumentIconGold /></div>
                                        <span className="group-hover/subtasks:text-[#F2CE88] transition-colors">{task.subtaskCompleted || 0}/{task.subtaskCount || 0}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center"><StatusBadge status={task.status} /></td>
                                <td className="px-4 py-3"><div className="flex justify-center"><PriorityBadge priority={task.priority} /></div></td>
                                <td className="px-4 py-3"><span className="text-sm text-gray-400">{formatDate(task.dueDate)}</span></td>
                                <td className="px-4 py-3"><span className="text-sm text-gray-400">{formatDate(task.dueDate)}</span></td>
                                <td className="px-4 py-3"><AssigneeAvatars assignees={task.assignees || []} /></td>
                                <td className="w-12 p-4">
                                    <RowMenu
                                        onEdit={() => onTaskEdit?.(task.id)}
                                        onDelete={() => onTaskDelete?.(task.id)}
                                        onDuplicate={() => onTaskDuplicate?.(task.id)}
                                        onArchive={() => onTaskArchive?.(task.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M8 6C8 4.89543 8.89543 4 10 4H18L24 10V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z" fill="#545454" />
                            <path d="M18 4V8C18 9.10457 18.8954 10 20 10H24" fill="#9E9E9E" />
                        </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No tasks found</p>
                </div>
            )}
        </div>
    )
}
