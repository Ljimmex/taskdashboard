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
    assigneeDetails?: { id: string; name: string; avatar?: string; image?: string }[]
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
  const assignees =
    task.assigneeDetails ||
    task.assignees ||
    ((task as any).assignee ? [(task as any).assignee] : [])

  return (
    <div
      className="z-50 w-80 overflow-hidden rounded-xl border border-gray-800 bg-[#1a1a24] shadow-2xl"
      style={{ borderTopColor: projectColor, borderTopWidth: '3px' }}
    >
      {/* Title and Description */}
      <div className="p-4">
        <h3 className="mb-1 text-sm font-semibold leading-tight text-white">{task.title}</h3>
        {task.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">{task.description}</p>
        )}
      </div>

      {/* Assignees and Date */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Assignee:</span>
          <div className="flex -space-x-2">
            {assignees.slice(0, 3).map((assignee, idx) => (
              <div
                key={idx}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#1a1a24] bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-black"
                title={assignee.name}
              >
                {assignee.name.charAt(0)}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#1a1a24] bg-gray-700 text-xs font-medium text-white">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date and Priority */}
      <div className="flex items-center gap-4 px-4 pb-3">
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
            <span className={`h-2 w-2 rounded-full ${priority.color}`} />
            <span className={`text-xs font-medium ${priority.textColor}`}>{priority.label}</span>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center gap-4 border-t border-gray-800 px-4 py-2 text-xs text-gray-500">
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
