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

export function MoveToFolderModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  currentFolderId,
  onSuccess,
}: MoveToFolderModalProps) {
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
        workspaceSlug,
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
        className="animate-in fade-in fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div className="animate-in slide-in-from-bottom sm:zoom-in-95 relative w-full max-w-md overflow-hidden rounded-b-none rounded-t-3xl border border-white/5 bg-[var(--app-bg-card)] shadow-2xl duration-200 sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-[var(--app-accent)]/10 flex h-10 w-10 items-center justify-center rounded-b-none rounded-t-3xl sm:rounded-xl">
                <FolderOpen className="h-5 w-5 text-[var(--app-accent)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">
                  {t('files.modals.move.title')}
                </h2>
                <p className="max-w-[200px] truncate text-xs text-[var(--app-text-muted)]">
                  {fileName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="custom-scrollbar max-h-[400px] overflow-y-auto p-6">
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
                  className={`flex w-full items-center gap-3 rounded-b-none rounded-t-3xl border p-3 transition-all sm:rounded-xl ${
                    selectedFolderId === null
                      ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]/50'
                      : 'hover:border-[var(--app-accent)]/30 border-white/5 bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-card)]'
                  } ${currentFolderId === null ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  <Home
                    className={`h-5 w-5 ${selectedFolderId === null ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]'}`}
                  />
                  <span
                    className={
                      selectedFolderId === null
                        ? 'font-medium text-[var(--app-text-primary)]'
                        : 'text-[var(--app-text-secondary)]'
                    }
                  >
                    {t('files.modals.move.root')}
                  </span>
                  {currentFolderId === null && (
                    <span className="ml-auto text-xs text-[var(--app-text-muted)]">
                      {t('files.modals.move.current')}
                    </span>
                  )}
                </button>

                {/* Folders */}
                {folders?.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    disabled={folder.id === currentFolderId}
                    className={`flex w-full items-center gap-3 rounded-b-none rounded-t-3xl border p-3 transition-all sm:rounded-xl ${
                      selectedFolderId === folder.id
                        ? 'bg-[var(--app-accent)]/10 border-[var(--app-accent)]/50'
                        : 'hover:border-[var(--app-accent)]/30 border-[var(--app-divider)] bg-[var(--app-bg-elevated)] hover:bg-[var(--app-bg-card)]'
                    } ${folder.id === currentFolderId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <Folder
                      className={`h-5 w-5 ${selectedFolderId === folder.id ? 'text-[var(--app-accent)]' : 'text-[var(--app-accent)]/60'}`}
                    />
                    <span
                      className={
                        selectedFolderId === folder.id
                          ? 'font-medium text-[var(--app-text-primary)]'
                          : 'text-[var(--app-text-secondary)]'
                      }
                    >
                      {folder.name}
                    </span>
                    {folder.id === currentFolderId && (
                      <span className="ml-auto text-xs text-[var(--app-text-muted)]">
                        {t('files.modals.move.current')}
                      </span>
                    )}
                  </button>
                ))}

                {(!folders || folders.length === 0) && (
                  <div className="py-8 text-center text-sm text-[var(--app-text-muted)]">
                    {t('files.modals.move.no_folders')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-[var(--app-divider)] bg-[var(--app-bg-card)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-b-none rounded-t-3xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-2.5 font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)] sm:rounded-xl"
            >
              {t('files.modals.move.cancel')}
            </button>
            <button
              onClick={handleMove}
              disabled={
                selectedFolderId === undefined ||
                moveFile.isPending ||
                (selectedFolderId === null && currentFolderId === null)
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-b-none rounded-t-3xl bg-[var(--app-accent)] px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl"
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
