import { useRef, useEffect } from 'react'
import { TaskCard } from '../../dashboard/TaskCard'
import { Task } from './types'
import { usePanelStore } from '../../../lib/panelStore'

interface DayTaskListPanelProps {
    date: Date | null
    tasks: Task[]
    isOpen: boolean
    onClose: () => void
    onTaskClick: (task: Task) => void
}

export function DayTaskListPanel({
    date,
    tasks,
    isOpen,
    onClose,
    onTaskClick,
}: DayTaskListPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)

    // Sync global panel state
    useEffect(() => {
        setIsPanelOpen(isOpen)
        return () => setIsPanelOpen(false)
    }, [isOpen, setIsPanelOpen])



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

    if (!date) return null

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

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
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#16161f] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out border border-gray-800 ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
                    }`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 rounded-t-2xl bg-[#1e1e29]">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-white">Daily Tasks</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18" />
                                <path d="M6 6L18 18" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-sm text-gray-400">{formattedDate}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-xs font-medium text-gray-300">
                            {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
                        </span>
                    </div>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                            <p>No tasks scheduled for this day.</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
                                <TaskCard
                                    id={task.id}
                                    title={task.title}
                                    description={task.description || ''}
                                    priority={(task.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low'}
                                    assignees={task.assignee ? [{
                                        id: task.assignee.id || 'unknown',
                                        name: task.assignee.name,
                                        avatar: task.assignee.image
                                    }] : []}
                                    type={task.type === 'meeting' ? 'call' : 'task'}
                                    compact
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    )
}
