import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'

export interface TaskLink {
    id: string
    url: string
    title?: string
    description?: string
    addedBy: string
    addedAt: string
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export const useAddTaskLink = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            taskId,
            url,
            title,
            description
        }: {
            taskId: string
            url: string
            title?: string
            description?: string
        }) => {
            const json = await apiFetchJson<any>(`/api/tasks/${taskId}/links`, {
                method: 'POST',
                body: JSON.stringify({ url, title, description })
            })
            if (!json.success) throw new Error(json.error)
            return json.data as TaskLink
        },
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })
}

export const useUpdateTaskLink = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            taskId,
            linkId,
            data
        }: {
            taskId: string
            linkId: string
            data: Partial<Pick<TaskLink, 'url' | 'title' | 'description'>>
        }) => {
            const json = await apiFetchJson<any>(`/api/tasks/${taskId}/links/${linkId}`, {
                method: 'PATCH',
                body: JSON.stringify(data)
            })
            if (!json.success) throw new Error(json.error)
            return json.data as TaskLink
        },
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })
}

export const useDeleteTaskLink = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, linkId }: { taskId: string; linkId: string }) => {
            const json = await apiFetchJson<any>(`/api/tasks/${taskId}/links/${linkId}`, {
                method: 'DELETE'
            })
            if (!json.success) throw new Error(json.error)
            return json
        },
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })
}
