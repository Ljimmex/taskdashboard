import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileRecord, Folder } from '@taskdashboard/types'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

async function getWorkspaceId(workspaceSlug: string): Promise<string> {
    const res = await fetch(`/api/workspaces/slug/${workspaceSlug}`)
    if (!res.ok) throw new Error('Failed to get workspace')
    const data = await res.json()
    return data.id
}

// Fetch files from API (with optional recursive fetch from all folders)
const fetchFiles = async (workspaceSlug: string, folderId: string | null, recursive = false): Promise<FileRecord[]> => {
    const workspaceId = await getWorkspaceId(workspaceSlug)
    const params = new URLSearchParams()
    params.append('workspaceId', workspaceId)

    if (recursive) {
        params.append('recursive', 'true')
    } else {
        const folderParam = folderId || 'root'
        params.append('folderId', folderParam)
    }

    const res = await fetch(`/api/files?${params}`)
    if (!res.ok) throw new Error('Failed to fetch files')
    const data = await res.json()
    return data.data || []
}

// Fetch folders from API
const fetchFolders = async (workspaceSlug: string, parentId: string | null): Promise<Folder[]> => {
    const workspaceId = await getWorkspaceId(workspaceSlug)
    const parentParam = parentId ? `&parentId=${parentId}` : '&parentId=root'
    const res = await fetch(`/api/folders?workspaceId=${workspaceId}${parentParam}`)
    if (!res.ok) throw new Error('Failed to fetch folders')
    const data = await res.json()
    return data.data || []
}

export function useFiles(workspaceSlug: string, folderId: string | null = null, recursive = false) {
    const queryClient = useQueryClient()
    const queryKey = ['files', workspaceSlug, folderId, recursive]

    const query = useQuery({
        queryKey,
        queryFn: () => fetchFiles(workspaceSlug, folderId, recursive),
        staleTime: 30000,
    })

    // Realtime subscription for file changes
    useEffect(() => {
        if (!workspaceSlug) return

        const channel = supabase
            .channel(`files-${workspaceSlug}-${folderId || 'root'}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'files'
                },
                (payload) => {
                    console.log('File change detected:', payload)
                    // Invalidate query to refetch
                    queryClient.invalidateQueries({ queryKey })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [workspaceSlug, folderId, queryClient])

    return query
}

export function useFolders(workspaceSlug: string, parentId: string | null = null) {
    const queryClient = useQueryClient()
    const queryKey = ['folders', workspaceSlug, parentId]

    const query = useQuery({
        queryKey,
        queryFn: () => fetchFolders(workspaceSlug, parentId),
        staleTime: 30000,
    })

    // Realtime subscription for folder changes  
    useEffect(() => {
        if (!workspaceSlug) return

        const channel = supabase
            .channel(`folders-${workspaceSlug}-${parentId || 'root'}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'folders'
                },
                (payload) => {
                    console.log('Folder change detected:', payload)
                    // Invalidate query to refetch
                    queryClient.invalidateQueries({ queryKey })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [workspaceSlug, parentId, queryClient])

    return query
}

export function useCreateFolder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ workspaceSlug, name, parentId }: { workspaceSlug: string, name: string, parentId: string | null }) => {
            const workspaceId = await getWorkspaceId(workspaceSlug)
            const res = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentId, workspaceId })
            })
            if (!res.ok) throw new Error('Failed to create folder')
            return res.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['folders', variables.workspaceSlug, variables.parentId] })
        }
    })
}

export function useUploadFile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            workspaceSlug,
            file,
            folderId,
            onProgress
        }: {
            workspaceSlug: string
            file: File
            folderId: string | null
            onProgress?: (progress: number) => void
        }) => {
            // 1. Get workspace ID
            const workspaceId = await getWorkspaceId(workspaceSlug)

            onProgress?.(10)

            // 2. Get presigned URL from API
            const uploadRes = await fetch('/api/files/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: file.name,
                    size: file.size,
                    mimeType: file.type || 'application/octet-stream',
                    folderId: folderId || undefined,
                    workspaceId
                })
            })

            if (!uploadRes.ok) {
                const error = await uploadRes.text()
                throw new Error(`Failed to get upload URL: ${error}`)
            }

            const { uploadUrl, file: fileRecord } = await uploadRes.json()

            onProgress?.(30)

            // 3. Upload file to R2 using presigned URL
            const finalUploadUrl = uploadUrl.startsWith('http') ? uploadUrl : `https://${uploadUrl}`
            const uploadToR2 = await fetch(finalUploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                }
            })

            if (!uploadToR2.ok) {
                throw new Error('Failed to upload file to storage')
            }

            onProgress?.(100)

            return fileRecord
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['files', variables.workspaceSlug, variables.folderId] })
            queryClient.invalidateQueries({ queryKey: ['files', variables.workspaceSlug, null] })
        }
    })
}

export function useDeleteFile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ fileId, workspaceSlug: _workspaceSlug }: { fileId: string, workspaceSlug: string }) => {
            const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete file')
            return res.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['files', variables.workspaceSlug] })
        }
    })
}

export function useRenameFile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ fileId, name, workspaceSlug: _workspaceSlug }: { fileId: string, name: string, workspaceSlug: string }) => {
            const res = await fetch(`/api/files/${fileId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
            if (!res.ok) throw new Error('Failed to rename file')
            return res.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['files', variables.workspaceSlug] })
        }
    })
}

export function useMoveFile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ fileId, folderId, workspaceSlug: _workspaceSlug }: { fileId: string, folderId: string | null, workspaceSlug: string }) => {
            const res = await fetch(`/api/files/${fileId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderId })
            })
            if (!res.ok) throw new Error('Failed to move file')
            return res.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['files', variables.workspaceSlug] })
        }
    })
}

export function useRenameFolder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ folderId, name, workspaceSlug: _workspaceSlug }: { folderId: string, name: string, workspaceSlug: string }) => {
            const res = await fetch(`/api/folders/${folderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })
            if (!res.ok) throw new Error('Failed to rename folder')
            return res.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['folders', variables.workspaceSlug] })
        }
    })
}

export function useDeleteFolder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ folderId, workspaceSlug: _workspaceSlug }: { folderId: string, workspaceSlug: string }) => {
            const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete folder')
            return res.json()
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['folders', variables.workspaceSlug] })
        }
    })
}
