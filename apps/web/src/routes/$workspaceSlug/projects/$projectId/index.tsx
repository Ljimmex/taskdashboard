import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, LayoutGrid, List, Calendar, GitBranch } from 'lucide-react'
import { useSession } from '@/lib/auth'
import { KanbanBoard } from '@/components/features/tasks/KanbanBoard'
import { KanbanBoardHeader } from '@/components/features/tasks/KanbanBoardHeader'
import { TaskListView } from '@/components/features/tasks/TaskListView'
import { ProjectCalendarView } from '@/components/features/projects/ProjectCalendarView'
import { ProjectTimelineView } from '@/components/features/projects/ProjectTimelineView'
import { CreateTaskPanel } from '@/components/features/tasks/CreateTaskPanel'
import { TaskDetailsPanel } from '@/components/features/tasks/TaskDetailsPanel'
import { BulkActions } from '@/components/features/tasks/BulkActions'

export const Route = createFileRoute('/$workspaceSlug/projects/$projectId/')({
  component: ProjectDetailPage,
})

type ViewMode = 'kanban' | 'list' | 'calendar' | 'timeline'

interface Task {
  id: string
  title: string
  description?: string
  projectId: string
  startDate: string | null
  endDate: string | null
  dueDate: string | null
  assigneeId: string | null
  assignee?: { id: string; name: string; avatar?: string; image?: string }
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subtasksCount?: number
  subtasksCompleted?: number
  commentsCount?: number
  status: string
  labels?: any[]
}

interface Project {
  id: string
  name: string
  color?: string
  teamId: string
  stages?: { id: string; name: string; color?: string; position: number }[]
}

