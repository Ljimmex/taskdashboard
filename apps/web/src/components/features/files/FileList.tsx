import * as React from 'react'
import { format } from 'date-fns'
import { FileRecord, Folder } from '@taskdashboard/types'
import { Folder as FolderIcon, MoreHorizontal, FileText, Image, FileSpreadsheet, Video, Music, File as GenericFile, Pencil, Trash2, Copy, Archive, Info, FolderOpen, Download, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

// Get friendly file type name
function getFriendlyFileType(mimeType?: string | null): string {
    if (!mimeType) return 'Unknown'

    const mimeMap: Record<string, string> = {
        'application/pdf': 'PDF',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
        'application/msword': 'Word',
        'application/vnd.ms-excel': 'Excel',
        'application/vnd.ms-powerpoint': 'PowerPoint',
        'application/zip': 'ZIP',
        'application/json': 'JSON',
        'text/plain': 'Text',
    }

    if (mimeMap[mimeType]) return mimeMap[mimeType]
    if (mimeType.startsWith('image/')) return mimeType.split('/')[1].toUpperCase()
    if (mimeType.startsWith('video/')) return mimeType.split('/')[1].toUpperCase()
    if (mimeType.startsWith('audio/')) return mimeType.split('/')[1].toUpperCase()

    return mimeType.split('/')[1]?.toUpperCase() || 'Unknown'
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
    sortBy,
    sortOrder,
    onSort,
    userRole
}: FileListProps) {
    if (isLoading) {
        return <div className="flex items-center justify-center py-10 text-gray-500">Loading...</div>
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
                            <div className="flex items-center">Name {renderSortIcon('name')}</div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => onSort('size')}
                        >
                            <div className="flex items-center">Size {renderSortIcon('size')}</div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => onSort('type')}
                        >
                            <div className="flex items-center">Type {renderSortIcon('type')}</div>
                        </th>
                        <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                            onClick={() => onSort('date')}
                        >
                            <div className="flex items-center">Last Modified {renderSortIcon('date')}</div>
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
                            <td className="px-4 py-3 text-sm text-gray-500">Folder</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(folder.updatedAt || folder.createdAt), 'MMM d, yyyy')}</td>
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
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                        )}
                                        {canManageFolder && (
                                            <>
                                                <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Copy className="h-4 w-4 text-gray-400" />
                                                    <span>Duplicate</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Archive className="h-4 w-4 text-gray-400" />
                                                    <span>Archive</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                            <Info className="h-4 w-4 text-gray-400" />
                                            <span>Info</span>
                                        </DropdownMenuItem>
                                        {canManageFolder && (
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(folder.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                <Trash2 className="h-4 w-4 text-amber-600" />
                                                <span>Delete</span>
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
                            <tr key={file.id} className="cursor-pointer hover:bg-[#1e1e29] transition-colors" onClick={() => onInfo?.(file.id)}>
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
                                    {format(new Date(file.updatedAt || file.createdAt), 'MMM d, yyyy')}
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
                                            {canManageFile && (
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Pencil className="h-4 w-4 text-amber-500" />
                                                    <span>Edit</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                <Download className="h-4 w-4 text-gray-400" />
                                                <span>Download</span>
                                            </DropdownMenuItem>
                                            {canManageFile && (
                                                <>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                        <Copy className="h-4 w-4 text-gray-400" />
                                                        <span>Duplicate</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                        <FolderOpen className="h-4 w-4 text-gray-400" />
                                                        <span>Move to...</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive?.(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                        <Archive className="h-4 w-4 text-gray-400" />
                                                        <span>Archive</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onInfo?.(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                <Info className="h-4 w-4 text-gray-400" />
                                                <span>Info</span>
                                            </DropdownMenuItem>
                                            {canManageFile && (
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(file.id) }} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                                    <Trash2 className="h-4 w-4 text-amber-600" />
                                                    <span>Delete</span>
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
                                No files or folders found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
