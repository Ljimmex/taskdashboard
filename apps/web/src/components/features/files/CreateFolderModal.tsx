import { useState } from 'react'
import { X, FolderPlus, Loader2 } from 'lucide-react'
import { useCreateFolder } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'

interface CreateFolderModalProps {
    isOpen: boolean
    onClose: () => void
    parentId: string | null
    onSuccess?: () => void
}

export function CreateFolderModal({ isOpen, onClose, parentId, onSuccess }: CreateFolderModalProps) {
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
    const [name, setName] = useState('')
    const createFolder = useCreateFolder()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        try {
            await createFolder.mutateAsync({
                workspaceSlug,
                name: name.trim(),
                parentId
            })
            setName('')
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('Failed to create folder:', error)
        }
    }

    const handleClose = () => {
        setName('')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={handleClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md bg-[#16161f] rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <FolderPlus className="w-5 h-5 text-amber-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Create New Folder</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label htmlFor="folder-name" className="block text-sm font-medium text-gray-300 mb-2">
                            Folder Name
                        </label>
                        <input
                            id="folder-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter folder name..."
                            autoFocus
                            className="w-full px-4 py-3 bg-[#1a1a24] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 text-gray-400 bg-[#1a1a24] rounded-xl font-medium hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || createFolder.isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {createFolder.isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Folder'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
