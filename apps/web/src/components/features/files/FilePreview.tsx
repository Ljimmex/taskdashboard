import { X, Download, Trash2, Pencil, Folder, Calendar, HardDrive, FileType } from 'lucide-react'
import { FileRecord } from '@taskdashboard/types'
import { format } from 'date-fns'

interface FilePreviewProps {
    file: FileRecord | null
    isOpen: boolean
    onClose: () => void
    onDownload?: (id: string) => void
    onDelete?: (id: string) => void
    onRename?: (id: string) => void
}

function getFileIcon(mimeType: string | null) {
    if (!mimeType) return '📄'
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎬'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📕'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗'
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦'
    return '📄'
}

function formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function FilePreview({ file, isOpen, onClose, onDownload, onDelete, onRename }: FilePreviewProps) {
    if (!isOpen || !file) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#16161f] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{file.name}</h2>
                            <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onDownload && (
                            <button
                                onClick={() => onDownload(file.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                title="Download"
                            >
                                <Download size={20} />
                            </button>
                        )}
                        {onRename && (
                            <button
                                onClick={() => onRename(file.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                title="Rename"
                            >
                                <Pencil size={20} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(file.id)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="flex items-center justify-center min-h-[400px] bg-[#1a1a24] rounded-xl">
                        <div className="flex flex-col items-center gap-4 text-gray-500">
                            <span className="text-6xl">{getFileIcon(file.mimeType)}</span>
                            <p className="text-sm">Preview not available</p>
                            <p className="text-xs text-gray-600">Download the file to view its contents</p>
                            {onDownload && (
                                <button
                                    onClick={() => onDownload(file.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400 transition-colors"
                                >
                                    <Download size={16} />
                                    Download to view
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* File Info Footer */}
                <div className="px-6 py-4 border-t border-gray-800 bg-[#12121a]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                            <FileType size={16} />
                            <span>{file.mimeType || 'Unknown type'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <HardDrive size={16} />
                            <span>{formatFileSize(file.size)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Calendar size={16} />
                            <span>{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Folder size={16} />
                            <span>{file.folderId ? 'In folder' : 'Root'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
