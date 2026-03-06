import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DocumentRecord } from '@taskdashboard/types'

const API_BASE = '/api/docs'

export const useDocuments = (workspaceId?: string) => {
    return useQuery({
        queryKey: ['documents', workspaceId],
        queryFn: async () => {
            if (!workspaceId) return []
            const res = await fetch(`${API_BASE}?workspaceId=${workspaceId}`)
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json.data as DocumentRecord[]
        },
        enabled: !!workspaceId,
    })
}

export const useDocument = (id?: string) => {
    return useQuery({
        queryKey: ['document', id],
        queryFn: async () => {
            if (!id) return null
            const res = await fetch(`${API_BASE}/${id}`)
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json.data as DocumentRecord
        },
        enabled: !!id,
    })
}

export const useCreateDocument = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: { title: string; workspaceId: string; content?: any; projectId?: string; folderId?: string }) => {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json.data as DocumentRecord
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['documents', data.workspaceId], (old: DocumentRecord[] | undefined) => {
                return old ? [data, ...old] : [data]
            })
            queryClient.invalidateQueries({ queryKey: ['documents', data.workspaceId] })
        },
    })
}

export const useUpdateDocument = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<DocumentRecord> & { id: string }) => {
            const res = await fetch(`${API_BASE}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return json.data as DocumentRecord
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['document', data.id] })
            queryClient.invalidateQueries({ queryKey: ['documents', data.workspaceId] })
        },
    })
}

export const useDeleteDocument = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] })
        },
    })
}
