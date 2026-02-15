import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Trash2, Pencil, Folder, Calendar, HardDrive, FileType, Hash, Users } from 'lucide-react'
import { FileRecord } from '@taskdashboard/types'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { pl, enUS } from 'date-fns/locale'

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

function formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function FileInfoPanel({ file, isOpen, onClose, onDownload, onDelete, onRename }: FileInfoPanelProps) {
    const { t, i18n } = useTranslation()
    const currentLocale = i18n.language === 'pl' ? pl : enUS
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

    const getFriendlyFileType = (mimeType: string | null, fileType: string | null | undefined): string => {
        if (fileType) {
            return fileType.toUpperCase()
        }
        if (!mimeType) return t('files.types.unknown')

        // Common mime type mappings
        const mimeMap: Record<string, string> = {
            // PDF
            'application/pdf': t('files.types.pdf'),

            // Word Documents
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': t('files.types.word'),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.template': t('files.types.word'), // Reuse word
            'application/msword': t('files.types.word'),
            'application/vnd.ms-word.document.macroEnabled.12': t('files.types.word'),

            // Excel Spreadsheets
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': t('files.types.excel'),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.template': t('files.types.excel'), // Reuse excel
            'application/vnd.ms-excel': t('files.types.excel'),
            'application/vnd.ms-excel.sheet.macroEnabled.12': t('files.types.excel'),

            // PowerPoint Presentations
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': t('files.types.powerpoint'),
            'application/vnd.openxmlformats-officedocument.presentationml.slideshow': t('files.types.powerpoint'),
            'application/vnd.openxmlformats-officedocument.presentationml.template': t('files.types.powerpoint'),
            'application/vnd.ms-powerpoint': t('files.types.powerpoint'),
            'application/vnd.ms-powerpoint.presentation.macroEnabled.12': t('files.types.powerpoint'),

            // Archives
            'application/zip': t('files.types.zip'),
            'application/x-rar-compressed': t('files.types.rar'),
            'application/x-7z-compressed': t('files.types.7z'),
            'application/gzip': t('files.types.gzip'),
            'application/x-tar': t('files.types.tar'),

            // Code/Text
            'application/json': t('files.types.json'),
            'text/plain': t('files.types.text'),
            'text/html': t('files.types.html'),
            'text/css': t('files.types.css'),
            'text/javascript': t('files.types.javascript'),
            'application/javascript': t('files.types.javascript'),
            'text/typescript': t('files.types.typescript'),
            'text/xml': t('files.types.xml'),
            'application/xml': t('files.types.xml'),
        }

        if (mimeMap[mimeType]) return mimeMap[mimeType]

        // Fallback: extract subtype and format nicely
        if (mimeType.startsWith('image/')) return `${t('files.types.image')} (${mimeType.split('/')[1].toUpperCase()})`
        if (mimeType.startsWith('video/')) return `${t('files.types.video')} (${mimeType.split('/')[1].toUpperCase()})`
        if (mimeType.startsWith('audio/')) return `${t('files.types.audio')} (${mimeType.split('/')[1].toUpperCase()})`

        const subtype = mimeType.split('/')[1]
        return subtype ? subtype.toUpperCase() : t('files.types.unknown')
    }

    if (!isOpen || !file) return null

    const isImage = file.mimeType?.startsWith('image/')

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} `}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'} `}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">{t('files.properties.details')}</h2>
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
                                {t('files.actions.download')}
                            </button>
                        )}
                        {onRename && (
                            <button
                                onClick={() => onRename(file.id)}
                                className="p-2.5 rounded-xl text-gray-400 hover:text-white bg-[#1f1f2e] hover:bg-gray-800 border border-gray-800 transition-colors"
                                title={t('files.actions.rename')}
                            >
                                <Pencil size={18} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(file.id)}
                                className="p-2.5 rounded-xl text-gray-400 hover:text-red-400 bg-[#1f1f2e] hover:bg-gray-800 border border-gray-800 transition-colors"
                                title={t('files.actions.delete')}
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>

                    {/* File Properties */}
                    <div className="pt-4 border-t border-gray-800 space-y-3">
                        <h4 className="uppercase text-xs font-semibold text-gray-500 tracking-wider mb-4">{t('files.properties.section_title')}</h4>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <HardDrive size={14} />
                                <span>{t('files.properties.size')}</span>
                            </div>
                            <span className="text-gray-300 font-medium">{formatFileSize(file.size)}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FileType size={14} />
                                <span>{t('files.properties.type')}</span>
                            </div>
                            <span className="text-gray-300 font-medium">{getFriendlyFileType(file.mimeType, file.fileType)}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Calendar size={14} />
                                <span>{t('files.properties.created')}</span>
                            </div>
                            <span className="text-gray-300 font-medium">{format(new Date(file.createdAt), 'dd.MM.yyyy', { locale: currentLocale })}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Folder size={14} />
                                <span>{t('files.properties.location')}</span>
                            </div>
                            <span className="text-gray-300 font-medium">{file.folderId ? t('files.messages.in_folder') : t('files.messages.root')}</span>
                        </div>

                        {file.teamId && (
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Users size={14} />
                                    <span>{t('files.properties.team')}</span>
                                </div>
                                <span className="text-gray-300 font-medium font-mono text-xs">{file.teamId.slice(0, 12)}...</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Hash size={14} />
                                <span>{t('files.properties.id')}</span>
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
