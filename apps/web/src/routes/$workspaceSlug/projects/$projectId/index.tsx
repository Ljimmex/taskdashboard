import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, LayoutGrid, List, Calendar, GitBranch } from 'lucide-react'
import { useSession } from '@/lib/auth'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { KanbanBoard } from '@/components/features/tasks/views/KanbanBoard'
import { KanbanBoardHeader, type FilterState } from '@/components/features/tasks/views/KanbanBoardHeader'
import { TaskListView } from '@/components/features/tasks/views/TaskListView'
import { ProjectCalendarView } from '@/components/features/projects/ProjectCalendarView'
import { ProjectTimelineView } from '@/components/features/projects/ProjectTimelineView'
import { CreateTaskPanel } from '@/components/features/tasks/panels/CreateTaskPanel'
import { TaskDetailsPanel } from '@/components/features/tasks/panels/TaskDetailsPanel'
import { EditTaskPanel } from '@/components/features/tasks/panels/EditTaskPanel'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { BulkActions } from '@/components/features/tasks/components/BulkActions'


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
  assignees?: string[]
  assigneeDetails?: { id: string; name: string; avatar?: string; image?: string }[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subtasksCount?: number
  subtasksCompleted?: number
  commentsCount?: number
  attachmentCount?: number
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
  const { t } = useTranslation()
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
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    assignedToMe: false,
    overdue: false,
    priorities: [],
    statuses: [],
    labels: [],
    assigneeIds: [],
    dueDateRange: 'all'
  })
  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  // Edit panel state
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [editingTaskSubtasks, setEditingTaskSubtasks] = useState<any[]>([])
  const [showEditTaskPanel, setShowEditTaskPanel] = useState(false)
  // Delete confirmation state
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

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
    if (!confirm(t('board.messages.delete_tasks_confirm', { count: selectedTasks.length }))) return

    try {
      await apiFetch('/api/tasks/bulk/delete', {
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
      await apiFetch('/api/tasks/bulk/move', {
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
      const json = await apiFetchJson<any>('/api/workspaces', {
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      return json.data
    },
    enabled: !!session?.user?.id
  })

  const currentWorkspace = workspaces?.find((w: any) => w.slug === workspaceSlug)

  // Fetch teams to get members for assignment
  const { data: teamsData } = useQuery({
    queryKey: ['teams', currentWorkspace?.id],
    queryFn: async () => {
      const json = await apiFetchJson<any>(`/api/teams?workspaceId=${currentWorkspace?.id}`, {
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      return json.data || []
    },
    enabled: !!currentWorkspace?.id
  })

  // Fetch workspace labels
  const { data: workspaceLabels = [] } = useQuery({
    queryKey: ['labels', workspaceSlug],
    queryFn: async () => {
      const json = await apiFetchJson<any>(`/api/labels?workspaceSlug=${workspaceSlug}`, {
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      return json.success ? json.data : []
    },
    enabled: !!workspaceSlug
  })

  const teamMembers = useMemo(() => {
    const allMembers = teamsData?.flatMap((team: any) =>
      team.members?.map((m: any) => ({
        id: m.userId || m.user?.id,
        name: m.user?.name || t('common.unknown'),
        avatar: m.user?.image,
        image: m.user?.image
      })) || []
    ) || []

    // Deduplicate members by ID
    return Array.from(new Map(allMembers.map((m: any) => [m.id, m])).values()) as { id: string; name: string; avatar?: string }[]
  }, [teamsData])

  // Fetch project and tasks
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [projectData, tasksData] = await Promise.all([
          apiFetchJson<any>(`/api/projects/${projectId}`),
          apiFetchJson<any>(`/api/tasks?projectId=${projectId}`),
        ])

        if (projectData.success) setProject(projectData.data)
        if (tasksData.success) {
          // Deduplicate tasks by ID
          const uniqueTasks = Array.from(new Map((tasksData.data || []).map((t: any) => [t.id, t])).values()) as Task[]
          setTasks(uniqueTasks)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) fetchData()
  }, [projectId])

  const refetchTasks = useCallback(async () => {
    const data = await apiFetchJson<any>(`/api/tasks?projectId=${projectId}`)
    if (data.success) {
      // Deduplicate tasks by ID
      const uniqueTasks = Array.from(new Map((data.data || []).map((t: any) => [t.id, t])).values()) as Task[]
      setTasks(uniqueTasks)
    }
  }, [projectId])

  const refetchTaskDetails = useCallback(async (taskId: string) => {
    const data = await apiFetchJson<any>(`/api/tasks/${taskId}`)
    if (data.success) setSelectedTask(data.data)
  }, [])

  // Handle task click
  const handleTaskClick = async (taskId: string) => {
    const data = await apiFetchJson<any>(`/api/tasks/${taskId}`)
    if (data.success) {
      setSelectedTask(data.data)
      setShowTaskDetails(true)
    }
  }

  // Handle task creation
  const handleCreateTask = async (taskData: any) => {
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ ...taskData, projectId })
      })
      const data = await res.json()
      if (data.success) {
        refetchTasks()
        setShowCreateTaskPanel(false)
        // Return the created task so CreateTaskPanel can upload files
        return data.data
      }
    } catch (error) {
      console.error('Error creating task:', error)
    }
    return null
  }

  // Handle task move (for Kanban)
  const handleTaskMove = async (taskId: string, _fromColumn: string, toColumn: string) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
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
    // Let's keep this simple and create separate handlers
    if (date instanceof Date) setDefaultDueDate(date.toISOString())
    if (status) setDefaultStatus(status)
    setShowCreateTaskPanel(true)
  }

  const handleKanbanAddTask = (columnId: string, data?: { title: string; priority: string; status: string; assignees?: string[]; dueDate?: string }) => {
    if (data) {
      handleCreateTask({ ...data, status: columnId })
    } else {
      setDefaultStatus(columnId)
      setShowCreateTaskPanel(true)
    }
  }

  const handleQuickUpdateTask = async (data: { id: string; title: string; priority: string; assignees?: string[]; dueDate?: string }) => {
    try {
      const res = await apiFetch(`/api/tasks/${data.id}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
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

  // Handle task deletion - triggers confirmation modal
  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId)
  }

  // Confirm delete task
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return
    try {
      const res = await apiFetch(`/api/tasks/${taskToDelete}`, {
        method: 'DELETE',
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      if (res.ok) {
        refetchTasks()
        if (selectedTask?.id === taskToDelete) {
          setShowTaskDetails(false)
          setSelectedTask(null)
        }
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
    setTaskToDelete(null)
  }

  // Handle full edit task (3-dot menu Edit)
  const handleFullEditTask = async (taskId: string) => {
    try {
      // Fetch task details (includes subtasks in response)
      const json = await apiFetchJson<any>(`/api/tasks/${taskId}`)

      if (json.success) {
        const taskData = json.data
        setEditingTask(taskData)
        // Use subtasks from task response (already included in API)
        setEditingTaskSubtasks(taskData.subtasks || [])
        setShowEditTaskPanel(true)
      }
    } catch (error) {
      console.error('Error fetching task for edit:', error)
    }
  }

  // Handle save from EditTaskPanel
  const handleSaveTaskEdit = async (data: {
    id: string
    title: string
    description?: string
    priority: string
    status: string
    dueDate?: string
    assigneeIds?: string[]
    labelIds?: string[]
    links?: any[]
  }) => {
    try {
      // Transform data to match API expectations
      const apiPayload = {
        id: data.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate,
        assignees: data.assigneeIds || [],
        labels: data.labelIds || [],
        links: data.links || [],
      }

      const res = await apiFetch(`/api/tasks/${data.id}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify(apiPayload)
      })
      if (res.ok) {
        refetchTasks()
        if (selectedTask?.id === data.id) refetchTaskDetails(data.id)
        // Close panel after successful save
        setShowEditTaskPanel(false)
        setEditingTask(null)
        setEditingTaskSubtasks([])
      }
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  // Handle creating new label
  const handleCreateLabel = async (name: string, color: string) => {
    try {
      const res = await apiFetch('/api/labels', {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ name, color, workspaceSlug })
      })
      const data = await res.json()
      if (data.success) {
        return data.data as { id: string; name: string; color: string }
      }
      console.error('Error creating label:', data.error)
    } catch (error) {
      console.error('Error creating label:', error)
    }
    // Fallback: create local label
    return { id: `label_${Date.now()} `, name, color }
  }

  // Handle adding subtask in EditTaskPanel
  const handleAddEditSubtask = async (title: string) => {
    if (!editingTask?.id) return
    try {
      const res = await apiFetch(`/api/tasks/${editingTask.id}/subtasks`, {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ title, status: 'todo', priority: 'medium' })
      })
      if (res.ok) {
        // Refetch task to get updated subtasks
        const taskData = await apiFetchJson<any>(`/api/tasks/${editingTask.id}`)
        if (taskData.success) {
          setEditingTaskSubtasks(taskData.data.subtasks || [])
        }
      }
    } catch (error) {
      console.error('Error adding subtask:', error)
    }
  }

  // Handle toggling subtask in EditTaskPanel
  const handleToggleEditSubtask = async (subtaskId: string) => {
    if (!editingTask?.id) return
    const subtask = editingTaskSubtasks.find(s => s.id === subtaskId)
    if (!subtask) return

    try {
      const res = await apiFetch(`/api/tasks/${editingTask.id}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ isCompleted: !subtask.isCompleted })
      })
      if (res.ok) {
        // Update local state
        setEditingTaskSubtasks(prev => prev.map(s =>
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
        ))
      }
    } catch (error) {
      console.error('Error toggling subtask:', error)
    }
  }

  // Handle updating subtask in EditTaskPanel
  const handleUpdateEditSubtask = async (subtaskId: string, updates: any) => {
    if (!editingTask?.id) return
    try {
      const res = await apiFetch(`/api/tasks/${editingTask.id}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        // Update local state
        setEditingTaskSubtasks(prev => prev.map(s =>
          s.id === subtaskId ? { ...s, ...updates } : s
        ))
      }
    } catch (error) {
      console.error('Error updating subtask:', error)
    }
  }

  // Handle deleting subtask in EditTaskPanel
  const handleDeleteEditSubtask = async (subtaskId: string) => {
    if (!editingTask?.id) return
    try {
      const res = await apiFetch(`/api/tasks/${editingTask.id}/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      if (res.ok) {
        // Update local state
        setEditingTaskSubtasks(prev => prev.filter(s => s.id !== subtaskId))
      }
    } catch (error) {
      console.error('Error deleting subtask:', error)
    }
  }

  // Handle adding comment in TaskDetailsPanel
  const handleAddComment = async (content: string, parentId?: string | null) => {
    if (!selectedTask?.id) return
    try {
      const res = await apiFetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ content, parentId })
      })
      if (res.ok) {
        // Refetch task to get updated comments
        refetchTaskDetails(selectedTask.id)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  // Handle liking comment in TaskDetailsPanel
  const handleLikeComment = async (commentId: string) => {
    if (!selectedTask?.id) return
    try {
      const res = await apiFetch(`/api/tasks/${selectedTask.id}/comments/${commentId}/like`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      if (res.ok) {
        // Refetch task to get updated comments
        refetchTaskDetails(selectedTask.id)
      }
    } catch (error) {
      console.error('Error liking comment:', error)
    }
  }

  // Handle task duplication
  const handleDuplicateTask = async (taskId: string) => {
    try {
      const taskData = await apiFetchJson<any>(`/api/tasks/${taskId}`)
      if (!taskData.success) return

      const task = taskData.data
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({
          title: `${task.title} (${t('common.copy')})`,
          description: task.description,
          status: task.status,
          priority: task.priority,
          projectId: task.projectId,
          dueDate: task.dueDate,
          startDate: task.startDate,
        })
      })
      if (res.ok) {
        refetchTasks()
      }
    } catch (error) {
      console.error('Error duplicating task:', error)
    }
  }

  // Handle task archiving
  const handleArchiveTask = async (taskId: string) => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ isArchived: true })
      })
      if (res.ok) {
        refetchTasks()
      }
    } catch (error) {
      console.error('Error archiving task:', error)
    }
  }

  // Get stage name by ID for status display
  const getStageTitle = (stageId: string) => {
    const stage = project?.stages?.find(s => s.id === stageId)
    return stage?.name || stageId
  }

  // Filter tasks by search query and filters
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      // 1. Text Search
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
      if (!matchesSearch) return false

      // 2. Assigned to Me / Specific Assignees
      if (filters.assignedToMe && !t.assignees?.includes(session?.user?.id || '')) return false
      if (filters.assigneeIds.length > 0) {
        const hasMatchingAssignee = t.assignees?.some(id => filters.assigneeIds.includes(id))
        if (!hasMatchingAssignee) return false
      }

      // 3. Priorities
      if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false

      // 4. Statuses
      if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false

      // 5. Labels
      if (filters.labels.length > 0) {
        // Task has array of {id, name, color} or just IDs?
        // API returns labels as array of objects usually, let's check TaskCard props
        const taskLabelIds = t.labels?.map((l: any) => l.id) || []
        const hasMatchingLabel = filters.labels.some(id => taskLabelIds.includes(id))
        if (!hasMatchingLabel) return false
      }

      // 6. Overdue / Date Ranges
      if (filters.overdue) {
        if (!t.dueDate || new Date(t.dueDate) >= new Date()) return false
      }

      if (filters.dueDateRange !== 'all') {
        if (filters.dueDateRange === 'no_date') {
          if (t.dueDate) return false
        } else if (t.dueDate) {
          const d = new Date(t.dueDate)
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const nextWeek = new Date(today)
          nextWeek.setDate(nextWeek.getDate() + 7)

          if (filters.dueDateRange === 'overdue' && d >= now) return false
          if (filters.dueDateRange === 'today') {
            const tDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
            if (tDate.getTime() !== today.getTime()) return false
          }
          if (filters.dueDateRange === 'tomorrow') {
            const tDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
            if (tDate.getTime() !== tomorrow.getTime()) return false
          }
          if (filters.dueDateRange === 'this_week') {
            if (d < today || d > nextWeek) return false
          }
        } else {
          // If range is selected but task has no date, usually exclude it (except no_date)
          if (filters.dueDateRange !== 'overdue') return false // Overdue could imply "should have been done" but if no date, technically not overdue?
        }
      }

      return true
    })

    // Sort tasks if sortBy is set
    if (sortBy) {
      result.sort((a, b) => {
        let valA: any = a[sortBy as keyof Task]
        let valB: any = b[sortBy as keyof Task]

        // Handling Priority (custom order)
        if (sortBy === 'priority') {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          valA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          valB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
        }

        // Handling Dates
        if (sortBy === 'dueDate' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
          valA = valA ? new Date(valA).getTime() : 0
          valB = valB ? new Date(valB).getTime() : 0
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [tasks, searchQuery, filters, session?.user?.id, sortBy, sortDirection])

  // Build Kanban columns from stages with FULL task data
  const kanbanColumns = useMemo(() => {
    return (project?.stages || []).map(stage => ({
      id: stage.id,
      title: stage.name,
      status: 'todo' as const, // Required by KanbanBoard type but overridden by tasks? derived from stage
      color: stage.color,
      tasks: filteredTasks.filter(t => t.status === stage.id).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        priority: (t.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
        assigneeDetails: (t.assigneeDetails || (Array.isArray(t.assignees) && typeof t.assignees[0] === 'object' ? t.assignees : [])) as any[],
        type: 'task' as const,
        status: t.status,
        dueDate: t.dueDate || undefined,
        startDate: t.startDate,
        endDate: t.endDate,
        subtaskCount: t.subtasksCount || 0,
        subtaskCompleted: t.subtasksCompleted || 0,
        commentCount: t.commentsCount || 0,
        attachmentCount: t.attachmentCount || 0,
        labels: t.labels || [],
      }))
    }))
  }, [project?.stages, filteredTasks])

  // List view tasks with FULL data
  const listViewTasks = useMemo(() => {
    return filteredTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      priority: (t.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
      assigneeDetails: (t.assigneeDetails || (Array.isArray(t.assignees) && typeof t.assignees[0] === 'object' ? t.assignees : [])) as any[],
      status: t.status,
      statusLabel: getStageTitle(t.status),
      dueDate: t.dueDate || undefined,
      startDate: t.startDate,
      endDate: t.endDate,
      subtaskCount: t.subtasksCount || 0,
      subtaskCompleted: t.subtasksCompleted || 0,
      commentCount: t.commentsCount || 0,
      attachmentCount: t.attachmentCount || 0,
      labels: t.labels || [],
      type: 'task' as const,
    }))
  }, [filteredTasks, project?.stages])

  const VIEW_TABS: { id: ViewMode; label: string; Icon: any }[] = [
    { id: 'kanban', label: t('board.header.kanban'), Icon: LayoutGrid },
    { id: 'list', label: t('board.header.list'), Icon: List },
    { id: 'calendar', label: t('board.header.calendar'), Icon: Calendar },
    { id: 'timeline', label: t('board.header.timeline'), Icon: GitBranch },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {t('board.messages.loading')}
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {t('board.messages.not_found')}
      </div>
    )
  }

  // Handle creating new stage (column)
  const handleCreateStage = async (name: string, color: string) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/stages`, {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ name, color, position: (project?.stages?.length || 0) })
      })
      if (res.ok) {
        // Refetch project to get updated stages
        const projectData = await apiFetchJson<any>(`/api/projects/${projectId}`)
        if (projectData.success) setProject(projectData.data)
      }
    } catch (error) {
      console.error('Error creating stage:', error)
    }
  }

  // Handle renaming stage (column)
  const handleRenameStage = async (stageId: string, name: string) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ name })
      })
      if (res.ok) {
        // Refetch project to get updated stages
        const projectData = await apiFetchJson<any>(`/api/projects/${projectId}`)
        if (projectData.success) setProject(projectData.data)
      }
    } catch (error) {
      console.error('Error renaming stage:', error)
    }
  }

  // Handle changing stage color
  const handleChangeStageColor = async (stageId: string, color: string) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ color })
      })
      if (res.ok) {
        // Refetch project to get updated stages
        const projectData = await apiFetchJson<any>(`/api/projects/${projectId}`)
        if (projectData.success) setProject(projectData.data)
      }
    } catch (error) {
      console.error('Error changing stage color:', error)
    }
  }

  // Handle deleting stage
  const handleDeleteStage = async (stageId: string) => {
    if (!confirm(t('board.messages.delete_column_confirm'))) return
    try {
      const res = await apiFetch(`/api/projects/${projectId}/stages/${stageId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': session?.user?.id || '' }
      })
      if (res.ok) {
        // Refetch project to get updated stages
        const projectData = await apiFetchJson<any>(`/api/projects/${projectId}`)
        if (projectData.success) setProject(projectData.data)
        refetchTasks()
      }
    } catch (error) {
      console.error('Error deleting stage:', error)
    }
  }

  // Handle reordering stages
  const handleReorderStages = async (oldIndex: number, newIndex: number) => {
    if (!project?.stages) return

    // Create new array with reordered stages
    const newStages = [...project.stages]
    const [removed] = newStages.splice(oldIndex, 1)
    newStages.splice(newIndex, 0, removed)

    // Optimistic update
    setProject(prev => prev ? { ...prev, stages: newStages } : null)

    try {
      const stageIds = newStages.map(s => s.id)
      await apiFetch(`/api/projects/${projectId}/stages/reorder`, {
        method: 'POST',
        headers: { 'x-user-id': session?.user?.id || '' },
        body: JSON.stringify({ stageIds })
      })
    } catch (error) {
      console.error('Error reordering stages:', error)
      // Revert by refetching
      const projectData = await apiFetchJson<any>(`/api/projects/${projectId}`)
      if (projectData.success) setProject(projectData.data)
    }
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
          </button >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color || '#6366f1' }}
          />
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
        </div >

        {/* View Switcher + KanbanBoardHeader - same row */}
        < div className="flex items-center justify-between" >
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
          {
            (viewMode === 'kanban' || viewMode === 'list') && (
              <KanbanBoardHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onNewTask={() => setShowCreateTaskPanel(true)}
                onFilterChange={setFilters}
                currentFilters={filters}
                workspaceSlug={workspaceSlug}
                userId={session?.user?.id}
                onSort={(field, dir) => {
                  setSortBy(field)
                  setSortDirection(dir)
                }}
                members={teamMembers}
                availableLabels={workspaceLabels}
                availableStatuses={project?.stages?.map(s => ({ value: s.id, label: s.name })) || []}
              />
            )
          }
        </div >
      </div >

      {/* Content - Full width for Kanban */}
      < div className="flex-1 min-h-0 overflow-auto" >
        {viewMode === 'kanban' && (
          <div className="h-full px-6 pb-6">
            <KanbanBoard
              columns={kanbanColumns as any}
              members={teamMembers}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
              onTaskFullEdit={handleFullEditTask}
              onTaskDelete={handleDeleteTask}
              onTaskDuplicate={handleDuplicateTask}
              onAddTask={handleKanbanAddTask}
              onQuickUpdate={handleQuickUpdateTask}
              onAddColumn={handleCreateStage}
              onRenameColumn={handleRenameStage}
              onChangeColumnColor={handleChangeStageColor}
              onDeleteColumn={handleDeleteStage}
              onColumnReorder={handleReorderStages}
              userRole={currentWorkspace?.userRole}
              userId={session?.user?.id}
            />
          </div>
        )}

        {viewMode === 'list' && (
          <TaskListView
            tasks={listViewTasks}
            selectedTasks={selectedTasks}
            onTaskSelect={handleTaskSelect}
            onSelectAll={handleSelectAll}
            onTaskClick={(id) => handleTaskClick(id)}
            onTaskEdit={handleFullEditTask}
            onTaskDelete={handleDeleteTask}
            onTaskDuplicate={handleDuplicateTask}
            onTaskArchive={handleArchiveTask}
            columns={kanbanColumns.map(c => ({ id: c.id, title: c.title, color: c.color }))}
            priorities={currentWorkspace?.priorities}
            onSort={(field, dir) => {
              setSortBy(field)
              setSortDirection(dir)
            }}
            userRole={currentWorkspace?.userRole}
            userId={session?.user?.id}
            onQuickUpdate={handleQuickUpdateTask}
          />
        )}

        {viewMode === 'calendar' && (
          <ProjectCalendarView
            tasks={tasks}
            projectColor={project?.color || '#6366f1'}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onTaskClick={(id) => handleTaskClick(id)}
            onAddTask={handleAddTask}
          />
        )}

        {viewMode === 'timeline' && (
          <ProjectTimelineView
            tasks={tasks}
            projectColor={project?.color || '#6366f1'}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onTaskClick={(id) => handleTaskClick(id)}
            onAddTask={handleAddTask}
            timezone={currentWorkspace?.settings?.timezone}
          />
        )}
      </div >

      {/* Create Task Panel */}
      < CreateTaskPanel
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
        userId={session?.user?.id}
      />

      {/* Task Details Panel */}
      < TaskDetailsPanel
        task={selectedTask}
        isOpen={showTaskDetails}
        onClose={() => { setShowTaskDetails(false); setSelectedTask(null) }}
        subtasks={selectedTask?.subtasks}
        comments={selectedTask?.comments}
        availableLabels={workspaceLabels}
        onSubtaskToggle={async (subtaskId) => {
          if (!selectedTask) return
          const subtask = selectedTask.subtasks?.find((s: any) => s.id === subtaskId)
          if (!subtask) return
          await apiFetch(`/api/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
            method: 'PATCH',
            headers: { 'x-user-id': session?.user?.id || '' },
            body: JSON.stringify({ isCompleted: !subtask.isCompleted })
          })
          refetchTaskDetails(selectedTask.id)
          refetchTasks()
        }}
        onAddComment={handleAddComment}
        onLikeComment={handleLikeComment}
        stages={(project?.stages || []).map((s: any, i: number) => ({ id: s.id, name: s.name, color: s.color || '#6366f1', position: s.position ?? i }))}
        teamMembers={teamMembers}
        activities={selectedTask?.activities}
      />

      {/* Bulk Actions Toolbar - fixed at bottom */}
      < BulkActions
        selectedCount={selectedTasks.length}
        columns={(project?.stages || []).map(s => ({ id: s.id, title: s.name, color: s.color || '' }))}
        assignees={teamMembers}
        onDelete={handleBulkDelete}
        onMove={handleBulkMove}
        onClearSelection={() => setSelectedTasks([])}
      />

      {/* Edit Task Panel */}
      <EditTaskPanel
        task={editingTask}
        isOpen={showEditTaskPanel}
        onClose={() => { setShowEditTaskPanel(false); setEditingTask(null); setEditingTaskSubtasks([]) }}
        onSave={handleSaveTaskEdit}
        subtasks={editingTaskSubtasks}
        onAddSubtask={handleAddEditSubtask}
        onSubtaskToggle={handleToggleEditSubtask}
        onEditSubtask={handleUpdateEditSubtask}
        onDeleteSubtask={handleDeleteEditSubtask}
        stages={(project?.stages || []).map(s => ({ id: s.id, name: s.name, color: s.color || '#6366f1' }))}
        teamMembers={teamMembers}
        availableLabels={workspaceLabels}
        onCreateLabel={handleCreateLabel}
        workspaceSlug={workspaceSlug}
        userId={session?.user?.id}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDeleteTask}
      />
    </div >
  )
}