function ProjectDetailPage() {
  const { workspaceSlug, projectId } = useParams({ strict: false }) as { workspaceSlug: string; projectId: string }
  const navigate = useNavigate()
  const { data: session } = useSession()

  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTaskPanel, setShowCreateTaskPanel] = useState(false)
  const [defaultDueDate, setDefaultDueDate] = useState<string | undefined>(undefined)
  const [defaultStatus, setDefaultStatus] = useState<string>('todo')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [showTaskDetails, setShowTaskDetails] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])

  // Bulk selection handlers
  const handleTaskSelect = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks(prev => [...prev, taskId])
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(listViewTasks.map(t => t.id))
    } else {
      setSelectedTasks([])
    }
  }

  // Bulk action handlers with API
  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} task(s)?`)) return

    try {
      await fetch('/api/tasks/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: selectedTasks })
      })
      setSelectedTasks([])
      refetchTasks()
    } catch (error) {
      console.error('Bulk delete failed:', error)
    }
  }

  const handleBulkMove = async (stageId: string) => {
    if (selectedTasks.length === 0) return

    try {
      await fetch('/api/tasks/bulk/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: selectedTasks, status: stageId })
      })
      setSelectedTasks([])
      refetchTasks()
    } catch (error) {
      console.error('Bulk move failed:', error)
    }
  }


  // Fetch workspaces to get current workspaceId
  const { data: workspaces } = useQuery({
    queryKey: ['workspaces', session?.user?.id],
    queryFn: async () => {
      const res = await fetch('/api/workspaces', {
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      return res.json().then(r => r.data)
    },
    enabled: !!session?.user?.id
  })

  const currentWorkspace = workspaces?.find((w: any) => w.slug === workspaceSlug)

  // Fetch teams to get members for assignment
  const { data: teamsData } = useQuery({
    queryKey: ['teams', currentWorkspace?.id],
    queryFn: async () => {
      const res = await fetch(`/api/teams?workspaceId=${currentWorkspace?.id}`, {
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      const data = await res.json()
      return data.data || []
    },
    enabled: !!currentWorkspace?.id
  })

  const teamMembers = teamsData?.flatMap((team: any) =>
    team.members?.map((m: any) => ({
      id: m.userId || m.user?.id,
      name: m.user?.name || 'Unknown',
      avatar: m.user?.image
    })) || []
  ) || []

  // Fetch project and tasks
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [projectRes, tasksRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/tasks?projectId=${projectId}`),
        ])
        const projectData = await projectRes.json()
        const tasksData = await tasksRes.json()

        if (projectData.success) setProject(projectData.data)
        if (tasksData.success) setTasks(tasksData.data || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) fetchData()
  }, [projectId])

  const refetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?projectId=${projectId}`)
    const data = await res.json()
    if (data.success) setTasks(data.data || [])
  }, [projectId])

  const refetchTaskDetails = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`)
    const data = await res.json()
    if (data.success) setSelectedTask(data.data)
  }, [])

  // Handle task click
  const handleTaskClick = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`)
    const data = await res.json()
    if (data.success) {
      setSelectedTask(data.data)
      setShowTaskDetails(true)
    }
  }

  // Handle task creation
  const handleCreateTask = async (taskData: any) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ ...taskData, projectId })
      })
      const data = await res.json()
      if (data.success) {
        refetchTasks()
        setShowCreateTaskPanel(false)
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // Handle task move (for Kanban)
  const handleTaskMove = async (taskId: string, _fromColumn: string, toColumn: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ status: toColumn })
      })
      refetchTasks()
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  // Add task handler for calendar/timeline
  const handleAddTask = (date?: Date | string, status?: string) => {
    if (date instanceof Date) setDefaultDueDate(date.toISOString())
    if (typeof date === 'string') setDefaultStatus(date) // Calendar might pass string? No, usually Date.
    // Logic for Kanban passing string as first arg?
    // Let's keep this simple and create separate handlers
    if (date instanceof Date) setDefaultDueDate(date.toISOString())
    if (status) setDefaultStatus(status)
    setShowCreateTaskPanel(true)
  }

  const handleKanbanAddTask = (columnId: string, data?: { title: string; priority: string; status: string; assigneeId?: string; dueDate?: string }) => {
    if (data) {
      handleCreateTask({ ...data, status: columnId })
    } else {
      setDefaultStatus(columnId)
      setShowCreateTaskPanel(true)
    }
  }

  const handleQuickUpdateTask = async (data: { id: string; title: string; priority: string }) => {
    try {
      const res = await fetch(`/api/tasks/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        refetchTasks()
        if (selectedTask?.id === data.id) refetchTaskDetails(data.id)
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Get stage name by ID for status display
  const getStageTitle = (stageId: string) => {
    const stage = project?.stages?.find(s => s.id === stageId)
    return stage?.name || stageId
  }

  // Filter tasks by search query
  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Build Kanban columns from stages with FULL task data
  const kanbanColumns = (project?.stages || []).map(stage => ({
    id: stage.id,
    title: stage.name,
    status: 'todo' as const, // Required by KanbanBoard type
    color: stage.color,
    tasks: filteredTasks.filter(t => t.status === stage.id).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      priority: (t.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
      assignees: t.assignee ? [{ id: t.assignee.id, name: t.assignee.name, avatar: t.assignee.avatar || t.assignee.image }] : [],
      type: 'task' as const,
      status: t.status,
      dueDate: t.dueDate,
      subtaskCount: t.subtasksCount || 0,
      subtaskCompleted: t.subtasksCompleted || 0,
      commentCount: t.commentsCount || 0,
      labels: t.labels || [],
    }))
  }))

  // List view tasks with FULL data
  const listViewTasks = filteredTasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    priority: (t.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
    assignees: t.assignee ? [{ id: t.assignee.id, name: t.assignee.name, avatar: t.assignee.avatar || t.assignee.image }] : [],
    status: t.status,
    statusLabel: getStageTitle(t.status),
    dueDate: t.dueDate,
    startDate: t.startDate,
    endDate: t.endDate,
    subtaskCount: t.subtasksCount || 0,
    subtaskCompleted: t.subtasksCompleted || 0,
    commentCount: t.commentsCount || 0,
    labels: t.labels || [],
    type: 'task' as const,
  }))

  const VIEW_TABS: { id: ViewMode; label: string; Icon: any }[] = [
    { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
    { id: 'list', label: 'Lista', Icon: List },
    { id: 'calendar', label: 'Kalendarz', Icon: Calendar },
    { id: 'timeline', label: 'Timeline', Icon: GitBranch },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading project...
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Project not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Project Info and View Switcher */}
      <div className="flex-none px-6 pt-5 pb-8">
        {/* Top row: Back + Project Name */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate({ to: `/${workspaceSlug}/projects` })}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#1a1a24] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color || '#6366f1' }}
          />
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
        </div>

        {/* View Switcher + KanbanBoardHeader - same row */}
        <div className="flex items-center justify-between">
          <div className="flex bg-[#1a1a24] p-1 rounded-full w-fit">
            {VIEW_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === tab.id
                  ? 'bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                <tab.Icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* KanbanBoardHeader - only for kanban and list views */}
          {(viewMode === 'kanban' || viewMode === 'list') && (
            <KanbanBoardHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewTask={() => setShowCreateTaskPanel(true)}
            />
          )}
        </div>
      </div>

      {/* Content - Full width for Kanban */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'kanban' && (
          <div className="h-full px-6 pb-6">
            <KanbanBoard
              columns={kanbanColumns as any}
              members={teamMembers}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
              onAddTask={handleKanbanAddTask}
              onQuickUpdate={handleQuickUpdateTask}
            />
          </div>
        )}

        {viewMode === 'list' && (
          <div className="px-6 pb-6">
            <TaskListView
              tasks={listViewTasks as any}
              columns={(project.stages || []).map(s => ({ id: s.id, title: s.name, color: s.color || '' })) as any}
              onTaskClick={handleTaskClick}
              selectedTasks={selectedTasks}
              onTaskSelect={handleTaskSelect}
              onSelectAll={handleSelectAll}
            />
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="px-6 pb-6">
            <ProjectCalendarView
              tasks={tasks}
              projectColor={project.color || '#6366f1'}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
            />
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="h-full px-6 pb-6">
            <ProjectTimelineView
              tasks={tasks}
              projectColor={project.color || '#6366f1'}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
            />
          </div>
        )}
      </div>

      {/* Create Task Panel */}
      <CreateTaskPanel
        isOpen={showCreateTaskPanel}
        onClose={() => {
          setShowCreateTaskPanel(false)
          setDefaultDueDate(undefined)
          setDefaultStatus('todo')
        }}
        onCreate={handleCreateTask}
        defaultProject={projectId}
        defaultDueDate={defaultDueDate}
        defaultStatus={defaultStatus}
        projects={project ? [project] as any : []}
        teamMembers={teamMembers}
        workspaceSlug={workspaceSlug}
      />

      {/* Task Details Panel */}
      <TaskDetailsPanel
        task={selectedTask}
        isOpen={showTaskDetails}
        onClose={() => { setShowTaskDetails(false); setSelectedTask(null) }}
        subtasks={selectedTask?.subtasks}
        comments={selectedTask?.comments}
        onSubtaskToggle={async (subtaskId) => {
          if (!selectedTask) return
          const subtask = selectedTask.subtasks?.find((s: any) => s.id === subtaskId)
          if (!subtask) return
          await fetch(`/api/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-user-id': session?.user?.id || '' },
            body: JSON.stringify({ isCompleted: !subtask.isCompleted })
          })
          refetchTaskDetails(selectedTask.id)
          refetchTasks()
        }}
        stages={(project?.stages || []).map(s => ({ id: s.id, name: s.name, color: s.color || '#6366f1' }))}
        teamMembers={teamMembers}
        activities={selectedTask?.activities}
      />

      {/* Bulk Actions Toolbar - fixed at bottom */}
      <BulkActions
        selectedCount={selectedTasks.length}
        columns={(project?.stages || []).map(s => ({ id: s.id, title: s.name, color: s.color || '' }))}
        assignees={teamMembers}
        onDelete={handleBulkDelete}
        onMove={handleBulkMove}
        onClearSelection={() => setSelectedTasks([])}
      />
    </div>
  )
}
