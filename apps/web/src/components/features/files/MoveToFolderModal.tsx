import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Folder, FolderOpen, Loader2, Home } from 'lucide-react'
import { useFolders, useMoveFile } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

interface MoveToFolderModalProps {
    isOpen: boolean
    onClose: () => void
    fileId: string | null
    fileName: string
    currentFolderId: string | null
    onSuccess?: () => void
}

export function MoveToFolderModal({ isOpen, onClose, fileId, fileName, currentFolderId, onSuccess }: MoveToFolderModalProps) {
    const { t } = useTranslation()
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
                className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md bg-[var(--app-bg-card)] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--app-accent)]/10 flex items-center justify-center">
                                <FolderOpen className="w-5 h-5 text-[var(--app-accent)]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">{t('files.modals.move.title')}</h2>
                                <p className="text-xs text-[var(--app-text-muted)] truncate max-w-[200px]">{fileName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-[var(--app-accent)]" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Root option */}
                                <button
                                    onClick={() => setSelectedFolderId(null)}
                                    disabled={currentFolderId === null}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedFolderId === null
                                        ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]/50'
                                        : 'bg-[var(--app-bg-elevated)] border-white/5 hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-bg-card)]'
                                        } ${currentFolderId === null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <Home className={`h-5 w-5 ${selectedFolderId === null ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'}`} />
                                    <span className={selectedFolderId === null ? 'text-[var(--app-text-primary)] font-medium' : 'text-[var(--app-text-secondary)]'}>
                                        {t('files.modals.move.root')}
                                    </span>
                                    {currentFolderId === null && (
                                        <span className="ml-auto text-xs text-[var(--app-text-muted)]">{t('files.modals.move.current')}</span>
                                    )}
                                </button>

                                {/* Folders */}
                                {folders?.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => setSelectedFolderId(folder.id)}
                                        disabled={folder.id === currentFolderId}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedFolderId === folder.id
                                            ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]/50'
                                            : 'bg-[var(--app-bg-elevated)] border-[var(--app-divider)] hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-bg-card)]'
                                            } ${folder.id === currentFolderId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <Folder className={`h-5 w-5 ${selectedFolderId === folder.id ? 'text-[var(--app-accent)]' : 'text-[var(--app-accent)]/60'}`} />
                                        <span className={selectedFolderId === folder.id ? 'text-[var(--app-text-primary)] font-medium' : 'text-[var(--app-text-secondary)]'}>
                                            {folder.name}
                                        </span>
                                        {folder.id === currentFolderId && (
                                            <span className="ml-auto text-xs text-[var(--app-text-muted)]">{t('files.modals.move.current')}</span>
                                        )}
                                    </button>
                                ))}

                                {(!folders || folders.length === 0) && (
                                    <div className="text-center py-8 text-[var(--app-text-muted)] text-sm">
                                        {t('files.modals.move.no_folders')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 px-6 py-4 border-t border-[var(--app-divider)] bg-[var(--app-bg-card)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-[var(--app-text-muted)] bg-[var(--app-bg-elevated)] border border-[var(--app-divider)] rounded-xl font-medium hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-colors"
                        >
                            {t('files.modals.move.cancel')}
                        </button>
                        <button
                            onClick={handleMove}
                            disabled={selectedFolderId === undefined || moveFile.isPending || (selectedFolderId === null && currentFolderId === null)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--app-accent)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            {moveFile.isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('files.modals.move.submit_loading')}
                                </>
                            ) : (
                                <>
                                    <FolderOpen size={18} />
                                    {t('files.modals.move.move_here')}
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

