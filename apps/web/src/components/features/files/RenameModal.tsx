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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={handleClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md bg-[var(--app-bg-card)] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--app-accent)]/10 flex items-center justify-center">
                            {itemType === 'folder' ? (
                                <Folder className="w-5 h-5 text-[var(--app-accent)]" />
                            ) : (
                                <FileText className="w-5 h-5 text-[var(--app-accent)]" />
                            )}
                        </div>
                        <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">
                            {itemType === 'folder'
                                ? t('files.modals.rename.title_folder')
                                : t('files.modals.rename.title_file')}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label htmlFor="item-name" className="block text-sm font-medium text-[var(--app-text-secondary)] mb-2">
                            {t('files.modals.rename.label')}
                        </label>
                        <input
                            id="item-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('files.modals.rename.placeholder')}
                            autoFocus
                            className="w-full px-4 py-3 bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]/50 focus:border-[var(--app-accent)] transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl font-medium hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors"
                        >
                            {t('files.modals.rename.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || name === itemName || renameFile.isPending || renameFolder.isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--app-accent)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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

