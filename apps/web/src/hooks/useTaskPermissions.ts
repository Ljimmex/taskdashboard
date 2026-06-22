import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'

export interface TaskPermissions {
  tasks: {
    create: boolean
    update: boolean
    delete: boolean
    assign: boolean
    complete: boolean
  }
  stages: {
    create: boolean
    update: boolean
    delete: boolean
    reorder: boolean
  }
}

export function useTaskPermissions(projectId: string | undefined) {
  return useQuery<TaskPermissions | null>({
    queryKey: ['taskPermissions', projectId],
    queryFn: async () => {
      if (!projectId) return null
      const res = await apiFetchJson<{ success: boolean; data: TaskPermissions }>(
        `/api/tasks/permissions?projectId=${projectId}`
      )
      return res.success ? res.data : null
    },
    enabled: !!projectId,
  })
}
