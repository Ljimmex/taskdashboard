import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import type { Task } from '@taskdashboard/types'

export function useProjectTasks(projectId?: string) {
  return useQuery<Task[]>({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const response = await apiFetchJson<{ success: boolean; data: Task[] }>(
        `/api/tasks?projectId=${projectId}`
      )
      return response.data || []
    },
    enabled: !!projectId,
  })
}
