import { useState, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadQueueItem {
    file: File
    progress: number
    status: 'pending' | 'uploading' | 'success' | 'error'
    error?: string
}

interface FileUploaderProps {
    onUploadComplete?: () => void
    folderId?: string | null
}

export function FileUploader({ onUploadComplete, folderId }: FileUploaderProps) {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        const files = Array.from(e.dataTransfer.files)
        const newItems: UploadQueueItem[] = files.map(file => ({
            file,
            progress: 0,
            status: 'pending' as const
        }))
        setUploadQueue(prev => [...prev, ...newItems])

        // Start uploads
        newItems.forEach(item => uploadFile(item))
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : []
        const newItems: UploadQueueItem[] = files.map(file => ({
            file,
            progress: 0,
            status: 'pending' as const
        }))
        setUploadQueue(prev => [...prev, ...newItems])

        // Start uploads
        newItems.forEach(item => uploadFile(item))
    }

    const uploadFile = async (fileItem: UploadQueueItem) => {
        console.log("Uploading:", fileItem.file.name, "to", workspaceSlug, folderId)
        // Mock upload with progress simulation
        setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, status: 'uploading', progress: 25 } : p))

        await new Promise(r => setTimeout(r, 500))
        setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, progress: 50 } : p))

        await new Promise(r => setTimeout(r, 500))
        setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, progress: 75 } : p))

        await new Promise(r => setTimeout(r, 500))
        setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, status: 'success', progress: 100 } : p))

        if (onUploadComplete) onUploadComplete()
    }

    const removeFromQueue = (file: File) => {
        setUploadQueue(prev => prev.filter(item => item.file !== file))
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    return (
        <div className="rounded-xl border-2 border-dashed border-border bg-card overflow-hidden transition-colors">
            {/* Drop Zone */}
            <div
                className={cn(
                    "flex flex-col items-center justify-center p-8 transition-colors cursor-pointer",
                    isDragOver && "bg-primary/5 border-primary"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">
                    Drag and drop files here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                    or click to browse your files
                </p>
                <Button variant="outline" size="sm" className="gap-2" type="button">
                    <File className="w-4 h-4" />
                    Browse Files
                </Button>
                <input
                    type="file"
                    id="file-input"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
                <div className="border-t bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Uploading {uploadQueue.length} file(s)</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploadQueue([])}
                            className="text-xs"
                        >
                            Clear all
                        </Button>
                    </div>

                    {uploadQueue.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 bg-background rounded-lg p-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <File className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                                {item.status === 'uploading' && (
                                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex-shrink-0">
                                {item.status === 'success' && (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                )}
                                {item.status === 'error' && (
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                )}
                                {item.status === 'pending' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => { e.stopPropagation(); removeFromQueue(item.file) }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
