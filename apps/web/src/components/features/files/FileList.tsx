import * as React from 'react'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { FileRecord, Folder } from '@taskdashboard/types'
import { Folder as FolderIcon, MoreHorizontal, FileText, Image, FileSpreadsheet, Video, Music, File as GenericFile, Pencil, Trash2, Copy, Archive, Info, FolderOpen, Download, ArrowUp, ArrowDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from 'react-i18next'

interface FileListProps {
    files?: FileRecord[]
    folders?: Folder[]
    isLoading?: boolean
    onNavigate: (id: string) => void
    onRename: (id: string) => void
    onDelete: (id: string) => void
    onMove: (id: string) => void
    onDownload: (id: string) => void
    onInfo?: (id: string) => void
    onArchive?: (id: string) => void
    onDuplicate?: (id: string) => void
    onOpen?: (id: string) => void
    sortBy: 'name' | 'size' | 'date' | 'type'
    sortOrder: 'asc' | 'desc'
    onSort: (field: 'name' | 'size' | 'date' | 'type') => void
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

export function FileList({
    files = [],
    folders = [],
    isLoading,
    onNavigate,
    onRename,
    onDelete,
    onMove,
    onDownload,
    onInfo,
    onArchive,
    onDuplicate,
    onOpen,
    sortBy,
    sortOrder,
    onSort,
    userRole
}: FileListProps) {
    const { t, i18n } = useTranslation()
    const currentLocale = i18n.language === 'pl' ? pl : enUS

    // Get friendly file type name
    const getFriendlyFileType = (mimeType?: string | null): string => {
        if (!mimeType) return t('files.types.all') // Or Unknown? 

        const mimeMap: Record<string, string> = {
            'application/pdf': t('files.types.pdf'),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': t('files.types.document'),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': t('files.types.spreadsheet'),
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': t('files.types.powerpoint'),
            'application/msword': t('files.types.document'),
            'application/vnd.ms-excel': t('files.types.spreadsheet'),
            'application/vnd.ms-powerpoint': t('files.types.powerpoint'),
            'application/zip': t('files.types.archive'),
            'application/json': t('files.types.json'),
            'text/plain': t('files.types.text'),
        }

        if (mimeMap[mimeType]) return mimeMap[mimeType]
        if (mimeType.startsWith('image/')) return t('files.types.image')
        if (mimeType.startsWith('video/')) return t('files.types.video')
        if (mimeType.startsWith('audio/')) return t('files.types.audio')

        return mimeType.split('/')[1]?.toUpperCase() || t('files.types.unknown')
    }

    if (isLoading) {
        return <div className="flex items-center justify-center py-10 text-gray-500">{t('files.messages.getting_ready')}</div>
    }

    const formatSize = (bytes: number | null) => {
        if (!bytes) return '-'
        const units = ['B', 'KB', 'MB', 'GB']
        let size = bytes
        let unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024
            unitIndex++
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`
    }

    const renderSortIcon = (field: 'name' | 'size' | 'date' | 'type') => {
        if (sortBy !== field) return null
        return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />
    }

    const canManageFile = userRole !== 'member'
    const canManageFolder = userRole !== 'member'

    return (
        <div className="rounded-xl bg-[#1a1a24] overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-800/50">
                        <th
                            className="w-[50%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => onSort('name')}
                        >
                            <div className="flex items-center">{t('files.sort.name')} {renderSortIcon('name')}</div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => onSort('size')}
                        >
                            <div className="flex items-center">{t('files.sort.size')} {renderSortIcon('size')}</div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => onSort('type')}
                        >
                            <div className="flex items-center">{t('files.sort.type')} {renderSortIcon('type')}</div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => onSort('date')}
                        >
                            <div className="flex items-center">{t('files.properties.modified')} {renderSortIcon('date')}</div>
                        </th>
                        <th className="w-[50px] px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {folders.map(folder => (
                        <tr
                            key={folder.id}
                            className="cursor-pointer hover:bg-[#1e1e29] transition-colors"
                            onClick={() => onNavigate(folder.id)}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <FolderIcon className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                                    </div>
                                    <span className="text-sm font-medium text-white">{folder.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatSize((folder as any).size)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{t('files.types.folder')}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(folder.updatedAt || folder.createdAt), 'dd MMM, yyyy', { locale: currentLocale })}</td>
                            <td className="px-4 py-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-white hover:bg-gray-800">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 bg-[#1a1a24] border-gray-800 p-1">
                                        {canManageFolder && (
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(folder.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                <Pencil className="h-4 w-4 text-amber-500" />
                                                <span>{t('files.actions.edit')}</span>
                                            </DropdownMenuItem>
                                        )}
                                        {canManageFolder && (
                                            <>
                                                <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Copy className="h-4 w-4 text-gray-400" />
                                                    <span>{t('files.actions.duplicate')}</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Archive className="h-4 w-4 text-gray-400" />
                                                    <span>{t('files.actions.archive')}</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                            <Info className="h-4 w-4 text-gray-400" />
                                            <span>{t('files.actions.info')}</span>
                                        </DropdownMenuItem>
                                        {canManageFolder && (
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(folder.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                <Trash2 className="h-4 w-4 text-amber-600" />
                                                <span>{t('files.actions.delete')}</span>
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}

                    {files.map(file => {
                        const FileTypeIcon = getFileIcon(file.mimeType)
                        const iconColor = getFileColor(file.mimeType)

                        return (
                            <tr key={file.id} className="cursor-pointer hover:bg-[#1e1e29] transition-colors" onClick={() => onInfo?.(file.id)} onDoubleClick={(e) => { e.stopPropagation(); onOpen?.(file.id) }}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-[#12121a] flex items-center justify-center">
                                            <FileTypeIcon className={`h-4 w-4 ${iconColor}`} />
                                        </div>
                                        <span className="text-sm font-medium text-white">{file.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{formatSize(file.size)}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {getFriendlyFileType(file.mimeType)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {format(new Date(file.updatedAt || file.createdAt), 'dd MMM, yyyy', { locale: currentLocale })}
                                </td>
                                <td className="px-4 py-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-white hover:bg-gray-800">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
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
                                            {canManageFile && (
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Pencil className="h-4 w-4 text-amber-500" />
                                                    <span>{t('files.actions.edit')}</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                <Download className="h-4 w-4 text-gray-400" />
                                                <span>{t('files.actions.download')}</span>
                                            </DropdownMenuItem>
                                            {canManageFile && (
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
                                            {canManageFile && (
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Trash2 className="h-4 w-4 text-amber-600" />
                                                    <span>{t('files.actions.delete')}</span>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        )
                    })}

                    {folders.length === 0 && files.length === 0 && (
                        <tr>
                            <td colSpan={5} className="h-24 text-center text-gray-500">
                                {t('files.picker.no_files')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
