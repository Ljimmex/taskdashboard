import { useMutation, useQueryClient } from '@tanstack/react-query'

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
            const res = await fetch(`/api/tasks/${taskId}/links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, title, description })
            })
            const json = await res.json()
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
            const res = await fetch(`/api/tasks/${taskId}/links/${linkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            const json = await res.json()
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
            const res = await fetch(`/api/tasks/${taskId}/links/${linkId}`, {
                method: 'DELETE'
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json
        },
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })
}
