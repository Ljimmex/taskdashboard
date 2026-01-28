import { useState } from 'react'
import { useFiles, useUploadFile } from '@/hooks/useFiles'
import { Search, File, Image, FileText, Film, X, Upload, Trash2 } from 'lucide-react'
import { FileRecord } from '@taskdashboard/types'

interface FilePickerProps {
    open: boolean
    onClose: () => void
    onSelectFiles: (files: FileRecord[]) => void
    workspaceSlug: string
    multiSelect?: boolean
}

type Mode = 'select' | 'upload'

export function FilePicker({
    open,
    onClose,
    onSelectFiles,
    workspaceSlug,
    multiSelect = true
}: FilePickerProps) {
    const [mode, setMode] = useState<Mode>('select')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [uploadFiles, setUploadFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)

    // Fetch ALL files from workspace (recursive - all folders)
    const filesQuery = useFiles(workspaceSlug, null, true)
    const files = filesQuery.data || []
    const uploadMutation = useUploadFile()

    // Filter files by search
    const filteredFiles = files.filter((file: FileRecord) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const toggleFile = (file: FileRecord) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(file.id)) {
            newSelected.delete(file.id)
        } else {
            if (!multiSelect) {
                newSelected.clear()
            }
            newSelected.add(file.id)
        }
        setSelectedIds(newSelected)
    }

    const handleSelect = () => {
        const selected = files.filter((f: FileRecord) => selectedIds.has(f.id))
        onSelectFiles(selected)
        setSelectedIds(new Set())
        setSearchQuery('')
        onClose()
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadFiles(Array.from(e.target.files))
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.files) {
            setUploadFiles(Array.from(e.dataTransfer.files))
        }
    }

    const handleUpload = async () => {
        if (uploadFiles.length === 0) return
        setUploading(true)

        try {
            const uploadedFiles: FileRecord[] = []

            for (const file of uploadFiles) {
                const result = await uploadMutation.mutateAsync({
                    workspaceSlug,
                    file,
                    folderId: null
                })
                if (result) {
                    uploadedFiles.push(result)
                }
            }

            onSelectFiles(uploadedFiles)
            setUploadFiles([])
            onClose()
        } catch (error) {
            console.error('Upload failed:', error)
        } finally {
            setUploading(false)
        }
    }

    const getFileIcon = (mimeType?: string | null) => {
        if (!mimeType) return <File className="w-5 h-5" />
        if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />
        if (mimeType.startsWith('video/')) return <Film className="w-5 h-5 text-purple-400" />
        if (mimeType.includes('pdf') || mimeType.includes('document')) {
            return <FileText className="w-5 h-5 text-red-400" />
        }
        return <File className="w-5 h-5" />
    }

    const formatFileSize = (bytes?: number | null) => {
        if (!bytes) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-[#12121a] border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">
                        Add Files
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-4 p-1 bg-gray-800/50 rounded-lg">
                    <button
                        onClick={() => setMode('select')}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'select'
                            ? 'bg-amber-500 text-black'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Select from workspace
                    </button>
                    <button
                        onClick={() => setMode('upload')}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'upload'
                            ? 'bg-amber-500 text-black'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Upload new
                    </button>
                </div>

                {/* SELECT MODE - File List */}
                {mode === 'select' && (
                    <>
                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[#1a1a24] border border-gray-800 rounded-lg text-white placeholder-gray-500 outline-none focus:border-amber-500/50"
                            />
                        </div>

                        {/* File List */}
                        <div className="flex-1 overflow-y-auto space-y-1 max-h-96">
                            {filteredFiles.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    {searchQuery ? 'Nie znaleziono plików' : 'Brak plików w workspace'}
                                </div>
                            ) : (
                                filteredFiles.map((file: FileRecord) => (
                                    <button
                                        key={file.id}
                                        onClick={() => toggleFile(file)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedIds.has(file.id)
                                            ? 'bg-amber-500/20 border border-amber-500/50'
                                            : 'hover:bg-gray-800/50'
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedIds.has(file.id)
                                            ? 'bg-amber-500 border-amber-500'
                                            : 'border-gray-600'
                                            }`}>
                                            {selectedIds.has(file.id) && (
                                                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>

                                        {/* Icon */}
                                        {getFileIcon(file.mimeType)}

                                        {/* Name */}
                                        <div className="flex-1 text-left">
                                            <div className="text-sm text-white font-medium truncate">
                                                {file.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatFileSize(file.size)}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Footer - Select Mode */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-4">
                            <div className="text-sm text-gray-500">
                                {selectedIds.size > 0 && `Wybrano: ${selectedIds.size}`}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                >
                                    Anuluj
                                </button>
                                <button
                                    onClick={handleSelect}
                                    disabled={selectedIds.size === 0}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedIds.size > 0
                                        ? 'bg-amber-500 text-black hover:bg-amber-400'
                                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                        }`}
                                >
                                    Wybierz ({selectedIds.size})
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* UPLOAD MODE - Drop Zone */}
                {mode === 'upload' && (
                    <>
                        {/* Drop Zone */}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-picker-upload')?.click()}
                            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-amber-500/50 hover:bg-gray-800/30 transition-colors mb-4"
                        >
                            <Upload className="w-12 h-12 text-gray-500 mb-3" />
                            <p className="text-sm text-gray-400 mb-1">
                                Przeciągnij pliki tutaj lub
                            </p>
                            <p className="text-sm text-amber-500 font-medium">Kliknij aby wybrać</p>
                            <input
                                id="file-picker-upload"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileInput}
                            />
                        </div>

                        {/* Upload File List */}
                        {uploadFiles.length > 0 && (
                            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                {uploadFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                        {getFileIcon(file.type)}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-white truncate">{file.name}</div>
                                            <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                                        </div>
                                        <button
                                            onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer - Upload Mode */}
                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-800">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploadFiles.length === 0 || uploading}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${uploadFiles.length > 0 && !uploading
                                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                    }`}
                            >
                                {uploading ? 'Uploading...' : `Upload (${uploadFiles.length})`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
