import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { Task } from '@taskdashboard/types'

export function useTasks(workspaceSlug?: string) {
    return useQuery({
        queryKey: ['tasks', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return []
            const response = await apiFetchJson<{ success: boolean; data: Task[] }>(
                `/api/tasks?workspaceSlug=${workspaceSlug}`
            )
            return response.data || []
        },
        enabled: !!workspaceSlug,
    })
}

export function isTaskBlocked(task: Task, allTasks: Task[]): boolean {
    if (!task.dependsOn || task.dependsOn.length === 0) return false

    // Find all dependent tasks
    const dependencies = allTasks.filter(t => task.dependsOn?.includes(t.id))

    // Task is blocked if ANY dependency is NOT completed
    return dependencies.some(dep => !dep.isCompleted)
}
