import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ProjectsHeader } from '@/components/features/projects/ProjectsHeader'
import { ProjectSection } from '@/components/features/projects/ProjectSection'
import { CreateProjectPanel } from '@/components/features/projects/CreateProjectPanel'
import { CreateTaskPanel } from '@/components/features/tasks/panels/CreateTaskPanel'
import { TaskDetailsPanel } from '@/components/features/tasks/panels/TaskDetailsPanel'
import { DayTaskListPanel } from '@/components/features/projects/DayTaskListPanel'

import { useSession } from '@/lib/auth'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/$workspaceSlug/projects/')({
    component: ProjectsPage,
})

interface Project {
    id: string
    name: string
    color?: string
    teamId: string
    industryTemplateId?: string | null
    stages?: any[]
}

interface Task {
    id: string
    title: string
    description?: string
    projectId: string
    startDate: string | null
    endDate: string | null
    dueDate: string | null
    assigneeId: string | null
    assignee?: { id: string; name: string; avatar?: string }
    priority: 'low' | 'medium' | 'high' | 'urgent'
    subtasksCount?: number
    subtasksCompleted?: number
    commentsCount?: number
    status: string
}

function ProjectsPage() {
    const { t } = useTranslation()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const navigate = useNavigate()
    const { data: session } = useSession()
    const [viewMode, setViewMode] = useState<'gantt' | 'timeline'>('gantt')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [projects, setProjects] = useState<Project[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreatePanel, setShowCreatePanel] = useState(false)
    const [showCreateTaskPanel, setShowCreateTaskPanel] = useState(false)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [selectedTask, setSelectedTask] = useState<any | null>(null)
    const [showTaskDetails, setShowTaskDetails] = useState(false)
    const [defaultDueDate, setDefaultDueDate] = useState<string | undefined>(undefined)

    // Day List Panel State
    const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([])
    const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null)
    const [showDayListPanel, setShowDayListPanel] = useState(false)

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

    // Fetch projects and tasks
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true)
                const [projectsData, tasksData] = await Promise.all([
                    apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`),
                    apiFetchJson<any>(`/api/tasks?workspaceSlug=${workspaceSlug}`),
                ])

                if (projectsData.success) setProjects(projectsData.data || [])
                if (tasksData.success) {
                    // Map dueDate to endDate for display in ProjectSection
                    const mappedTasks = (tasksData.data || []).map((t: any) => ({
                        ...t,
                        startDate: t.startDate || null,
                        endDate: t.dueDate || null,
                        subtaskCount: t.subtasksCount,
                        subtaskCompleted: t.subtasksCompleted,
                        assignees: t.assignee ? [{ id: t.assignee.id, name: t.assignee.name, avatar: t.assignee.image }] : []
                    }))
                    setTasks(mappedTasks)
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])



    // Group tasks by project
    const tasksByProject = new Map<string, Task[]>()
    tasks.forEach((task) => {
        if (!tasksByProject.has(task.projectId)) {
            tasksByProject.set(task.projectId, [])
        }
        tasksByProject.get(task.projectId)!.push(task)
    })

    // Filter projects by search
    const filteredProjects = searchQuery
        ? projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : projects

    const handleNewProject = () => {
        setShowCreatePanel(true)
    }

    const refetchProjects = useCallback(async () => {
        const data = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`)
        if (data.success) setProjects(data.data || [])
    }, [workspaceSlug])

    const refetchTasks = useCallback(async () => {
        const data = await apiFetchJson<any>(`/api/tasks?workspaceSlug=${workspaceSlug}`)
        if (data.success) {
            const mappedTasks = (data.data || []).map((t: any) => ({
                ...t,
                startDate: t.startDate || null,
                endDate: t.dueDate || null,
                assignees: t.assignee ? [{ id: t.assignee.id, name: t.assignee.name, avatar: t.assignee.image }] : []
            }))
            setTasks(mappedTasks)
        }
    }, [workspaceSlug])

    const handleCreateTask = async (taskData: any): Promise<{ id: string } | null> => {
        try {
            const res = await apiFetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify({
                    ...taskData,
                    projectId: selectedProjectId || taskData.projectId
                })
            })
            const data = await res.json()
            if (data.success) {
                refetchTasks()
                setShowCreateTaskPanel(false)
                return { id: data.data.id }
            }
            return null
        } catch (error) {
            console.error('Error creating task:', error)
            return null
        }
    }

    const refetchTaskDetails = async (taskId: string) => {
        const data = await apiFetchJson<any>(`/api/tasks/${taskId}`)
        if (data.success) {
            setSelectedTask(data.data)
        }
    }

    const handleSubtaskToggle = async (subtaskId: string) => {
        if (!selectedTask) return
        const subtask = selectedTask.subtasks?.find((s: any) => s.id === subtaskId)
        if (!subtask) return

        try {
            await apiFetch(`/api/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
                method: 'PATCH',
                headers: { 'x-user-id': session?.user?.id || '' },
                body: JSON.stringify({ isCompleted: !subtask.isCompleted })
            })
            refetchTaskDetails(selectedTask.id)
            refetchTasks()
        } catch (error) {
            console.error('Error toggling subtask:', error)
        }
    }

    const handleSubtaskEdit = async (subtaskId: string, updates: any) => {
        if (!selectedTask) return
        try {
            await apiFetch(`/api/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
                method: 'PATCH',
                headers: { 'x-user-id': session?.user?.id || '' },
                body: JSON.stringify(updates)
            })
            refetchTaskDetails(selectedTask.id)
            refetchTasks()
        } catch (error) {
            console.error('Error editing subtask:', error)
        }
    }

    const handleSubtaskDelete = async (subtaskId: string) => {
        if (!selectedTask) return
        try {
            await apiFetch(`/api/tasks/${selectedTask.id}/subtasks/${subtaskId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': session?.user?.id || '' }
            })
            refetchTaskDetails(selectedTask.id)
            refetchTasks()
        } catch (error) {
            console.error('Error deleting subtask:', error)
        }
    }

    const handleSubtaskAdd = async (title: string) => {
        if (!selectedTask) return
        try {
            await apiFetch(`/api/tasks/${selectedTask.id}/subtasks`, {
                method: 'POST',
                headers: { 'x-user-id': session?.user?.id || '' },
                body: JSON.stringify({ title, status: 'todo', priority: 'medium' })
            })
            refetchTaskDetails(selectedTask.id)
            refetchTasks()
        } catch (error) {
            console.error('Error adding subtask:', error)
        }
    }

    const handleAssigneesChange = async (assignees: any[]) => {
        if (!selectedTask) return
        try {
            // Frontend supports multiple, backend singular for now
            const assigneeId = assignees[0]?.id || null
            const res = await apiFetch(`/api/tasks/${selectedTask.id}`, {
                method: 'PATCH',
                headers: { 'x-user-id': session?.user?.id || '' },
                body: JSON.stringify({ assigneeId })
            })
            const data = await res.json()
            if (data.success) {
                refetchTaskDetails(selectedTask.id)
                refetchTasks()
            }
        } catch (error) {
            console.error('Error updating assignees:', error)
        }
    }

    const handleLabelsChange = async (labels: any[]) => {
        if (!selectedTask) return
        try {
            const labelIds = labels.map(l => l.id)
            const res = await apiFetch(`/api/tasks/${selectedTask.id}`, {
                method: 'PATCH',
                headers: { 'x-user-id': session?.user?.id || '' },
                body: JSON.stringify({ labels: labelIds })
            })
            const data = await res.json()
            if (data.success) {
                refetchTaskDetails(selectedTask.id)
                refetchTasks()
            }
        } catch (error) {
            console.error('Error updating labels:', error)
        }
    }

    const handleAddComment = async (content: string, parentId?: string | null) => {
        if (!selectedTask) return
        try {
            const res = await apiFetch(`/api/tasks/${selectedTask.id}/comments`, {
                method: 'POST',
                headers: { 'x-user-id': session?.user?.id || '' },
                body: JSON.stringify({ content, parentId })
            })
            const data = await res.json()
            if (data.success) {
                refetchTaskDetails(selectedTask.id)
            }
        } catch (error) {
            console.error('Error adding comment:', error)
        }
    }

    const handleLikeComment = async (commentId: string) => {
        if (!selectedTask) return
        try {
            const res = await apiFetch(`/api/tasks/${selectedTask.id}/comments/${commentId}/like`, {
                method: 'PATCH',
                headers: { 'x-user-id': session?.user?.id || '' }
            })
            const data = await res.json()
            if (data.success) {
                // We could refetch or update locally, refetching is safer for simple demo
                refetchTaskDetails(selectedTask.id)
            }
        } catch (error) {
            console.error('Error liking comment:', error)
        }
    }

    const handleTaskClick = async (task: any) => {
        try {
            const data = await apiFetchJson<any>(`/api/tasks/${task.id}`)
            if (data.success) {
                setSelectedTask(data.data)
                setShowTaskDetails(true)
            }
        } catch (error) {
            console.error('Error fetching task details:', error)
        }
    }

    // Get members for the selected project's team
    const effectiveProjectId = selectedTask?.projectId || selectedProjectId
    const selectedProjectTeamId = projects.find(p => p.id === effectiveProjectId)?.teamId
    const teamMembers = teamsData?.find((t: any) => t.id === selectedProjectTeamId)?.members?.map((m: any) => ({
        id: m.userId,
        name: m.user.name,
        avatar: m.user.image,
        email: m.user.email,
        role: m.teamLevel
    })) || []

    const [availableLabels, setAvailableLabels] = useState<any[]>([])

    // Fetch labels
    const refetchLabels = useCallback(async () => {
        if (!workspaceSlug) return
        try {
            const data = await apiFetchJson<any>(`/api/labels?workspaceSlug=${workspaceSlug}`)
            if (data.success) {
                setAvailableLabels(data.data)
            }
        } catch (error) {
            console.error('Error fetching labels:', error)
        }
    }, [workspaceSlug])

    useEffect(() => {
        refetchLabels()
    }, [refetchLabels])

    const handleCreateNewLabel = async (name: string, color: string) => {
        if (!workspaceSlug) return undefined
        try {
            const res = await apiFetch('/api/labels', {
                method: 'POST',
                body: JSON.stringify({ workspaceSlug, name, color })
            })
            const data = await res.json()
            if (data.success) {
                await refetchLabels()
                // Return the new label object
                return data.data as { id: string; name: string; color: string }
            }
        } catch (error) {
            console.error('Error creating label:', error)
        }
    }

    return (
        <>
            {/* Header */}
            <ProjectsHeader
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onNewProject={handleNewProject}
                userRole={currentWorkspace?.userRole}
            />

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center h-64 text-gray-500">
                    Loading projects...
                </div>
            )}

            {/* Projects */}
            {!loading && filteredProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <p className="mb-4">{t('projects.noProjectsFound')}</p>
                    {currentWorkspace?.userRole && !['member', 'guest'].includes(currentWorkspace.userRole) && (
                        <button
                            onClick={handleNewProject}
                            className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors"
                        >
                            {t('projects.createFirstProject')}
                        </button>
                    )}
                </div>
            )}

            {!loading &&
                filteredProjects.map((project) => (
                    <ProjectSection
                        key={project.id}
                        project={project}
                        tasks={tasksByProject.get(project.id) || []}
                        viewMode={viewMode}
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        onTaskClick={handleTaskClick}
                        onAddTask={(date?: Date) => {
                            setSelectedProjectId(project.id)
                            if (date) {
                                setDefaultDueDate(date.toISOString())
                            } else {
                                setDefaultDueDate(undefined)
                            }
                            setShowCreateTaskPanel(true)
                        }}
                        onDayClick={(date, dayTasks) => {
                            setSelectedDayDate(date)
                            setSelectedDayTasks(dayTasks as any[])
                            setShowDayListPanel(true)
                        }}
                        onProjectClick={(projectId) => {
                            navigate({ to: `/${workspaceSlug}/projects/${projectId}` })
                        }}
                    />
                ))}

            {/* Create Project Panel */}
            <CreateProjectPanel
                isOpen={showCreatePanel}
                onClose={() => setShowCreatePanel(false)}
                onSuccess={refetchProjects}
                workspaceId={currentWorkspace?.id}
            />

            {/* Create Task Panel */}
            <CreateTaskPanel
                isOpen={showCreateTaskPanel}
                onClose={() => {
                    setShowCreateTaskPanel(false)
                    setDefaultDueDate(undefined)
                }}
                onCreate={handleCreateTask}
                defaultProject={selectedProjectId || undefined}
                defaultDueDate={defaultDueDate}
                projects={projects}
                teamMembers={teamMembers}
                workspaceSlug={workspaceSlug}
            />

            {/* Day Task List Panel */}
            <DayTaskListPanel
                date={selectedDayDate}
                tasks={selectedDayTasks}
                isOpen={showDayListPanel}
                onClose={() => setShowDayListPanel(false)}
                onTaskClick={(task) => {
                    // Close day panel and open detail panel
                    setShowDayListPanel(false)
                    handleTaskClick(task)
                }}
            />

            {/* Task Details Panel */}
            <TaskDetailsPanel
                task={selectedTask}
                isOpen={showTaskDetails}
                onClose={() => { setShowTaskDetails(false); setSelectedTask(null) }}
                subtasks={selectedTask?.subtasks}
                comments={selectedTask?.comments}
                onSubtaskToggle={handleSubtaskToggle}
                onEdit={handleSubtaskEdit}
                onDelete={handleSubtaskDelete}
                onAddSubtask={handleSubtaskAdd}
                onAddComment={handleAddComment}
                onLikeComment={handleLikeComment}
                onAssigneesChange={handleAssigneesChange}
                onLabelsChange={handleLabelsChange}
                availableLabels={availableLabels}
                onCreateLabel={handleCreateNewLabel}
                stages={projects.find(p => p.id === selectedTask?.projectId)?.stages || []}
                teamMembers={teamMembers}
                activities={selectedTask?.activities}
            />
        </>
    )
}
