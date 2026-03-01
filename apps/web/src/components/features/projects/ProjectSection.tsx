import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Maximize2, Edit2, Trash2 } from 'lucide-react'
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
    onEditProject?: (project: any) => void
    onDeleteProject?: (project: any) => void
    userRole?: string
}

function ProjectMenu({ project, onEditProject, onDeleteProject }: { project: any; onEditProject?: (p: any) => void; onDeleteProject?: (p: any) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const { t } = useTranslation()

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
                <MoreHorizontal size={16} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a24] rounded-xl shadow-2xl z-[100] py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            onEditProject?.(project)
                            setIsOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800/80 hover:text-white transition-colors flex items-center gap-3"
                    >
                        <Edit2 size={14} />
                        {t('project_edit.menu.edit_project')}
                    </button>
                    <div className="my-1 mx-2 h-px bg-gray-800" />
                    <button
                        onClick={() => {
                            onDeleteProject?.(project)
                            setIsOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3"
                    >
                        <Trash2 size={14} />
                        {t('project_edit.menu.delete_project')}
                    </button>
                </div>
            )}
        </div>
    )
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
    onEditProject,
    onDeleteProject,
    userRole,
}: ProjectSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    const canEditProject = userRole && !['member', 'guest'].includes(userRole)

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
                    {canEditProject && (
                        <ProjectMenu
                            project={project}
                            onEditProject={onEditProject}
                            onDeleteProject={onDeleteProject}
                        />
                    )}
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
        </div>
    )
}
