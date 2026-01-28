import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Trash2, Pencil, Folder, Calendar, HardDrive, FileType, Hash, Users } from 'lucide-react'
import { FileRecord } from '@taskdashboard/types'
import { format } from 'date-fns'

interface FileInfoPanelProps {
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

function getFriendlyFileType(mimeType: string | null, fileType: string | null | undefined): string {
    if (fileType) {
        return fileType.toUpperCase()
    }
    if (!mimeType) return 'Unknown'

    // Common mime type mappings
    const mimeMap: Record<string, string> = {
        // PDF
        'application/pdf': 'PDF',

        // Word Documents
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.template': 'Word Template',
        'application/msword': 'Word Document',
        'application/vnd.ms-word.document.macroEnabled.12': 'Word Document',

        // Excel Spreadsheets
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'Excel Template',
        'application/vnd.ms-excel': 'Excel Spreadsheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12': 'Excel Spreadsheet',

        // PowerPoint Presentations
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow': 'PowerPoint Show',
        'application/vnd.openxmlformats-officedocument.presentationml.template': 'PowerPoint Template',
        'application/vnd.ms-powerpoint': 'PowerPoint',
        'application/vnd.ms-powerpoint.presentation.macroEnabled.12': 'PowerPoint',

        // Archives
        'application/zip': 'ZIP Archive',
        'application/x-rar-compressed': 'RAR Archive',
        'application/x-7z-compressed': '7-Zip Archive',
        'application/gzip': 'GZip Archive',
        'application/x-tar': 'TAR Archive',

        // Code/Text
        'application/json': 'JSON',
        'text/plain': 'Text File',
        'text/html': 'HTML',
        'text/css': 'CSS',
        'text/javascript': 'JavaScript',
        'application/javascript': 'JavaScript',
        'text/typescript': 'TypeScript',
        'text/xml': 'XML',
        'application/xml': 'XML',
    }

    if (mimeMap[mimeType]) return mimeMap[mimeType]

    // Fallback: extract subtype and format nicely
    if (mimeType.startsWith('image/')) return `Image (${mimeType.split('/')[1].toUpperCase()})`
    if (mimeType.startsWith('video/')) return `Video (${mimeType.split('/')[1].toUpperCase()})`
    if (mimeType.startsWith('audio/')) return `Audio (${mimeType.split('/')[1].toUpperCase()})`

    const subtype = mimeType.split('/')[1]
    return subtype ? subtype.toUpperCase() : 'Unknown'
}

function formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function FileInfoPanel({ file, isOpen, onClose, onDownload, onDelete, onRename }: FileInfoPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null)

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    if (!isOpen || !file) return null

    const isImage = file.mimeType?.startsWith('image/')

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">File Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 overflow-y-auto space-y-6">
                    {/* Preview Thumbnail */}
                    <div className="aspect-video bg-[#1f1f2e] rounded-xl flex items-center justify-center border border-gray-800">
                        {isImage && file.thumbnailUrl ? (
                            <img
                                src={file.thumbnailUrl}
                                alt={file.name}
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                        ) : (
                            <span className="text-5xl">{getFileIcon(file.mimeType)}</span>
                        )}
                    </div>

                    {/* File Name */}
                    <div>
                        <h3 className="text-xl font-semibold text-white break-words">{file.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{getFriendlyFileType(file.mimeType, file.fileType)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {onDownload && (
                            <button
                                onClick={() => onDownload(file.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors"
                            >
                                <Download size={18} />
                                Download
                            </button>
                        )}
                        {onRename && (
                            <button
                                onClick={() => onRename(file.id)}
                                className="p-2.5 rounded-xl text-gray-400 hover:text-white bg-[#1f1f2e] hover:bg-gray-800 border border-gray-800 transition-colors"
                                title="Rename"
                            >
                                <Pencil size={18} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(file.id)}
                                className="p-2.5 rounded-xl text-gray-400 hover:text-red-400 bg-[#1f1f2e] hover:bg-gray-800 border border-gray-800 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>

                    {/* File Properties */}
                    <div className="pt-4 border-t border-gray-800 space-y-3">
                        <h4 className="uppercase text-xs font-semibold text-gray-500 tracking-wider mb-4">Properties</h4>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <HardDrive size={14} />
                                <span>Size</span>
                            </div>
                            <span className="text-gray-300 font-medium">{formatFileSize(file.size)}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FileType size={14} />
                                <span>Type</span>
                            </div>
                            <span className="text-gray-300 font-medium">{getFriendlyFileType(file.mimeType, file.fileType)}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Calendar size={14} />
                                <span>Created</span>
                            </div>
                            <span className="text-gray-300 font-medium">{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Folder size={14} />
                                <span>Location</span>
                            </div>
                            <span className="text-gray-300 font-medium">{file.folderId ? 'In folder' : 'Root'}</span>
                        </div>

                        {file.teamId && (
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Users size={14} />
                                    <span>Team</span>
                                </div>
                                <span className="text-gray-300 font-medium font-mono text-xs">{file.teamId.slice(0, 12)}...</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Hash size={14} />
                                <span>ID</span>
                            </div>
                            <span className="text-gray-500 font-mono text-xs">{file.id.slice(0, 12)}...</span>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
