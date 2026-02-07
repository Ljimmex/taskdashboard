import { createFileRoute } from '@tanstack/react-router'
import { FileExplorer } from '@/components/features/files/FileExplorer'
import { FilesHeader } from '@/components/features/files/FilesHeader'
import { FileUploadPanel } from '@/components/features/files/FileUploadPanel'
import { useState, useCallback, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'

export interface FilesSearch {
    fileId?: string
}

export const Route = createFileRoute('/$workspaceSlug/files/')({
    component: FilesPage,
    validateSearch: (search: Record<string, unknown>): FilesSearch => {
        return {
            fileId: search.fileId as string | undefined,
        }
    },
})

function FilesPage() {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug/files/' })
    const search = Route.useSearch()
    const { data: session } = useSession()

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    // Fetch Workspace Details for role
    const { data: workspaceData } = useQuery({
        queryKey: ['workspace', workspaceSlug, session?.user?.id],
        queryFn: async () => {
            if (!workspaceSlug) return null
            const json = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json
        },
        enabled: !!workspaceSlug && !!session?.user?.id
    })

    const userRole = workspaceData?.userRole

    const [fileTypeFilter, setFileTypeFilter] = useState<string>('all')
    const [startDate, setStartDate] = useState<Date | null>(null)
    const [endDate, setEndDate] = useState<Date | null>(null)

    const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Upload panel state
    const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false)
    const [droppedFiles, setDroppedFiles] = useState<File[]>([])
    const [isDraggingOver, setIsDraggingOver] = useState(false)

    const handleDateRangeChange = (start: Date | null, end: Date | null) => {
        setStartDate(start)
        setEndDate(end)
    }

    const handleSortChange = (field: 'name' | 'size' | 'date' | 'type') => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(field)
            setSortOrder('desc')
        }
    }

    const handleOpenUploadPanel = () => {
        setDroppedFiles([])
        setIsUploadPanelOpen(true)
    }

    const handleCloseUploadPanel = () => {
        setIsUploadPanelOpen(false)
        setDroppedFiles([])
    }

    // Global drag-and-drop handlers for the page
    const handlePageDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.types.includes('Files')) {
            setIsDraggingOver(true)
        }
    }, [])

    const handlePageDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.currentTarget === e.target) {
            setIsDraggingOver(false)
        }
    }, [])

    const handlePageDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingOver(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            setDroppedFiles(files)
            setIsUploadPanelOpen(true)
        }
    }, [])

    // Listen for dragenter on window
    useEffect(() => {
        const handleWindowDragEnter = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('Files')) {
                setIsDraggingOver(true)
            }
        }

        const handleWindowDragLeave = (e: DragEvent) => {
            if (e.relatedTarget === null) {
                setIsDraggingOver(false)
            }
        }

        window.addEventListener('dragenter', handleWindowDragEnter)
        window.addEventListener('dragleave', handleWindowDragLeave)

        return () => {
            window.removeEventListener('dragenter', handleWindowDragEnter)
            window.removeEventListener('dragleave', handleWindowDragLeave)
        }
    }, [])

    return (
        <div
            className="flex flex-col h-full relative"
            onDragOver={handlePageDragOver}
            onDragLeave={handlePageDragLeave}
            onDrop={handlePageDrop}
        >
            {/* Global Drop Overlay */}
            {isDraggingOver && !isUploadPanelOpen && (
                <div className="absolute inset-0 z-30 bg-amber-500/5 border-2 border-dashed border-amber-500 rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-amber-500">Drop files to upload</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <FilesHeader
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                fileTypeFilter={fileTypeFilter}
                onFileTypeFilterChange={setFileTypeFilter}
                startDate={startDate}
                endDate={endDate}
                onDateRangeChange={handleDateRangeChange}
                onUploadClick={handleOpenUploadPanel}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
            />

            {/* Content */}
            <div className="flex-1 overflow-auto px-6 py-2">
                <FileExplorer
                    viewMode={viewMode}
                    fileTypeFilter={fileTypeFilter}
                    startDate={startDate}
                    endDate={endDate}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSortChange}
                    userRole={userRole}
                    highlightFileId={search.fileId}
                />
            </div>

            {/* Upload Panel */}
            <FileUploadPanel
                isOpen={isUploadPanelOpen}
                onClose={handleCloseUploadPanel}
                initialFiles={droppedFiles}
                onUploadComplete={() => {
                    console.log('Upload complete')
                }}
            />
        </div>
    )
}
