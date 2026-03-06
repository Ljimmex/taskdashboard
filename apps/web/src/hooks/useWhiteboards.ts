import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WhiteboardRecord } from '@taskdashboard/types'
import { apiFetch } from '@/lib/api'

const API_BASE = '/api/whiteboards'

export const useWhiteboards = (workspaceId?: string) => {
    return useQuery({
        queryKey: ['whiteboards', workspaceId],
        queryFn: async () => {
            if (!workspaceId) return []
            const res = await apiFetch(`${API_BASE}?workspaceId=${workspaceId}`)
            const text = await res.text()
            if (!text) throw new Error('Empty response from server')
            const json = JSON.parse(text)
            if (!json.success) throw new Error(json.error)
            return json.data as WhiteboardRecord[]
        },
        enabled: !!workspaceId,
    })
}

export const useWhiteboard = (id?: string) => {
    return useQuery({
        queryKey: ['whiteboard', id],
        queryFn: async () => {
            if (!id) return null
            const res = await apiFetch(`${API_BASE}/${id}`)
            const text = await res.text()
            if (!text) throw new Error('Empty response from server')
            const json = JSON.parse(text)
            if (!json.success) throw new Error(json.error)
            return json.data as WhiteboardRecord
        },
        enabled: !!id,
    })
}

export function useCreateBoard() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: { name: string; workspaceId: string; data?: any }) => {
            const res = await apiFetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const text = await res.text()
            if (!text) throw new Error('Empty response from server')
            const json = JSON.parse(text)
            if (!json.success) throw new Error(json.error)
            return json.data as WhiteboardRecord
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['whiteboards', data.workspaceId], (old: WhiteboardRecord[] | undefined) => {
                return old ? [data, ...old] : [data]
            })
            queryClient.invalidateQueries({ queryKey: ['whiteboards', data.workspaceId] })
        },
    })
}

export function useUpdateBoard() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<WhiteboardRecord> & { id: string }) => {
            const res = await apiFetch(`${API_BASE}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const text = await res.text()
            if (!text) throw new Error('Empty response from server')
            const json = JSON.parse(text)
            if (!json.success) throw new Error(json.error)
            return json.data as WhiteboardRecord
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['whiteboard', data.id] })
            queryClient.invalidateQueries({ queryKey: ['whiteboards', data.workspaceId] })
        },
    })
}

export function useDeleteBoard() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`${API_BASE}/${id}`, { method: 'DELETE' })
            const text = await res.text()
            if (!text) throw new Error('Empty response from server')
            const json = JSON.parse(text)
            if (!json.success) throw new Error(json.error)
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whiteboards'] })
        },
    })
}
