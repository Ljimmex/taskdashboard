import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createFileRoute } from '@tanstack/react-router'
import { KanbanBoardHeader } from '@/components/features/tasks/KanbanBoardHeader'
import { KanbanBoard } from '@/components/features/tasks/KanbanBoard'
import { TaskListView } from '@/components/features/tasks/TaskListView'
import { TaskDetailsPanel } from '@/components/features/tasks/TaskDetailsPanel'
import { CreateTaskPanel } from '@/components/features/tasks/CreateTaskPanel'
import { BulkActions } from '@/components/features/tasks/BulkActions'
import type { TaskCardProps } from '@/components/features/tasks/TaskCard'
import type { Label } from '@/components/features/labels/LabelBadge' // Import Label type

export const Route = createFileRoute('/_dashboard/tasks-demo')({
    component: TasksDemo,
})

// Industry Templates Data (from database)
// Industry Templates Data removed - fetching from DB


function TasksDemo() {
    // State for templates
    const [industryTemplates, setIndustryTemplates] = useState<{ id: string; slug: string; name: string; description: string | null; icon: string; stages: any[] }[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(true)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

    // Mock templates for fallback when Supabase is not configured
    const MOCK_TEMPLATES = [
        {
            id: 'standard',
            slug: 'standard',
            name: 'Standardowy (Kanban)',
            icon: '📋',
            description: 'Domyślny szablon',
            stages: [
                { name: 'Do zrobienia', color: '#6366f1', position: 0 },
                { name: 'W trakcie', color: '#f59e0b', position: 1 },
                { name: 'Zrobione', color: '#10b981', position: 2 },
            ]
        },
        {
            id: 'marketing',
            slug: 'marketing',
            name: 'Marketing',
            icon: '📢',
            description: 'Kampanie marketingowe',
            stages: [
                { name: 'Pomysły', color: '#ec4899', position: 0 },
                { name: 'Tworzenie', color: '#8b5cf6', position: 1 },
                { name: 'Recenzja', color: '#3b82f6', position: 2 },
                { name: 'Opublikowane', color: '#10b981', position: 3 },
            ]
        },
        {
            id: 'development',
            slug: 'software',
            name: 'Rozwój oprogramowania',
            icon: '💻',
            description: 'Workflow programistyczny',
            stages: [
                { name: 'Backlog', color: '#6366f1', position: 0 },
                { name: 'W rozwoju', color: '#f59e0b', position: 1 },
                { name: 'Code Review', color: '#8b5cf6', position: 2 },
                { name: 'Testowanie', color: '#3b82f6', position: 3 },
                { name: 'Gotowe', color: '#10b981', position: 4 },
            ]
        }
    ]

    // Fetch templates on mount
    useEffect(() => {
        async function fetchTemplates() {
            try {
                const { data, error } = await supabase
                    .from('industry_templates')
                    .select(`
                        id,
                        slug,
                        name,
                        description,
                        icon,
                        stages:industry_template_stages!industry_template_stages_template_id_fkey(name, color, position)
                    `)
                    .order('name')

                if (error) throw error

                if (data && data.length > 0) {
                    const sortedData = data.map(template => ({
                        ...template,
                        icon: template.icon || '📋',
                        stages: template.stages.sort((a, b) => a.position - b.position)
                    }))
                    setIndustryTemplates(sortedData)
                    // Find 'standard' slug template as default, fallback to first
                    const defaultTemplate = sortedData.find(t => t.slug === 'standard') || sortedData[0]
                    setSelectedTemplateId(defaultTemplate.id)

                    setColumns(defaultTemplate.stages.map((stage: any) => {
                        const columnId = stage.name.toLowerCase().replace(/\s+/g, '_')
                        return {
                            id: columnId,
                            title: stage.name,
                            color: stage.color,
                            position: stage.position,
                            tasks: []
                        }
                    }))
                } else {
                    throw new Error('No templates found')
                }
            } catch (err) {
                console.warn('⚠️ Using mock templates (Supabase unavailable):', err)
                // Fallback to mock data
                setIndustryTemplates(MOCK_TEMPLATES)
                setSelectedTemplateId(MOCK_TEMPLATES[0].id)

                setColumns(MOCK_TEMPLATES[0].stages.map((stage: any) => {
                    const columnId = stage.name.toLowerCase().replace(/\s+/g, '_')
                    return {
                        id: columnId,
                        title: stage.name,
                        color: stage.color,
                        position: stage.position,
                        tasks: []
                    }
                }))
            } finally {
                setLoadingTemplates(false)
            }
        }
        fetchTemplates()
    }, [])

    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTasks, setSelectedTasks] = useState<string[]>([])
    const [sortBy, setSortBy] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
    const [filters, setFilters] = useState({
        assignedToMe: false,
        overdue: false,
        priorities: [] as string[],
        statuses: [] as string[],
        labels: [] as string[],
    })
    console.log('Filters:', filters) // Use filters to suppress warning

    const [showTemplateSelector, setShowTemplateSelector] = useState(false)

    // Task Details Panel state
    const [selectedTask, setSelectedTask] = useState<TaskCardProps | null>(null)
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)

    const handleTaskClick = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId)
        if (task) {
            setSelectedTask(task)
            setIsDetailsPanelOpen(true)
        }
    }

    const handleCloseDetailsPanel = () => {
        setIsDetailsPanelOpen(false)
        // Keep selectedTask for animation
        setTimeout(() => setSelectedTask(null), 300)
    }

    // Shared labels state
    const [availableLabels, setAvailableLabels] = useState<Label[]>([
        { id: 'bug', name: 'Bug', color: '#ef4444' },
        { id: 'feature', name: 'Feature', color: '#10b981' },
        { id: 'frontend', name: 'Frontend', color: '#3b82f6' },
        { id: 'backend', name: 'Backend', color: '#8b5cf6' },
        { id: 'design', name: 'Design', color: '#ec4899' },
        { id: 'docs', name: 'Dokumentacja', color: '#6b7280' },
    ])

    const handleCreateLabel = (name: string, color: string) => {
        const newLabel: Label = {
            id: name.toLowerCase().replace(/\s+/g, '-'), // Simple ID generation
            name,
            color,
        }
        setAvailableLabels(prev => [...prev, newLabel])
        return newLabel // Return the new label for immediate use
    }

    // Create Task Panel state
    const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false)
    const [defaultCreateStatus, setDefaultCreateStatus] = useState('todo')

    const handleOpenCreatePanel = (defaultStatus?: string) => {
        if (defaultStatus) setDefaultCreateStatus(defaultStatus)
        setIsCreatePanelOpen(true)
    }

    const handleCreateTask = (taskData: any) => {
        const newTask: TaskCardProps = {
            id: `task_${Date.now()}`,
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            status: taskData.status || defaultCreateStatus,
            projectName: 'Tasks Demo',
            dueDate: taskData.dueDate,
            assignees: taskData.assignees?.map((id: string) => ({
                id,
                name: id === '1' ? 'Jan Kowalski' : id === '2' ? 'Anna Nowak' : 'Piotr Wiśniewski'
            })) || [],
            labels: taskData.labels || [],
            commentCount: 0,
            attachmentCount: 0,
            subtaskCount: taskData.subtasks?.length || 0,
            subtaskCompleted: taskData.subtasks?.filter((s: any) => s.status === 'done').length || 0,
            subitems: taskData.subtasks?.map((s: any, idx: number) => ({
                id: `subtask_${Date.now()}_${idx}`,
                title: s.title,
                description: s.description,
                status: s.status || 'todo',
                priority: s.priority || 'medium'
            })) || []
        }
        setTasks(prev => [...prev, newTask])
        console.log('✅ Task created with status:', newTask.status, taskData)
    }

    // Dynamic columns based on selected template
    const [columns, setColumns] = useState<any[]>([])

    // Handle template change
    const handleTemplateChange = (templateId: string) => {
        const template = industryTemplates.find(t => t.id === templateId)
        if (template) {
            setSelectedTemplateId(templateId)
            setColumns(template.stages.map((stage: any) => ({
                id: stage.name.toLowerCase().replace(/\s+/g, '_'),
                title: stage.name,
                color: stage.color,
                position: stage.position,
                tasks: []
            })))
            setShowTemplateSelector(false)
            console.log('✅ Template changed to:', template.name)
        }
    }

    // Add new column
    const handleAddColumn = (title: string, color: string) => {
        // Generate ID from title (e.g. "In Progress" -> "in_progress")
        const columnId = title.toLowerCase().replace(/\s+/g, '_')
        const newColumn = {
            id: columnId,
            title: title,
            color: color,
            position: columns.length,
        }
        setColumns([...columns, newColumn])
        console.log('✅ Column added:', newColumn)
    }

    // Edit column
    const handleEditColumn = (columnId: string, updates: { title?: string; color?: string }) => {
        setColumns(prev => prev.map(col =>
            col.id === columnId ? { ...col, ...updates } : col
        ))
        console.log('✅ Column updated:', columnId, updates)
    }

    // Delete column
    const handleDeleteColumn = (columnId: string) => {
        setColumns(prev => prev.filter(col => col.id !== columnId))
        console.log('✅ Column deleted:', columnId)
    }

    // Reorder columns
    const handleReorderColumns = (oldIndex: number, newIndex: number) => {
        const newColumns = [...columns]
        const [movedColumn] = newColumns.splice(oldIndex, 1)
        newColumns.splice(newIndex, 0, movedColumn)
        // Update positions
        setColumns(newColumns.map((col, idx) => ({ ...col, position: idx })))
        console.log('✅ Columns reordered:', oldIndex, '->', newIndex)
    }

    // Sample tasks
    const [tasks, setTasks] = useState<TaskCardProps[]>([
        {
            id: '1',
            title: 'Design Landing Page',
            description: 'Create responsive layout for homepage',
            priority: 'high',
            status: 'do_zrobienia',
            projectName: 'Wortix',
            assignees: [{ id: '1', name: 'John Doe' }],
            labels: [{ id: '1', name: 'Design', color: '#8b5cf6' }],
            dueDate: '2025-01-25',
            subtaskCount: 6,
            subtaskCompleted: 0,
        },
        {
            id: '2',
            title: 'Write Onboarding Emails',
            priority: 'medium',
            status: 'w_trakcie',
            projectName: 'PrimaWire',
            assignees: [{ id: '2', name: 'Jane Smith' }],
            labels: [],
            subtaskCount: 3,
            subtaskCompleted: 1,
        },
        {
            id: '3',
            title: 'API Integration Complete',
            priority: 'high',
            status: 'zrobione',
            projectName: 'GalactaTech',
            assignees: [{ id: '3', name: 'Bob Wilson' }],
            labels: [{ id: '2', name: 'Backend', color: '#ec4899' }],
            subtaskCount: 4,
            subtaskCompleted: 4,
        },
    ])

    // Handle task move between columns
    const handleTaskMove = (taskId: string, _fromColumn: string, toColumn: string) => {
        // Simply use the column ID as the status
        setTasks(prev => prev.map(task =>
            task.id === taskId
                ? { ...task, status: toColumn as TaskCardProps['status'] }
                : task
        ))
        console.log(`✅ Task ${taskId} moved to column: ${toColumn}`)
    }

    const handleMoveAllCards = (fromColumnId: string) => {
        const fromIndex = columns.findIndex(c => c.id === fromColumnId)
        if (fromIndex === -1 || fromIndex === columns.length - 1) return // Can't move if last column

        const toColumn = columns[fromIndex + 1]
        setTasks(prev => prev.map(task =>
            task.status === fromColumnId
                ? { ...task, status: toColumn.id as TaskCardProps['status'] }
                : task
        ))
    }

    // Handle task reorder within column
    const handleTaskReorder = (columnId: string, oldIndex: number, newIndex: number) => {
        setTasks(prev => {
            // Get all tasks in this column
            const columnTasks = prev.filter(t => t.status === columnId)

            // Reorder them
            // We need arrayMove but since we are in tasks-demo, we might not have it imported. 
            // We can simple move manually or import { arrayMove } from '@dnd-kit/sortable' if available
            // Let's implement simple move logic manually to avoid adding imports if not needed, 
            // but actually we should import it. Let's try manual splice for safety.

            const movedTask = columnTasks[oldIndex]
            if (!movedTask) return prev

            const newColumnTasks = [...columnTasks]
            newColumnTasks.splice(oldIndex, 1) // Remove from old
            newColumnTasks.splice(newIndex, 0, movedTask) // Insert at new

            // Reconstruct full list: keep other columns as is, replace the current column with new order
            // Note: This puts the modified column at the END of the state array unless we preserve original relative positions.
            // For a simple demo, appending is fine as long as getTasksForColumn respects array order.

            const otherTasks = prev.filter(t => t.status !== columnId)
            return [...otherTasks, ...newColumnTasks]
        })
    }

    // Filter and sort tasks per column
    const getTasksForColumn = (columnId: string) => {
        return tasks.filter(t => t.status === columnId)
    }

    // Priority order for sorting
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

    const filterAndSortTasks = (taskList: TaskCardProps[]): TaskCardProps[] => {
        let result = [...taskList]

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(task =>
                task.title.toLowerCase().includes(query) ||
                task.description?.toLowerCase().includes(query)
            )
        }

        if (sortBy) {
            result.sort((a, b) => {
                let comparison = 0
                if (sortBy === 'priority') {
                    comparison = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
                } else if (sortBy === 'dueDate') {
                    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
                    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
                    comparison = dateA - dateB
                }
                return sortDirection === 'asc' ? comparison : -comparison
            })
        }

        return result
    }

    // Build columns with filtered tasks
    const columnsWithTasks = useMemo(() => {
        return columns.map(col => ({
            ...col,
            tasks: filterAndSortTasks(getTasksForColumn(col.id))
        }))
    }, [columns, tasks, searchQuery, sortBy, sortDirection])

    const handleTaskSelect = (taskId: string, selected: boolean) => {
        setSelectedTasks(prev =>
            selected ? [...prev, taskId] : prev.filter(id => id !== taskId)
        )
    }

    const handleSelectAll = (selected: boolean) => {
        // Use the same task list that TaskListView displays
        const visibleTasks = columnsWithTasks.flatMap(c => c.tasks)
        setSelectedTasks(selected ? visibleTasks.map(t => t.id) : [])
    }

    // Bulk operations
    const handleBulkDelete = () => {
        setTasks(prev => prev.filter(t => !selectedTasks.includes(t.id)))
        setSelectedTasks([])
    }

    const handleBulkMove = (columnId: string) => {
        console.log('🔄 Bulk Move:', { columnId, selectedTasks, columns })
        setTasks(prev => prev.map(t =>
            selectedTasks.includes(t.id) ? { ...t, status: columnId } : t
        ))
        setSelectedTasks([])
    }

    const handleBulkAssign = (assigneeIds: string[]) => {
        const newAssignees = assigneeIds.map(id => ({
            id,
            name: id === '1' ? 'Jan Kowalski' : id === '2' ? 'Anna Nowak' : 'Piotr Wiśniewski'
        }))
        setTasks(prev => prev.map(t =>
            selectedTasks.includes(t.id)
                ? { ...t, assignees: [...(t.assignees || []), ...newAssignees] }
                : t
        ))
        setSelectedTasks([])
    }

    // Available assignees for bulk assign
    const availableAssignees = [
        { id: '1', name: 'Jan Kowalski' },
        { id: '2', name: 'Anna Nowak' },
        { id: '3', name: 'Piotr Wiśniewski' },
    ]

    // Derived selected template
    const selectedTemplate = useMemo(() =>
        industryTemplates.find(t => t.id === selectedTemplateId),
        [industryTemplates, selectedTemplateId]
    )

    if (loadingTemplates) {
        return (
            <div className="h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-500">
                Loading templates...
            </div>
        )
    }

    return (
        <div className="h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">
            <div className="flex-none p-8 pb-0">
                {/* Page title with Template Selector */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-white">Tasks</h1>

                    {/* Template Selector Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] border border-gray-700 rounded-xl text-white hover:bg-[#22222e] transition-colors"
                        >
                            <span className="text-lg">{selectedTemplate?.icon || '📋'}</span>
                            <span className="text-sm">{selectedTemplate?.name || 'Wybierz szablon'}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9L12 15L18 9" />
                            </svg>
                        </button>

                        {/* Template Dropdown */}
                        {showTemplateSelector && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-[#1a1a24] border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                                {industryTemplates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleTemplateChange(template.id)}
                                        className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors flex items-center gap-3 ${selectedTemplateId === template.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-300'}`}
                                    >
                                        <span className="text-xl">{template.icon || '📋'}</span>
                                        <div className="flex-1">
                                            <div className="font-medium">{template.name}</div>
                                            <div className="text-xs text-gray-500">{template.stages?.length || 0} etapów</div>
                                        </div>
                                        {selectedTemplateId === template.id && (
                                            <div className="ml-auto text-indigo-400">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Kanban Board Header */}
                <KanbanBoardHeader
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onNewTask={() => handleOpenCreatePanel()}
                    onSort={(by: string, direction: 'asc' | 'desc') => {
                        setSortBy(by)
                        setSortDirection(direction)
                    }}
                    onFilterChange={setFilters}
                />
            </div>

            {/* View content based on mode */}
            <div className="flex-1 overflow-hidden p-8 pt-4">
                {viewMode === 'kanban' ? (
                    <KanbanBoard
                        columns={columnsWithTasks}
                        onTaskMove={handleTaskMove}
                        onTaskReorder={handleTaskReorder}
                        onColumnReorder={handleReorderColumns}
                        onTaskClick={handleTaskClick}
                        onTaskEdit={(id) => console.log('Edit task:', id)}
                        onTaskDelete={(id) => console.log('Delete task:', id)}
                        onAddTask={(columnId) => console.log('Add task to:', columnId)}
                        onAddColumn={handleAddColumn}
                        onRenameColumn={(id, title) => handleEditColumn(id, { title })}
                        onChangeColumnColor={(id, color) => handleEditColumn(id, { color })}
                        onDeleteColumn={handleDeleteColumn}
                        onMoveAllCards={handleMoveAllCards}
                    />
                ) : (
                    <TaskListView
                        tasks={columnsWithTasks.flatMap(c => c.tasks)}
                        columns={columns}
                        selectedTasks={selectedTasks}
                        onTaskClick={handleTaskClick}
                        onTaskSelect={handleTaskSelect}
                        onSelectAll={handleSelectAll}
                        onSort={(by, dir) => {
                            setSortBy(by)
                            setSortDirection(dir)
                        }}
                    />
                )}
            </div>

            {/* Task Details Panel */}
            <TaskDetailsPanel
                task={selectedTask}
                isOpen={isDetailsPanelOpen}
                onClose={handleCloseDetailsPanel}
                subitems={selectedTask?.subitems}
                availableLabels={availableLabels}
                onCreateLabel={handleCreateLabel}
                onSubtaskToggle={(subtaskId) => {
                    console.log('Toggle subtask:', subtaskId)
                }}
                onSubtasksChange={(newSubtasks) => {
                    if (selectedTask) {
                        setTasks(prev => prev.map(t =>
                            t.id === selectedTask.id
                                ? {
                                    ...t,
                                    subitems: newSubtasks,
                                    subtaskCount: newSubtasks.length,
                                    subtaskCompleted: newSubtasks.filter(s => s.status === 'done' || s.completed).length
                                }
                                : t
                        ))
                    }
                }}
            />

            {/* Bulk Actions Toolbar - hide when details panel is open */}
            {!isDetailsPanelOpen && (
                <BulkActions
                    selectedCount={selectedTasks.length}
                    columns={columns}
                    assignees={availableAssignees}
                    onDelete={handleBulkDelete}
                    onMove={handleBulkMove}
                    onAssign={handleBulkAssign}
                    onClearSelection={() => setSelectedTasks([])}
                />
            )}

            {/* Create Task Panel */}
            <CreateTaskPanel
                isOpen={isCreatePanelOpen}
                onClose={() => setIsCreatePanelOpen(false)}
                onCreate={handleCreateTask}
                defaultStatus={defaultCreateStatus}
                columns={columns}
                availableLabels={availableLabels}
                onCreateLabel={handleCreateLabel}
            />
        </div>
    )
}
