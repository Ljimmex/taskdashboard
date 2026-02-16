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
