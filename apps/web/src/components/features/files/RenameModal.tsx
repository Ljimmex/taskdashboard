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

export function RenameModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  itemType,
  onSuccess,
}: RenameModalProps) {
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
          workspaceSlug,
        })
      } else {
        await renameFolder.mutateAsync({
          folderId: itemId,
          name: name.trim(),
          workspaceSlug,
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] duration-200 sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Modal */}
      <div className="animate-in slide-in-from-bottom sm:zoom-in-95 relative z-10 w-full max-w-md overflow-hidden rounded-b-none rounded-t-3xl border border-white/5 bg-[var(--app-bg-card)] shadow-2xl duration-200 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--app-accent)]/10 flex h-10 w-10 items-center justify-center rounded-b-none rounded-t-3xl sm:rounded-xl">
              {itemType === 'folder' ? (
                <Folder className="h-5 w-5 text-[var(--app-accent)]" />
              ) : (
                <FileText className="h-5 w-5 text-[var(--app-accent)]" />
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
            className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <label
              htmlFor="item-name"
              className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]"
            >
              {t('files.modals.rename.label')}
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('files.modals.rename.placeholder')}
              autoFocus
              className="focus:ring-[var(--app-accent)]/50 w-full rounded-b-none rounded-t-3xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-3 text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] transition-all focus:border-[var(--app-accent)] focus:outline-none focus:ring-2 sm:rounded-xl"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-b-none rounded-t-3xl border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] px-4 py-2.5 font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)] sm:rounded-xl"
            >
              {t('files.modals.rename.cancel')}
            </button>
            <button
              type="submit"
              disabled={
                !name.trim() || name === itemName || renameFile.isPending || renameFolder.isPending
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-b-none rounded-t-3xl bg-[var(--app-accent)] px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl"
            >
              {renameFile.isPending || renameFolder.isPending ? (
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
