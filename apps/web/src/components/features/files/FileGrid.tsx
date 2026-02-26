import * as React from 'react'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { FileRecord, Folder } from '@taskdashboard/types'
import { MoreVertical, Folder as FolderIcon, FileText, Image, File as GenericFile, FileSpreadsheet, Video, Music, Pencil, Copy, Archive, Info, Trash2, FolderOpen, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileContextMenu } from './FileContextMenu'
import { useTranslation } from 'react-i18next'

interface FileItemProps {
    file: FileRecord
    onClick?: (id: string) => void
    onRename: (id: string) => void
    onDelete: (id: string) => void
    onMove: (id: string) => void
    onDownload: (id: string) => void
    onInfo?: (id: string) => void
    onArchive?: (id: string) => void
    onDuplicate?: (id: string) => void
    onOpen?: (id: string) => void
    userRole?: string | null
}

// Get appropriate icon based on file type
function getFileIcon(mimeType?: string | null) {
    if (!mimeType) return GenericFile
    if (mimeType.startsWith('image/')) return Image
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    if (mimeType.includes('pdf')) return FileText
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
    if (mimeType.includes('document') || mimeType.includes('word')) return FileText
    return GenericFile
}

// Get color based on file type
function getFileColor(mimeType?: string | null) {
    if (!mimeType) return 'text-gray-500'
    if (mimeType.startsWith('image/')) return 'text-purple-400'
    if (mimeType.startsWith('video/')) return 'text-pink-400'
    if (mimeType.startsWith('audio/')) return 'text-green-400'
    if (mimeType.includes('pdf')) return 'text-red-400'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'text-emerald-400'
    if (mimeType.includes('document') || mimeType.includes('word')) return 'text-blue-400'
    return 'text-gray-500'
}

