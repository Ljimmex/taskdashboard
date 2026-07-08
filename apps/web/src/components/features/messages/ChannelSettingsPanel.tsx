import { useState } from 'react'
import { X, Trash2, Lock } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useTranslation } from 'react-i18next'

interface ChannelSettingsPanelProps {
  conversationId: string
  isOpen: boolean
  onClose: () => void
  onDelete?: () => void
}

export function ChannelSettingsPanel({
  conversationId,
  isOpen,
  onClose,
  onDelete,
}: ChannelSettingsPanelProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { t } = useTranslation()

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await apiFetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description }),
      })

      if (!response.ok) throw new Error('Failed to update')
      alert(t('messages.saved'))
    } catch (error) {
      console.error(error)
      alert(t('messages.failedToSave'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (confirm(t('messages.confirmDeleteConversation'))) {
      onDelete?.()
    }
  }

  return (
    <div className="animate-in slide-in-from-right fixed inset-0 z-50 flex w-full flex-col border-l border-gray-200 bg-white shadow-xl duration-300 sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('messages.settings')}</h2>
        <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-gray-100">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Basic Info */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('messages.basicInfo')}</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('messages.name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('messages.description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Encryption Status */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('messages.security')}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Lock className="h-4 w-4 text-green-600" />
            <span>{t('messages.e2e')}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">{t('messages.e2eDescription')}</p>
        </div>

        {/* Members (placeholder) */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('messages.members')}</h3>
          <p className="text-sm text-gray-500">{t('messages.memberManagementComingSoon')}</p>
        </div>

        {/* Danger Zone */}
        {onDelete && (
          <div className="border-t border-red-200 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-red-900">{t('messages.dangerZone')}</h3>
            <button
              onClick={handleDelete}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4" />
              {t('messages.deleteConversation')}
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSaving ? t('messages.saving') : t('messages.saveChanges')}
        </button>
      </div>
    </div>
  )
}
