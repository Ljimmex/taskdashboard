import * as React from 'react'
import { format } from 'date-fns'
import { FileRecord, Folder } from '@taskdashboard/types'
import { Folder as FolderIcon, MoreHorizontal, FileText, Image, FileSpreadsheet, Video, Music, File as GenericFile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
    onDownload
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

    return (
        <div className="rounded-xl bg-[#1a1a24] overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-800/50">
                        <th className="w-[50%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
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
                            <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-sm text-gray-500">Folder</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(folder.updatedAt), 'MMM d, yyyy')}</td>
                            <td className="px-4 py-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-white hover:bg-gray-800">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-[#1a1a24] border-gray-800">
                                        <DropdownMenuItem onClick={() => onRename(folder.id)} className="text-gray-300 hover:text-white hover:bg-gray-800">Rename</DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-gray-800" />
                                        <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-gray-800" onClick={() => onDelete(folder.id)}>
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}

                    {files.map(file => {
                        const FileTypeIcon = getFileIcon(file.mimeType)
                        const iconColor = getFileColor(file.mimeType)

                        return (
                            <tr key={file.id} className="cursor-pointer hover:bg-[#1e1e29] transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-[#12121a] flex items-center justify-center">
                                            <FileTypeIcon className={`h-4 w-4 ${iconColor}`} />
                                        </div>
                                        <span className="text-sm font-medium text-white">{file.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{formatSize(file.size)}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                                    {file.mimeType?.split('/')[1] || 'Unknown'}
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
                                        <DropdownMenuContent align="end" className="bg-[#1a1a24] border-gray-800">
                                            <DropdownMenuItem onClick={() => onDownload(file.id)} className="text-gray-300 hover:text-white hover:bg-gray-800">Download</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onRename(file.id)} className="text-gray-300 hover:text-white hover:bg-gray-800">Rename</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onMove(file.id)} className="text-gray-300 hover:text-white hover:bg-gray-800">Move</DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-gray-800" />
                                            <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-gray-800" onClick={() => onDelete(file.id)}>
                                                Delete
                                            </DropdownMenuItem>
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
