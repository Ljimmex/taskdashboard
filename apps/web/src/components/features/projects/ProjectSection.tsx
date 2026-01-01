import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Maximize2 } from 'lucide-react'
import { GanttView } from './GanttView'
import { TimelineView } from './TimelineView'
import { Task } from './types' // Import shared Task type

interface ProjectSectionProps {
    project: {
        id: string
        name: string
        color?: string
        stages?: any[]
    }
    tasks: Task[]
    viewMode: 'gantt' | 'timeline'
    currentMonth: Date
    onMonthChange: (date: Date) => void
    onTaskClick?: (task: Task) => void
    onAddTask?: (date?: Date) => void
    onDayClick?: (date: Date, tasks: Task[]) => void
    onProjectClick?: (projectId: string) => void
}

export function ProjectSection({
    project,
    tasks,
    viewMode,
    currentMonth,
    onMonthChange,
    onTaskClick,
    onAddTask,
    onDayClick,
    onProjectClick,
}: ProjectSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <div className="bg-[#16161f] rounded-xl border border-gray-700/50 overflow-hidden mb-4 shadow-sm">
            {/* Project Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e29] border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color || '#F87171' }}
                    />
                    <button
                        onClick={() => onProjectClick?.(project.id)}
                        className="text-white font-medium hover:text-[#F2CE88] transition-colors"
                    >
                        {project.name}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onAddTask?.()}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <MoreHorizontal size={16} />
                    </button>
                    <button
                        onClick={() => onProjectClick?.(project.id)}
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        title="Otwórz projekt"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="overflow-hidden"> {/* Changed from overflow-x-auto to handle inner layout */}
                    {viewMode === 'gantt' ? (
                        <GanttView
                            tasks={tasks}
                            projectColor={project.color || '#F87171'}
                            stages={project.stages}
                            currentMonth={currentMonth}
                            onMonthChange={onMonthChange}
                            onTaskClick={onTaskClick}
                        />
                    ) : (
                        <TimelineView
                            tasks={tasks}
                            projectColor={project.color || '#F87171'}
                            currentMonth={currentMonth}
                            onMonthChange={onMonthChange}
                            onTaskClick={onTaskClick}
                            onAddTask={onAddTask}
                            onDayClick={onDayClick}
                        />
                    )}
                </div>
            )}
            <style>{`
                .custom-gantt-scroll::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-gantt-scroll::-webkit-scrollbar-track {
                    background: rgba(31, 31, 46, 0.5);
                    border-radius: 10px;
                }
                .custom-gantt-scroll::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.2);
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .custom-gantt-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.4);
                    background-clip: content-box;
                }
            `}</style>
        </div>
    )
}
