import { useState, useEffect } from 'react'
import { X, Pencil, Loader2, FileText, Folder } from 'lucide-react'
import { useRenameFile, useRenameFolder } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

interface RenameModalProps {
    isOpen: boolean
    onClose: () => void
    itemId: string | null
    itemName: string
    itemType: 'file' | 'folder'
    onSuccess?: () => void
}

export function RenameModal({ isOpen, onClose, itemId, itemName, itemType, onSuccess }: RenameModalProps) {
    const { t } = useTranslation()
    const { workspaceSlug } = useParams({ from: '/$workspaceSlug' })
    const [name, setName] = useState(itemName)
    const renameFile = useRenameFile()
    const renameFolder = useRenameFolder()

    // Reset name when modal opens with new item
    useEffect(() => {
        if (isOpen) {
            setName(itemName)
        }
    }, [isOpen, itemName])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !itemId) return

        try {
            if (itemType === 'file') {
                await renameFile.mutateAsync({
                    fileId: itemId,
                    name: name.trim(),
                    workspaceSlug
                })
            } else {
                await renameFolder.mutateAsync({
                    folderId: itemId,
                    name: name.trim(),
                    workspaceSlug
                })
            }
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('Failed to rename:', error)
        }
    }

    const handleClose = () => {
        setName(itemName)
        onClose()
    }

    if (!isOpen || !itemId) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={handleClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md bg-[#16161f] rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            {itemType === 'folder' ? (
                                <Folder className="w-5 h-5 text-blue-400" />
                            ) : (
                                <FileText className="w-5 h-5 text-blue-400" />
                            )}
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            {itemType === 'folder'
                                ? t('files.modals.rename.title_folder')
                                : t('files.modals.rename.title_file')}
                        </h2>
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
                        <label htmlFor="item-name" className="block text-sm font-medium text-gray-300 mb-2">
                            {t('files.modals.rename.label')}
                        </label>
                        <input
                            id="item-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('files.modals.rename.placeholder')}
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
                            {t('files.modals.rename.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || name === itemName || renameFile.isPending || renameFolder.isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {(renameFile.isPending || renameFolder.isPending) ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('files.modals.rename.submit_loading')}
                                </>
                            ) : (
                                <>
                                    <Pencil size={18} />
                                    {t('files.modals.rename.submit')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

