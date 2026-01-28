import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileRecord } from '@taskdashboard/types'


export interface TaskFile extends FileRecord {
    uploader?: {
        id: string
        name: string | null
        image: string | null
    }
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export const useTaskFiles = (taskId?: string) => {
    return useQuery({
        queryKey: ['task-files', taskId],
        queryFn: async () => {
            if (!taskId) return []
            const res = await fetch(`/api/tasks/${taskId}/files`)
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json.data as TaskFile[]
        },
        enabled: !!taskId
    })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export const useAttachFile = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, fileId }: { taskId: string; fileId: string }) => {
            const res = await fetch(`/api/tasks/${taskId}/files/${fileId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json.data
        },
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task-files', taskId] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })
}

export const useUploadTaskFile = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch(`/api/tasks/${taskId}/upload`, {
                method: 'POST',
                body: formData
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json.data as TaskFile
        },
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task-files', taskId] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
            queryClient.invalidateQueries({ queryKey: ['files'] }) // Update files list
        }
    })
}

export const useRemoveFileFromTask = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, fileId }: { taskId: string; fileId: string }) => {
            const res = await fetch(`/api/tasks/${taskId}/files/${fileId}`, {
                method: 'DELETE'
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json
        },
        onSuccess: (_, { taskId }) => {
            queryClient.invalidateQueries({ queryKey: ['task-files', taskId] })
            queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
    })
}
