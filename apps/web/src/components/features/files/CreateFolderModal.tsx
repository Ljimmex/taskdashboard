import { useState } from 'react'
import { X, FolderPlus, Loader2 } from 'lucide-react'
import { useCreateFolder } from '@/hooks/useFiles'
import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  parentId: string | null
  onSuccess?: () => void
}

export function CreateFolderModal({
  isOpen,
  onClose,
  parentId,
  onSuccess,
}: CreateFolderModalProps) {
  const { t } = useTranslation()
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
        parentId,
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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] duration-200 sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Modal */}
      <div className="animate-in slide-in-from-bottom sm:zoom-in-95 relative z-10 w-full max-w-md overflow-hidden rounded-b-none rounded-t-3xl border border-[var(--app-divider)] bg-[var(--app-bg-card)] shadow-2xl duration-200 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-divider)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--app-accent)]/10 flex h-10 w-10 items-center justify-center rounded-b-none rounded-t-3xl sm:rounded-xl">
              <FolderPlus className="h-5 w-5 text-[var(--app-accent)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">
              {t('files.modals.create_folder.title')}
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
              htmlFor="folder-name"
              className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]"
            >
              {t('files.modals.create_folder.label')}
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('files.modals.create_folder.placeholder')}
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
              {t('files.modals.create_folder.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createFolder.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-b-none rounded-t-3xl bg-[var(--app-accent)] px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl"
            >
              {createFolder.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('files.modals.create_folder.submit_loading')}
                </>
              ) : (
                t('files.modals.create_folder.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
