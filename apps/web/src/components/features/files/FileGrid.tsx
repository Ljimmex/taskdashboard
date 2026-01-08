import * as React from 'react'
import { format } from 'date-fns'
import { FileRecord, Folder } from '@taskdashboard/types'
import { MoreVertical, Folder as FolderIcon, FileText, Image, File as GenericFile, FileSpreadsheet, Video, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileContextMenu } from './FileContextMenu'

interface FileItemProps {
    file: FileRecord
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

// Format file size
function formatSize(bytes: number | null) {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

export function FileGridItem({ file, onRename, onDelete, onMove, onDownload }: FileItemProps) {
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
        >
            <div className="group relative flex flex-col rounded-xl bg-[#1a1a24] overflow-hidden transition-all hover:bg-[#1e1e29] cursor-pointer">
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
                        <span>{format(new Date(file.createdAt), 'dd.MM.yyyy')}</span>
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
}

export function FolderGridItem({ folder, onNavigate, onRename, onDelete }: FolderGridItemProps) {
    return (
        <FileContextMenu
            itemId={folder.id}
            isFolder={true}
            onRename={onRename}
            onDelete={onDelete}
            onMove={() => { }}
            onDownload={() => { }}
        >
            <div
                onClick={() => onNavigate(folder.id)}
                className="group relative flex flex-col rounded-xl bg-[#1a1a24] p-4 transition-all hover:bg-[#1e1e29] cursor-pointer"
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
                    <span>12 GB</span>
                    <span>{format(new Date(folder.updatedAt), 'dd.MM.yyyy')}</span>
                </div>

                {/* Menu Button */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a24] border-gray-800">
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRename(folder.id) }} className="text-gray-300 hover:text-white hover:bg-gray-800">Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(folder.id) }} className="text-red-400 hover:text-red-300 hover:bg-gray-800">
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </FileContextMenu>
    )
}
