import { useState, useCallback } from 'react'
import { useParams } from '@tanstack/react-router'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUploadFile, useCreateFolder } from '@/hooks/useFiles'

// Type definitions for File System API
interface FileSystemEntry {
    isFile: boolean
    isDirectory: boolean
    name: string
    fullPath: string
}

interface FileSystemFileEntry extends FileSystemEntry {
    file: (callback: (file: File) => void) => void
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
    createReader: () => FileSystemDirectoryReader
}

interface FileSystemDirectoryReader {
    readEntries: (callback: (entries: FileSystemEntry[]) => void) => void
}

interface UploadQueueItem {
    file: File
    relativePath: string // e.g. "MyFolder/SubFolder/file.txt"
    targetFolderId?: string
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

    const uploadFileMutation = useUploadFile()
    const createFolderMutation = useCreateFolder()

    // Helper to read all entries from a directory reader
    const readAllEntries = async (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
        const entries: FileSystemEntry[] = []
        let readEntries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve))

        while (readEntries.length > 0) {
            entries.push(...readEntries)
            readEntries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve))
        }

        return entries
    }

    // Recursive directory traversal
    const traverseDirectory = async (entry: FileSystemEntry, path = ''): Promise<{ file: File, path: string }[]> => {
        if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry
            return new Promise((resolve) => {
                fileEntry.file((file) => {
                    resolve([{ file, path: path + file.name }])
                })
            })
        } else if (entry.isDirectory) {
            const dirEntry = entry as FileSystemDirectoryEntry
            const reader = dirEntry.createReader()
            const entries = await readAllEntries(reader)

            const results: { file: File, path: string }[] = []
            for (const childEntry of entries) {
                const children = await traverseDirectory(childEntry, path + entry.name + '/')
                results.push(...children)
            }
            return results
        }
        return []
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const createFolderHierarchy = async (items: UploadQueueItem[]) => {
        // Collect all unique folder paths
        const folderPaths = new Set<string>()
        items.forEach(item => {
            const parts = item.relativePath.split('/')
            if (parts.length > 1) {
                // Generate all parent paths: "A/B/C" -> "A", "A/B"
                let currentPath = ''
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + parts[i]
                    folderPaths.add(currentPath)
                }
            }
        })

        // Sort by depth (shortest first) so we create parents before children
        const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length)

        // Map path -> folderId
        const folderIdMap = new Map<string, string>()

        // Initialize root folder (if passed via props)
        // If we are uploading to a specific folder, effectively that's the base

        for (const path of sortedPaths) {
            const parts = path.split('/')
            const folderName = parts[parts.length - 1]
            const parentPath = parts.slice(0, -1).join('/')

            // Determine parent ID: either from our map (created subfolder) or the prop (current root)
            const parentId = parentPath ? folderIdMap.get(parentPath) : folderId

            try {
                // Check if we already created it (in this map) - redundant but safe
                if (folderIdMap.has(path)) continue

                // Create folder
                // NOTE: In a real app, we might want to "find or create" to avoid duplicates if re-uploading
                // For now assuming create new. 
                // Optimization: catch duplicates or api returns existing? The API creates new usually.
                const newFolder = await createFolderMutation.mutateAsync({
                    workspaceSlug,
                    name: folderName,
                    parentId: parentId || null // API expects null for root
                })

                if (newFolder?.id) {
                    folderIdMap.set(path, newFolder.id)
                }
            } catch (err) {
                console.error(`Failed to create folder ${path}`, err)
                // If folder creation fails, files will go to root or parent which is safer than failing fully?
                // Or we could abort. Let's continue but maybe mark error?
            }
        }

        return folderIdMap
    }

    const processUploads = async (items: UploadQueueItem[]) => {
        // 1. Create Folder Structure
        const folderMap = await createFolderHierarchy(items)

        // 2. Assign targetFolderId to items
        const preparedItems = items.map(item => {
            const parts = item.relativePath.split('/')
            let targetId = folderId

            if (parts.length > 1) {
                const parentPath = parts.slice(0, -1).join('/')
                if (folderMap.has(parentPath)) {
                    targetId = folderMap.get(parentPath)
                }
            }

            return {
                ...item,
                targetFolderId: targetId || undefined
            }
        })

        // 3. Update queue state with IDs
        // Actually we might process them one by one or in batches. 
        // Let's replace the queue items with prepared ones?
        // But the queue state in UI needs to match.
        // We can just iterate preparedItems and use them to call uploadFile

        // 4. Start Uploads
        for (const item of preparedItems) {
            await uploadFile(item)
        }
    }

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        const items = Array.from(e.dataTransfer.items)
        const queue: UploadQueueItem[] = []

        for (const item of items) {
            // WebkitGetAsEntry is the key API for folders
            const entry = item.webkitGetAsEntry?.() || null

            if (entry) {
                if (entry.isFile) {
                    const file = item.getAsFile()
                    if (file) {
                        queue.push({
                            file,
                            relativePath: file.name,
                            progress: 0,
                            status: 'pending'
                        })
                    }
                } else if (entry.isDirectory) {
                    // Recursive!
                    const files = await traverseDirectory(entry as FileSystemEntry)
                    files.forEach(({ file, path }) => {
                        queue.push({
                            file,
                            relativePath: path,
                            progress: 0,
                            status: 'pending'
                        })
                    })
                }
            } else {
                // Fallback for non-webkit browsers? Most support it.
                // Just use getAsFile if entry is null (standard file)
                const file = item.getAsFile()
                if (file) {
                    // Skip likely folders (0 bytes, empty type) that failed webkit entry check
                    if (file.size === 0 && file.type === '') {
                        console.warn('Skipping potential folder or empty file:', file.name)
                        continue
                    }
                    queue.push({
                        file,
                        relativePath: file.name,
                        progress: 0,
                        status: 'pending'
                    })
                }
            }
        }

        if (queue.length > 0) {
            setUploadQueue(prev => [...prev, ...queue])
            processUploads(queue)
        }
    }, [folderId, workspaceSlug]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : []
        const newItems: UploadQueueItem[] = files.map(file => {
            // For webkitdirectory input, webkitRelativePath is populated
            const path = file.webkitRelativePath || file.name
            return {
                file,
                relativePath: path,
                progress: 0,
                status: 'pending' as const
            }
        })

        setUploadQueue(prev => [...prev, ...newItems])
        processUploads(newItems)
    }

    const uploadFile = async (fileItem: UploadQueueItem) => {
        try {
            setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, status: 'uploading' } : p))

            await uploadFileMutation.mutateAsync({
                workspaceSlug,
                file: fileItem.file,
                folderId: fileItem.targetFolderId || folderId || null,
                onProgress: (progress) => {
                    setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, progress } : p))
                }
            })

            setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, status: 'success', progress: 100 } : p))
            if (onUploadComplete) onUploadComplete()

        } catch (error) {
            console.error(error)
            setUploadQueue(prev => prev.map(p => p.file === fileItem.file ? { ...p, status: 'error', error: 'Upload failed' } : p))
        }
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
                    Drag and drop files or folders here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                    or click to browse
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" type="button" onClick={(e) => {
                        e.stopPropagation()
                        document.getElementById('file-input')?.click()
                    }}>
                        <File className="w-4 h-4" />
                        Select Files
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" type="button" onClick={(e) => {
                        e.stopPropagation()
                        document.getElementById('folder-input')?.click()
                    }}>
                        <File className="w-4 h-4" />
                        Select Folder
                    </Button>
                </div>

                <input
                    type="file"
                    id="file-input"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                />
                <input
                    type="file"
                    id="folder-input"
                    multiple
                    // @ts-expect-error - standard but not in types
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
                <div className="border-t bg-muted/30 p-4 space-y-3 max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between sticky top-0 bg-muted/30 backdrop-blur-sm z-10 pb-2">
                        <h4 className="text-sm font-medium">Uploading {uploadQueue.length} file(s)</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setUploadQueue([]) }}
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
                                <p className="text-sm font-medium truncate" title={item.relativePath}>{item.relativePath}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                                {item.status === 'uploading' && (
                                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                )}
                                {item.status === 'error' && (
                                    <p className="text-xs text-red-500">{item.error}</p>
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
