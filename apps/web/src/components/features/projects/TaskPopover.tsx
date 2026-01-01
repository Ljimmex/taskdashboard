import { Calendar, MessageSquare, CheckSquare } from 'lucide-react'

interface TaskPopoverProps {
    task: {
        id: string
        title: string
        description?: string | null
        startDate?: string | null
        endDate?: string | null
        priority?: 'low' | 'medium' | 'high' | 'urgent'
        assignee?: { name: string; image?: string }
        assignees?: { name: string; image?: string }[]
        subtasksCount?: number
        subtasksCompleted?: number
        commentsCount?: number
    }
    projectColor: string
    position?: { x: number; y: number }
}

const priorityConfig = {
    urgent: { label: 'Urgent', color: 'bg-red-500', textColor: 'text-red-500' },
    high: { label: 'High', color: 'bg-orange-500', textColor: 'text-orange-500' },
    medium: { label: 'Medium', color: 'bg-blue-500', textColor: 'text-blue-500' },
    low: { label: 'Low', color: 'bg-gray-400', textColor: 'text-gray-400' },
}

export function TaskPopover({ task, projectColor }: TaskPopoverProps) {
    const priority = task.priority ? priorityConfig[task.priority] : null
    const assignees = task.assignees || (task.assignee ? [task.assignee] : [])

    return (
        <div
            className="w-80 bg-[#1a1a24] rounded-xl shadow-2xl border border-gray-800 overflow-hidden z-50"
            style={{ borderTopColor: projectColor, borderTopWidth: '3px' }}
        >
            {/* Title and Description */}
            <div className="p-4">
                <h3 className="text-white font-semibold text-sm leading-tight mb-1">{task.title}</h3>
                {task.description && (
                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{task.description}</p>
                )}
            </div>

            {/* Assignees and Date */}
            <div className="px-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Assignee:</span>
                    <div className="flex -space-x-2">
                        {assignees.slice(0, 3).map((assignee, idx) => (
                            <div
                                key={idx}
                                className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs text-black font-bold border-2 border-[#1a1a24]"
                                title={assignee.name}
                            >
                                {assignee.name.charAt(0)}
                            </div>
                        ))}
                        {assignees.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white font-medium border-2 border-[#1a1a24]">
                                +{assignees.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Date and Priority */}
            <div className="px-4 pb-3 flex items-center gap-4">
                {task.endDate && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Calendar size={12} />
                        <span className="text-xs">
                            {new Date(task.endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </span>
                    </div>
                )}
                {priority && (
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${priority.color}`} />
                        <span className={`text-xs font-medium ${priority.textColor}`}>{priority.label}</span>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-4 text-gray-500 text-xs">
                <div className="flex items-center gap-1.5">
                    <CheckSquare size={12} />
                    <span>
                        {task.subtasksCompleted || 0}/{task.subtasksCount || 0}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <MessageSquare size={12} />
                    <span>{task.commentsCount || 0}</span>
                </div>
            </div>
        </div>
    )
}
