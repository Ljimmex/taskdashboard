import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'

export interface TimeEntry {
  id: string
  taskId?: string | null
  subtaskId?: string | null
  userId: string
  workspaceId?: string
  description?: string
  durationMinutes: number
  startedAt: string
  endedAt?: string | null
  entryType: 'task' | 'meeting'
  projectRole: string
  difficultyLevel: 'basic' | 'standard' | 'advanced' | 'critical'
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedBy?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
  bonusPoints?: number
  isPaused: boolean
  pausedAt?: string | null
  totalPausedMinutes: number
  rawDurationMinutes?: number
  points?: number
  taskTitle?: string
  subtaskTitle?: string | null
}

interface UseTimeEntriesOptions {
  activeOnly?: boolean
}

export function useTimeEntries(workspaceSlug?: string, opts: UseTimeEntriesOptions = {}) {
  const { activeOnly } = opts

  return useQuery<TimeEntry[]>({
    queryKey: ['time-entries', workspaceSlug, activeOnly],
    queryFn: async () => {
      if (!workspaceSlug) return []
      const params = new URLSearchParams({ workspaceSlug })
      const response = await apiFetchJson<{
        success: boolean
        data: TimeEntry[]
        totalMinutes: number
      }>(`/api/time?${params}`)
      let data = response.data || []
      if (activeOnly) {
        data = data.filter((entry) => !entry.endedAt)
      }
      return data
    },
    enabled: !!workspaceSlug,
    refetchInterval: activeOnly ? 10000 : false,
  })
}

export function useStartTimer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      workspaceSlug,
      description,
    }: {
      taskId?: string | null
      workspaceSlug: string
      description?: string
    }) => {
      const response = await apiFetchJson<{ success: boolean; data: TimeEntry }>(
        '/api/time/start',
        {
          method: 'POST',
          body: JSON.stringify({
            taskId: taskId || null,
            workspaceSlug,
            description,
            entryType: 'task',
          }),
        }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.workspaceSlug] })
    },
  })
}

export function useStopTimer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { entryId: string; workspaceSlug: string }) => {
      const response = await apiFetchJson<{ success: boolean; data: TimeEntry }>(
        `/api/time/${variables.entryId}/stop`,
        { method: 'PATCH' }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.workspaceSlug] })
    },
  })
}

export function usePauseTimer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { entryId: string; workspaceSlug: string }) => {
      const response = await apiFetchJson<{ success: boolean; data: TimeEntry }>(
        `/api/time/${variables.entryId}/pause`,
        { method: 'PATCH' }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.workspaceSlug] })
    },
  })
}

export function useResumeTimer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { entryId: string; workspaceSlug: string }) => {
      const response = await apiFetchJson<{ success: boolean; data: TimeEntry }>(
        `/api/time/${variables.entryId}/resume`,
        { method: 'PATCH' }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.workspaceSlug] })
    },
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { taskId: string; workspaceSlug: string }) => {
      const response = await apiFetchJson<{ success: boolean; data: any }>(
        `/api/tasks/${variables.taskId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isCompleted: true, status: 'done' }),
        }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceSlug] })
    },
  })
}
