import React, { useState } from 'react'
import { ChevronRight, Home, Folder as FolderIcon } from 'lucide-react'

export interface BreadcrumbItem {
    id: string | null
    name: string
}

interface FolderBreadcrumbProps {
    breadcrumbs: BreadcrumbItem[]
    onNavigate: (index: number) => void
    onFileDrop: (fileId: string, folderId: string | null) => void
}

function DroppableBreadcrumb({
    crumb,
    index,
    isLast,
    onNavigate,
    onFileDrop,
    userRole
}: {
    crumb: BreadcrumbItem
    index: number
    isLast: boolean
    onNavigate: () => void
    onFileDrop: (fileId: string, folderId: string | null) => void
    userRole?: string | null
}) {
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
        if (isLast || userRole === 'member') return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        if (isLast || userRole === 'member') return
        const fileId = e.dataTransfer.getData('fileId')
        if (fileId) {
            onFileDrop(fileId, crumb.id)
        }
    }

    return (
        <div className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={14} className="text-gray-600" />}
            <button
                onClick={onNavigate}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${isLast
                    ? 'text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    } ${isDragOver ? 'ring-2 ring-amber-500 bg-amber-500/20' : ''}`}
            >
                {index === 0 ? (
                    <Home size={14} />
                ) : (
                    <FolderIcon size={14} className="text-amber-500" />
                )}
                <span>{crumb.name}</span>
            </button>
        </div>
    )
}

export function FolderBreadcrumb({
    breadcrumbs,
    onNavigate,
    onFileDrop,
    userRole
}: FolderBreadcrumbProps & { userRole?: string | null }) {
    if (breadcrumbs.length <= 1) return null

    return (
        <div className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
                <DroppableBreadcrumb
                    key={crumb.id || 'root'}
                    crumb={crumb}
                    index={index}
                    isLast={index === breadcrumbs.length - 1}
                    onNavigate={() => onNavigate(index)}
                    onFileDrop={onFileDrop}
                    userRole={userRole}
                />
            ))}
        </div>
    )
}
