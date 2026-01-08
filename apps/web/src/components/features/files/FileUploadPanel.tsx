import { createPortal } from 'react-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePanelStore } from '../../../lib/panelStore'
import { ChevronDoubleRightIcon } from '../tasks/components/TaskIcons'
import { Upload, Trash2 } from 'lucide-react'
import { useParams } from '@tanstack/react-router'
import { useUploadFile } from '@/hooks/useFiles'

interface FileUploadPanelProps {
    isOpen: boolean
    onClose: () => void
    folderId?: string | null
    initialFiles?: File[]
    onUploadComplete?: () => void
}

interface QueuedFile {
    id: string
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'done' | 'error'
    error?: string
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

export function FileUploadPanel({ isOpen, onClose, folderId, initialFiles, onUploadComplete }: FileUploadPanelProps) {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
    const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
    const panelRef = useRef<HTMLDivElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)
    const uploadMutation = useUploadFile()

    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    // Sync global panel state (this disables the timer)
    useEffect(() => {
        setIsPanelOpen(isOpen)
        return () => setIsPanelOpen(false)
    }, [isOpen, setIsPanelOpen])

    // Handle initial files (from external drag)
    useEffect(() => {
        if (initialFiles && initialFiles.length > 0) {
            const newFiles: QueuedFile[] = initialFiles.map(file => ({
                id: crypto.randomUUID(),
                file,
                progress: 0,
                status: 'pending'
            }))
            setQueuedFiles(prev => [...prev, ...newFiles])
        }
    }, [initialFiles])

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isUploading) onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose, isUploading])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            const newFiles: QueuedFile[] = files.map(file => ({
                id: crypto.randomUUID(),
                file,
                progress: 0,
                status: 'pending'
            }))
            setQueuedFiles(prev => [...prev, ...newFiles])
        }
    }, [])

    const handleBrowseClick = () => {
        document.getElementById('upload-panel-file-input')?.click()
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : []
        if (files.length > 0) {
            const newFiles: QueuedFile[] = files.map(file => ({
                id: crypto.randomUUID(),
                file,
                progress: 0,
                status: 'pending'
            }))
            setQueuedFiles(prev => [...prev, ...newFiles])
        }
        e.target.value = ''
    }

    const removeFile = (id: string) => {
        setQueuedFiles(prev => prev.filter(f => f.id !== id))
    }

    const handleUpload = async () => {
        if (queuedFiles.length === 0 || !workspaceSlug) return

        setIsUploading(true)

        for (const qFile of queuedFiles) {
            // Skip already processed
            if (qFile.status === 'done' || qFile.status === 'error') continue

            // Mark as uploading
            setQueuedFiles(prev => prev.map(f =>
                f.id === qFile.id ? { ...f, status: 'uploading', progress: 0 } : f
            ))

            try {
                await uploadMutation.mutateAsync({
                    workspaceSlug,
                    file: qFile.file,
                    folderId: folderId || null,
                    onProgress: (progress) => {
                        setQueuedFiles(prev => prev.map(f =>
                            f.id === qFile.id ? { ...f, progress } : f
                        ))
                    }
                })

                // Mark as done
                setQueuedFiles(prev => prev.map(f =>
                    f.id === qFile.id ? { ...f, status: 'done', progress: 100 } : f
                ))
            } catch (error: any) {
                console.error('Upload failed:', error)
                setQueuedFiles(prev => prev.map(f =>
                    f.id === qFile.id ? { ...f, status: 'error', error: error.message } : f
                ))
            }
        }

        setIsUploading(false)

        // Check if all succeeded
        const allDone = queuedFiles.every(f => f.status === 'done')
        if (allDone) {
            setTimeout(() => {
                setQueuedFiles([])
                onUploadComplete?.()
                onClose()
            }, 500)
        }
    }

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return '🖼️'
        if (file.type.includes('pdf')) return '📄'
        if (file.type.includes('spreadsheet') || file.type.includes('excel')) return '📊'
        if (file.type.includes('document') || file.type.includes('word')) return '📝'
        if (file.type.startsWith('video/')) return '🎬'
        if (file.type.startsWith('audio/')) return '🎵'
        return '📁'
    }

    const pendingCount = queuedFiles.filter(f => f.status === 'pending' || f.status === 'uploading').length

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => !isUploading && onClose()}
            />

            {/* Panel - Side panel style like other panels */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => !isUploading && onClose()}
                            disabled={isUploading}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            <ChevronDoubleRightIcon />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Upload Files</h2>
                            <p className="text-xs text-gray-500">Add files to your workspace</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {/* Drop Zone */}
                    <div
                        ref={dropZoneRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleBrowseClick}
                        className={`
                            relative flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed cursor-pointer transition-all mb-6
                            ${isDragOver
                                ? 'border-amber-500 bg-amber-500/10'
                                : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                            }
                        `}
                    >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragOver ? 'bg-amber-500/20' : 'bg-gray-800'}`}>
                            <Upload className={`w-6 h-6 transition-colors ${isDragOver ? 'text-amber-500' : 'text-gray-400'}`} />
                        </div>
                        <p className="text-sm text-gray-400 text-center">
                            Drag and Drop or <span className="text-amber-500 font-medium">Browse</span> to upload
                        </p>
                        <input
                            type="file"
                            id="upload-panel-file-input"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* File List */}
                    {queuedFiles.length > 0 && (
                        <div className="space-y-2">
                            {queuedFiles.map((qFile) => (
                                <div
                                    key={qFile.id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a24] group"
                                >
                                    {/* File Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
                                        {getFileIcon(qFile.file)}
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{qFile.file.name}</p>
                                        <p className="text-xs text-gray-500">{formatFileSize(qFile.file.size)}</p>

                                        {/* Progress Bar */}
                                        {qFile.status === 'uploading' && (
                                            <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-500 rounded-full transition-all duration-200"
                                                    style={{ width: `${qFile.progress}%` }}
                                                />
                                            </div>
                                        )}

                                        {/* Error message */}
                                        {qFile.status === 'error' && (
                                            <p className="text-xs text-red-400 mt-1">{qFile.error || 'Upload failed'}</p>
                                        )}
                                    </div>

                                    {/* Status/Actions */}
                                    {qFile.status === 'done' ? (
                                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    ) : qFile.status === 'uploading' ? (
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        </div>
                                    ) : qFile.status === 'error' ? (
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(qFile.id) }}
                                            className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none p-6 border-t border-gray-800">
                    <button
                        onClick={handleUpload}
                        disabled={pendingCount === 0 || isUploading}
                        className="w-full py-3 bg-[#F2CE88] text-[#0a0a0f] font-bold rounded-xl hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Uploading...' : `Upload ${pendingCount > 0 ? `(${pendingCount})` : ''}`}
                    </button>
                </div>
            </div>
        </>,
        document.body
    )
}
