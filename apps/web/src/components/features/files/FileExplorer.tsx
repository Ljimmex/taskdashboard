import { useState } from 'react'
import { FileGridItem, FolderGridItem } from './FileGrid'
import { FileList } from './FileList'
import { useFiles, useFolders } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'
import { Loader2, ChevronRight, Home, Folder as FolderIcon } from 'lucide-react'

interface FileExplorerProps {
    folderId?: string | null
    viewMode: 'grid' | 'list'
    searchQuery?: string
    fileTypeFilter?: string
    startDate?: Date | null
    endDate?: Date | null
}

interface BreadcrumbItem {
    id: string | null
    name: string
}

export function FileExplorer({
    folderId: initialFolderId,
    viewMode = 'grid',
    searchQuery = '',
    fileTypeFilter = 'all',
    startDate,
    endDate
}: FileExplorerProps) {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null)
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Files' }])

    const { data: files, isLoading: isLoadingFiles } = useFiles(workspaceSlug, currentFolderId)
    const { data: folders, isLoading: isLoadingFolders } = useFolders(workspaceSlug, currentFolderId)

    // Filter files based on search, type, and date
    const filteredFiles = files?.filter(file => {
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

    const filteredFolders = folders?.filter(folder =>
        !searchQuery || folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Actions
    const handleRename = (id: string) => console.log('Rename', id)
    const handleDelete = (id: string) => console.log('Delete', id)
    const handleMove = (id: string) => console.log('Move', id)
    const handleDownload = (id: string) => console.log('Download', id)

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
        <div className="space-y-6">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 1 && (
                <div className="flex items-center gap-1 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id || 'root'} className="flex items-center gap-1">
                            {index > 0 && <ChevronRight size={14} className="text-gray-600" />}
                            <button
                                onClick={() => handleBreadcrumbClick(index)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${index === breadcrumbs.length - 1
                                        ? 'text-white font-medium'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                {index === 0 ? (
                                    <Home size={14} />
                                ) : (
                                    <FolderIcon size={14} className="text-amber-500" />
                                )}
                                <span>{crumb.name}</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'list' ? (
                <FileList
                    files={filteredFiles}
                    folders={filteredFolders}
                    onNavigate={handleNavigate}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    onDownload={handleDownload}
                />
            ) : (
                <div className="space-y-8">
                    {/* Folders Section */}
                    {filteredFolders && filteredFolders.length > 0 && (
                        <div>
                            <h3 className="text-xs font-medium text-[#F2CE88] uppercase tracking-wider mb-4">Folders</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredFolders.map((folder: any) => (
                                    <FolderGridItem
                                        key={folder.id}
                                        folder={folder}
                                        onNavigate={handleNavigate}
                                        onRename={handleRename}
                                        onDelete={handleDelete}
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
                                {filteredFiles.map((file: any) => (
                                    <FileGridItem
                                        key={file.id}
                                        file={file}
                                        onRename={handleRename}
                                        onDelete={handleDelete}
                                        onMove={handleMove}
                                        onDownload={handleDownload}
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
    )
}