// Format file size
function formatSize(bytes: number | null) {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

export function FileGridItem({ file, onClick, onRename, onDelete, onMove, onDownload, onInfo, onArchive, onDuplicate, onOpen, userRole }: FileItemProps) {
    const { t, i18n } = useTranslation()
    const currentLocale = i18n.language === 'pl' ? pl : enUS
    const isImage = file.mimeType?.startsWith('image/')
    const FileTypeIcon = getFileIcon(file.mimeType)
    const iconColor = getFileColor(file.mimeType)

    return (
        <FileContextMenu
            itemId={file.id}
            isFolder={false}
            onRename={onRename}
            onDelete={onDelete}
            onMove={onMove}
            onDownload={onDownload}
            onInfo={onInfo}
            onArchive={onArchive}
            onDuplicate={onDuplicate}
            onOpen={onOpen}
            userRole={userRole}
        >
            <div
                className="group relative flex flex-col rounded-xl bg-[#1a1a24] overflow-hidden transition-all hover:bg-[#1e1e29] cursor-pointer"
                onClick={() => onClick?.(file.id)}
                onDoubleClick={(e) => { e.stopPropagation(); onOpen?.(file.id) }}
                draggable={userRole !== 'member'}
                onDragStart={(e) => {
                    if (userRole === 'member') return
                    e.dataTransfer.setData('fileId', file.id)
                    e.dataTransfer.effectAllowed = 'move'
                }}
            >
                {/* Thumbnail / Icon Area - Fixed aspect ratio */}
                <div className="relative aspect-[4/3] w-full bg-[#12121a] flex items-center justify-center overflow-hidden">
                    {isImage && file.thumbnailUrl ? (
                        <img src={file.thumbnailUrl} alt={file.name} className="object-cover w-full h-full" />
                    ) : (
                        <FileTypeIcon className={`h-10 w-10 ${iconColor}`} />
                    )}

                    {/* Overlay Menu */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-7 w-7 bg-[#1a1a24]/90 backdrop-blur-sm hover:bg-gray-800">
                                    <MoreVertical className="h-4 w-4 text-gray-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-[#1a1a24] border-gray-800 p-1">
                                {/* Open / View */}
                                {onOpen && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                        <Eye className="h-4 w-4 text-blue-400" />
                                        <span>{t('files.actions.open', 'Open')}</span>
                                    </DropdownMenuItem>
                                )}
                                {userRole !== 'member' && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                        <Pencil className="h-4 w-4 text-amber-500" />
                                        <span>{t('files.actions.edit')}</span>
                                    </DropdownMenuItem>
                                )}
                                {userRole !== 'member' && (
                                    <>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                            <Copy className="h-4 w-4 text-gray-400" />
                                            <span>{t('files.actions.duplicate')}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                            <FolderOpen className="h-4 w-4 text-gray-400" />
                                            <span>{t('files.actions.move')}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                            <Archive className="h-4 w-4 text-gray-400" />
                                            <span>{t('files.actions.archive')}</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onInfo?.(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                    <Info className="h-4 w-4 text-gray-400" />
                                    <span>{t('files.actions.info')}</span>
                                </DropdownMenuItem>
                                {userRole !== 'member' && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                        <Trash2 className="h-4 w-4 text-amber-600" />
                                        <span>{t('files.actions.delete')}</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* File Info */}
                <div className="p-3 space-y-2 bg-[#1a1a24]">
                    <div className="flex items-center gap-2">
                        <FileTypeIcon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
                        <p className="text-sm font-medium text-white truncate" title={file.name}>
                            {file.name}
                        </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatSize(file.size)}</span>
                        <span>{format(new Date(file.createdAt), 'dd.MM.yyyy', { locale: currentLocale })}</span>
                    </div>
                </div>
            </div>
        </FileContextMenu>
    )
}

interface FolderGridItemProps {
    folder: Folder
    onNavigate: (id: string) => void
    onRename: (id: string) => void
    onDelete: (id: string) => void
    onFileDrop?: (fileId: string, folderId: string) => void
    userRole?: string | null
}

export function FolderGridItem({ folder, onNavigate, onRename, onDelete, onFileDrop, userRole }: FolderGridItemProps) {
    const { t, i18n } = useTranslation()
    const currentLocale = i18n.language === 'pl' ? pl : enUS
    const [isDragOver, setIsDragOver] = React.useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        if (userRole === 'member') return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        if (userRole === 'member') return
        e.preventDefault()
        setIsDragOver(false)
        const fileId = e.dataTransfer.getData('fileId')
        if (fileId && onFileDrop) {
            onFileDrop(fileId, folder.id)
        }
    }

    return (
        <FileContextMenu
            itemId={folder.id}
            isFolder={true}
            onRename={onRename}
            onDelete={onDelete}
            onMove={() => { }}
            onDownload={() => { }}
            userRole={userRole}
        >
            <div
                onClick={() => onNavigate(folder.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group relative flex flex-col rounded-xl bg-[#1a1a24] p-4 transition-all hover:bg-[#1e1e29] cursor-pointer ${isDragOver ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''}`}
            >
                {/* Folder Icon */}
                <div className="mb-3">
                    <FolderIcon className="h-10 w-10 text-amber-500 fill-amber-500/20" />
                </div>

                {/* Folder Name */}
                <p className="text-sm font-medium text-white truncate mb-2" title={folder.name}>
                    {folder.name}
                </p>

                {/* Size and Date */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatSize((folder as any).size)}</span>
                    <span>{format(new Date(folder.updatedAt || folder.createdAt), 'dd.MM.yyyy', { locale: currentLocale })}</span>
                </div>

                {/* Menu Button */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-[#1a1a24] border-gray-800 p-1">
                            {userRole !== 'member' && (
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRename(folder.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                    <Pencil className="h-4 w-4 text-amber-500" />
                                    <span>{t('files.actions.edit')}</span>
                                </DropdownMenuItem>
                            )}
                            {userRole !== 'member' && (
                                <>
                                    <DropdownMenuItem onClick={(e: React.MouseEvent) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                        <Copy className="h-4 w-4 text-gray-400" />
                                        <span>{t('files.actions.duplicate')}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e: React.MouseEvent) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                        <Archive className="h-4 w-4 text-gray-400" />
                                        <span>{t('files.actions.archive')}</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                <Info className="h-4 w-4 text-gray-400" />
                                <span>{t('files.actions.info')}</span>
                            </DropdownMenuItem>
                            {userRole !== 'member' && (
                                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(folder.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                    <Trash2 className="h-4 w-4 text-amber-600" />
                                    <span>{t('files.actions.delete')}</span>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </FileContextMenu>
    )
}
