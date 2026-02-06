import React, { useState } from 'react'
import { FileGridItem, FolderGridItem } from './FileGrid'
import { FileList } from './FileList'
import { FileInfoPanel } from './FileInfoPanel'
import { RenameModal } from './RenameModal'
import { CreateFolderModal } from './CreateFolderModal'
import { MoveToFolderModal } from './MoveToFolderModal'
import { useFiles, useFolders, useDeleteFile, useDeleteFolder, useMoveFile } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'
import { Loader2, FolderPlus } from 'lucide-react'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { FileRecord, Folder } from '@taskdashboard/types'

import { FolderBreadcrumb, BreadcrumbItem } from './FolderBreadcrumb'

interface FileExplorerProps {
    folderId?: string | null
    viewMode: 'grid' | 'list'
    searchQuery?: string
    fileTypeFilter?: string
    startDate?: Date | null
    endDate?: Date | null
    sortBy: 'name' | 'size' | 'date' | 'type'
    sortOrder: 'asc' | 'desc'
    onSort: (field: 'name' | 'size' | 'date' | 'type') => void
    userRole?: string | null
    highlightFileId?: string
}

export function FileExplorer({
    folderId: initialFolderId,
    viewMode = 'grid',
    searchQuery = '',
    fileTypeFilter = 'all',
    startDate,
    endDate,
    sortBy,
    sortOrder,
    onSort,
    userRole,
    highlightFileId
}: FileExplorerProps) {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null)
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Files' }])

    // Modal states
    const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
    const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false)
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
    const [renameItem, setRenameItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null)
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
    const [moveFileItem, setMoveFileItem] = useState<{ id: string; name: string } | null>(null)

    const { data: files, isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(workspaceSlug, currentFolderId)
    const { data: folders, isLoading: isLoadingFolders, refetch: refetchFolders } = useFolders(workspaceSlug, currentFolderId)
    const deleteFile = useDeleteFile()
    const deleteFolder = useDeleteFolder()
    const moveFile = useMoveFile()

    // Auto-open highlighted file
    React.useEffect(() => {
        if (highlightFileId && files) {
            const file = files.find(f => f.id === highlightFileId)
            if (file) {
                // If found in current folder/view
                setSelectedFile(file)
                setIsInfoPanelOpen(true)
            } else {
                // If not found in current folder, we might need to search recursively or just show info if we can fetch it individually.
                // For now, simple implementation assuming it's visible or flat list.
                // NOTE: Since useFiles is currentFolderId scoped, checking "files" only checks current folder.
                // If LastResources links to a file in a subfolder, this won't find it unless we are in that folder.
                // Ideally we'd fetch the specific file or know its folder.
                // But let's start with simple interaction.
            }
        }
    }, [highlightFileId, files])

    // Handle drag-drop file to folder
    const handleFileDrop = async (fileId: string, folderId: string | null) => {
        if (userRole === 'member') return
        try {
            await moveFile.mutateAsync({
                fileId,
                folderId,
                workspaceSlug
            })
            refetchFiles()
        } catch (error) {
            console.error('Failed to move file:', error)
        }
    }

    const sortItems = <T extends { name: string, createdAt: Date | string, size?: number | null, mimeType?: string | null }>(items: T[]): T[] => {
        return [...items].sort((a, b) => {
            let comparison = 0
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name)
                    break
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0)
                    break
                case 'date':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
                case 'type':
                    comparison = (a.mimeType || '').localeCompare(b.mimeType || '')
                    break
            }
            return sortOrder === 'asc' ? comparison : -comparison
        })
    }

    // Filter files based on search, type, and date
    const filteredFiles = React.useMemo(() => {
        if (!files) return []
        const filtered = files.filter(file => {
            const matchesSearch = !searchQuery || file.name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesType = fileTypeFilter === 'all' ||
                (fileTypeFilter === 'image' && file.mimeType?.startsWith('image/')) ||
                (fileTypeFilter === 'document' && (file.mimeType?.includes('document') || file.mimeType?.includes('word'))) ||
                (fileTypeFilter === 'pdf' && file.mimeType?.includes('pdf')) ||
                (fileTypeFilter === 'spreadsheet' && (file.mimeType?.includes('spreadsheet') || file.mimeType?.includes('excel'))) ||
                (fileTypeFilter === 'video' && file.mimeType?.startsWith('video/')) ||
                (fileTypeFilter === 'audio' && file.mimeType?.startsWith('audio/'))

            let matchesDate = true
            if (startDate || endDate) {
                const fileDate = new Date(file.createdAt)
                if (startDate && fileDate < startDate) matchesDate = false
                if (endDate && fileDate > endDate) matchesDate = false
            }

            return matchesSearch && matchesType && matchesDate
        })
        return sortItems(filtered)
    }, [files, searchQuery, fileTypeFilter, startDate, endDate, sortBy, sortOrder])

    const filteredFolders = React.useMemo(() => {
        if (!folders) return []
        const filtered = folders.filter(folder =>
            !searchQuery || folder.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        return sortItems(filtered)
    }, [folders, searchQuery, sortBy, sortOrder])

    // Actions
    const handleRename = (id: string) => {
        const file = files?.find(f => f.id === id)
        const folder = folders?.find(f => f.id === id)
        if (file) {
            setRenameItem({ id, name: file.name, type: 'file' })
        } else if (folder) {
            setRenameItem({ id, name: folder.name, type: 'folder' })
        }
        setIsRenameModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        const file = files?.find(f => f.id === id)
        const folder = folders?.find(f => f.id === id)

        if (file) {
            if (confirm(`Delete "${file.name}"?`)) {
                await deleteFile.mutateAsync({ fileId: id, workspaceSlug })
                refetchFiles()
            }
        } else if (folder) {
            if (confirm(`Delete folder "${folder.name}" and all its contents?`)) {
                await deleteFolder.mutateAsync({ folderId: id, workspaceSlug })
                refetchFolders()
            }
        }
    }

    const handleMove = (id: string) => {
        const file = files?.find(f => f.id === id)
        if (file) {
            setMoveFileItem({ id, name: file.name })
            setIsMoveModalOpen(true)
        }
    }

    const handleDownload = async (id: string) => {
        try {
            const json = await apiFetchJson<any>(`/api/files/${id}/download`)
            const { downloadUrl } = json
            window.open(downloadUrl, '_blank')
        } catch (error) {
            console.error('Download failed:', error)
        }
    }

    const handleArchive = async (id: string) => {
        try {
            const res = await apiFetch(`/api/files/${id}/archive`, { method: 'PATCH' })
            if (!res.ok) throw new Error('Failed to archive file')
            refetchFiles()
        } catch (error) {
            console.error('Archive failed:', error)
        }
    }

    const handleDuplicate = async (id: string) => {
        try {
            const res = await apiFetch(`/api/files/${id}/duplicate`, { method: 'POST' })
            if (!res.ok) {
                const errorData = await res.json()
                if (res.status === 501) {
                    alert('Duplicate is not yet implemented on the server')
                    return
                }
                throw new Error(errorData.error || 'Failed to duplicate file')
            }
            refetchFiles()
        } catch (error) {
            console.error('Duplicate failed:', error)
        }
    }

    const handleInfo = (id: string) => {
        const file = files?.find(f => f.id === id)
        if (file) {
            setSelectedFile(file)
            setIsInfoPanelOpen(true)
        }
    }

    const handleNavigate = (folderId: string) => {
        const folder = folders?.find(f => f.id === folderId)
        if (folder) {
            setBreadcrumbs(prev => [...prev, { id: folderId, name: folder.name }])
        }
        setCurrentFolderId(folderId)
    }

    const handleBreadcrumbClick = (index: number) => {
        const item = breadcrumbs[index]
        setCurrentFolderId(item.id)
        setBreadcrumbs(breadcrumbs.slice(0, index + 1))
    }

    if (isLoadingFiles || isLoadingFolders) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6">
                {/* Breadcrumbs + Create Folder */}
                <div className="flex items-center justify-between">
                    <FolderBreadcrumb
                        breadcrumbs={breadcrumbs}
                        onNavigate={handleBreadcrumbClick}
                        onFileDrop={handleFileDrop}
                        userRole={userRole}
                    />
                    {userRole !== 'member' && (
                        <button
                            onClick={() => setIsCreateFolderOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-[#1a1a24] hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <FolderPlus size={16} />
                            New Folder
                        </button>
                    )}
                </div>

                {viewMode === 'list' ? (
                    <FileList
                        files={filteredFiles}
                        folders={filteredFolders}
                        onNavigate={handleNavigate}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onMove={handleMove}
                        onDownload={handleDownload}
                        onInfo={handleInfo}
                        onArchive={handleArchive}
                        onDuplicate={handleDuplicate}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={onSort}
                        userRole={userRole}
                    />
                ) : (
                    <div className="space-y-8">
                        {/* Folders Section */}
                        {filteredFolders && filteredFolders.length > 0 && (
                            <div>
                                <h3 className="text-xs font-medium text-[#F2CE88] uppercase tracking-wider mb-4">Folders</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {filteredFolders.map((folder: Folder) => (
                                        <FolderGridItem
                                            key={folder.id}
                                            folder={folder}
                                            onNavigate={handleNavigate}
                                            onRename={handleRename}
                                            onDelete={handleDelete}
                                            onFileDrop={handleFileDrop}
                                            userRole={userRole}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files Section */}
                        {filteredFiles && filteredFiles.length > 0 && (
                            <div>
                                <h3 className="text-xs font-medium text-[#F2CE88] uppercase tracking-wider mb-4">Files</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {filteredFiles.map((file: FileRecord) => (
                                        <FileGridItem
                                            key={file.id}
                                            file={file}
                                            onClick={handleInfo}
                                            onRename={handleRename}
                                            onDelete={handleDelete}
                                            onMove={handleMove}
                                            onDownload={handleDownload}
                                            onInfo={handleInfo}
                                            onArchive={handleArchive}
                                            onDuplicate={handleDuplicate}
                                            userRole={userRole}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {(!filteredFiles?.length && !filteredFolders?.length) && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-full bg-[#1a1a24] flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">No files yet</h3>
                                <p className="text-sm text-gray-500">
                                    Drag and drop files to upload
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <FileInfoPanel
                file={selectedFile}
                isOpen={isInfoPanelOpen}
                onClose={() => {
                    setIsInfoPanelOpen(false)
                    setSelectedFile(null)
                }}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRename}
            />

            <RenameModal
                isOpen={isRenameModalOpen}
                onClose={() => {
                    setIsRenameModalOpen(false)
                    setRenameItem(null)
                }}
                itemId={renameItem?.id || null}
                itemName={renameItem?.name || ''}
                itemType={renameItem?.type || 'file'}
                onSuccess={() => {
                    refetchFiles()
                    refetchFolders()
                }}
            />

            <CreateFolderModal
                isOpen={isCreateFolderOpen}
                onClose={() => setIsCreateFolderOpen(false)}
                parentId={currentFolderId}
                onSuccess={() => refetchFolders()}
            />

            <MoveToFolderModal
                isOpen={isMoveModalOpen}
                onClose={() => {
                    setIsMoveModalOpen(false)
                    setMoveFileItem(null)
                }}
                fileId={moveFileItem?.id || null}
                fileName={moveFileItem?.name || ''}
                currentFolderId={currentFolderId}
                onSuccess={() => refetchFiles()}
            />
        </>
    )
}
