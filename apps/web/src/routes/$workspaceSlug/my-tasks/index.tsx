import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { List } from 'lucide-react'
import { useSession } from '@/lib/auth'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { TaskListView } from '@/components/features/tasks/views/TaskListView'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'

export const Route = createFileRoute('/$workspaceSlug/my-tasks/')({
    component: MyTasksPage,
})

function MyTasksPage() {
    const { t } = useTranslation()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const navigate = useNavigate()
    const { data: session } = useSession()
    const queryClient = useQueryClient()

    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
    const [selectedTasks, setSelectedTasks] = useState<string[]>([])

    // Fetch tasks
    const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['workspace-tasks', workspaceSlug],
        queryFn: () => apiFetchJson<any>(`/api/tasks?workspaceSlug=${workspaceSlug}`),
        enabled: !!workspaceSlug && !!session?.user?.id
    })

    // Fetch projects to map project names and stages (statuses)
    const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
        queryKey: ['workspace-projects', workspaceSlug],
        queryFn: () => apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`),
        enabled: !!workspaceSlug
    })

    const allTasks = tasksData?.data || []
    const allProjects = projectsData?.data || []

    const assignedTasks = useMemo(() => {
        if (!session?.user?.id) return []
        return allTasks.filter((task: any) => {
            const isAssigned =
                task.assignees?.some((a: any) => a === session.user.id || a.id === session.user.id) ||
                task.assigneeDetails?.some((a: any) => a.id === session.user.id)
            return isAssigned
        })
    }, [allTasks, session?.user?.id])

    const allStages = useMemo(() => {
        const stages: any[] = []
        allProjects.forEach((p: any) => {
            if (p.stages) {
                stages.push(...p.stages)
            }
        })
        return stages
    }, [allProjects])

    const listViewTasks = useMemo(() => {
        return assignedTasks.map((t: any) => {
            const proj = allProjects.find((p: any) => p.id === t.projectId)
            return {
                id: t.id,
                title: t.title,
                description: t.description || '',
                priority: (t.priority || 'medium') as 'urgent' | 'high' | 'medium' | 'low',
                assigneeDetails: (t.assigneeDetails || (Array.isArray(t.assignees) && typeof t.assignees[0] === 'object' ? t.assignees : [])) as any[],
                status: t.status,
                dueDate: t.dueDate || undefined,
                startDate: t.startDate,
                endDate: t.endDate,
                subtaskCount: t.subtasksCount || 0,
                subtaskCompleted: t.subtasksCompleted || 0,
                commentCount: t.commentsCount || 0,
                attachmentCount: t.attachmentCount || 0,
                labels: t.labels || [],
                type: 'task' as const,
                dependsOn: t.dependsOn || [],
                isCompleted: t.isCompleted || false,
                projectName: proj?.name || 'Unknown Project'
            }
        })
    }, [assignedTasks, allProjects])

    const loading = isLoadingTasks || isLoadingProjects

    const handleTaskSelect = (taskId: string, selected: boolean) => {
        setSelectedTasks(prev =>
            selected ? [...prev, taskId] : prev.filter(id => id !== taskId)
        )
    }

    const handleSelectAll = (selected: boolean) => {
        setSelectedTasks(selected ? listViewTasks.map((t: any) => t.id) : [])
    }

    const handleDeleteTask = async () => {
        if (!deleteTaskId) return
        try {
            await apiFetch(`/api/tasks/${deleteTaskId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': session?.user?.id || '' }
            })
            queryClient.invalidateQueries({ queryKey: ['workspace-tasks', workspaceSlug] })
        } catch (error) {
            console.error('Failed to delete task', error)
        }
        setDeleteTaskId(null)
        setSelectedTasks(prev => prev.filter(id => id !== deleteTaskId))
    }

    if (loading) {
        return (
            <div className="flex-1 p-8 bg-[#0a0a0f] text-white flex items-center justify-center">
                <div className="text-gray-500">{t('common.loading')}</div>
            </div>
        )
    }

    return (
        <div className="flex-1 p-8 bg-[#0a0a0f] text-white flex flex-col h-full overflow-hidden">
            <header className="flex flex-col gap-4 mb-6 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('dashboard.myTasks')}</h1>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-auto -mx-8 px-8">
                {listViewTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 mt-12 bg-[#12121a] rounded-2xl border border-gray-800/50 p-8">
                        <List className="w-12 h-12 mb-4 opacity-50 text-gray-400" />
                        <p className="text-lg font-medium text-gray-300">{t('dashboard.myTasks')}</p>
                        <p className="text-sm">{t('dashboard.noFiles') || 'No tasks assigned to you.'}</p>
                    </div>
                ) : (
                    <TaskListView
                        tasks={listViewTasks}
                        columns={allStages.map((s: any) => ({
                            id: s.id,
                            title: s.name,
                            color: s.color || '#6c6c6c'
                        }))}
                        onTaskClick={(id) => navigate({ to: `/${workspaceSlug}/projects/${listViewTasks.find((t: any) => t.id === id)?.projectId}?taskId=${id}` })}
                        selectedTasks={selectedTasks}
                        onTaskSelect={handleTaskSelect}
                        onSelectAll={handleSelectAll}
                        onTaskEdit={(id) => navigate({ to: `/${workspaceSlug}/projects/${listViewTasks.find((t: any) => t.id === id)?.projectId}?taskId=${id}` })}
                        onTaskDelete={(id) => setDeleteTaskId(id)}
                        userId={session?.user?.id}
                    />
                )}
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={!!deleteTaskId}
                onClose={() => setDeleteTaskId(null)}
                onConfirm={handleDeleteTask}
                title={t('common.delete')}
                message={t('tasks.details.delete')}
            />
        </div>
    )
}
