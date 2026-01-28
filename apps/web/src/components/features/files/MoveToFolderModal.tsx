import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Folder, FolderOpen, Loader2, Home } from 'lucide-react'
import { useFolders, useMoveFile } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'

interface MoveToFolderModalProps {
    isOpen: boolean
    onClose: () => void
    fileId: string | null
    fileName: string
    currentFolderId: string | null
    onSuccess?: () => void
}

export function MoveToFolderModal({ isOpen, onClose, fileId, fileName, currentFolderId, onSuccess }: MoveToFolderModalProps) {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
    const { data: folders, isLoading } = useFolders(workspaceSlug, null) // Get all root folders
    const moveFile = useMoveFile()

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedFolderId(null)
        }
    }, [isOpen])

    const handleMove = async () => {
        if (!fileId) return

        try {
            await moveFile.mutateAsync({
                fileId,
                folderId: selectedFolderId,
                workspaceSlug
            })
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('Failed to move file:', error)
        }
    }

    if (!isOpen || !fileId) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md bg-[#16161f] rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Move to Folder</h2>
                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{fileName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[400px] overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Root option */}
                                <button
                                    onClick={() => setSelectedFolderId(null)}
                                    disabled={currentFolderId === null}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedFolderId === null
                                            ? 'bg-amber-500/20 border-amber-500/50 border'
                                            : 'bg-[#1a1a24] border border-gray-800 hover:border-gray-700'
                                        } ${currentFolderId === null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <Home className={`h-5 w-5 ${selectedFolderId === null ? 'text-amber-400' : 'text-gray-500'}`} />
                                    <span className={selectedFolderId === null ? 'text-white font-medium' : 'text-gray-300'}>
                                        Root (Files)
                                    </span>
                                    {currentFolderId === null && (
                                        <span className="ml-auto text-xs text-gray-500">Current</span>
                                    )}
                                </button>

                                {/* Folders */}
                                {folders?.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => setSelectedFolderId(folder.id)}
                                        disabled={folder.id === currentFolderId}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedFolderId === folder.id
                                                ? 'bg-amber-500/20 border-amber-500/50 border'
                                                : 'bg-[#1a1a24] border border-gray-800 hover:border-gray-700'
                                            } ${folder.id === currentFolderId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <Folder className={`h-5 w-5 ${selectedFolderId === folder.id ? 'text-amber-400' : 'text-amber-500/70'}`} />
                                        <span className={selectedFolderId === folder.id ? 'text-white font-medium' : 'text-gray-300'}>
                                            {folder.name}
                                        </span>
                                        {folder.id === currentFolderId && (
                                            <span className="ml-auto text-xs text-gray-500">Current</span>
                                        )}
                                    </button>
                                ))}

                                {(!folders || folders.length === 0) && (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        No folders available. Create a folder first.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 px-6 py-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-gray-400 bg-[#1a1a24] rounded-xl font-medium hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleMove}
                            disabled={selectedFolderId === undefined || moveFile.isPending || (selectedFolderId === null && currentFolderId === null)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {moveFile.isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Moving...
                                </>
                            ) : (
                                <>
                                    <FolderOpen size={18} />
                                    Move Here
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    )
}
