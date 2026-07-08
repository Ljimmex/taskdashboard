import { useState } from 'react'
import { X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useTranslation } from 'react-i18next'

interface CreateChannelModalProps {
  isOpen: boolean
  workspaceId: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateChannelModal({
  isOpen,
  workspaceId,
  onClose,
  onSuccess,
}: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'direct' | 'group' | 'channel'>('group')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { t } = useTranslation()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await apiFetch('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId,
          name,
          description,
          type,
          isPrivate,
        }),
      })

      if (!response.ok) throw new Error('Failed to create conversation')

      setName('')
      setDescription('')
      setType('group')
      setIsPrivate(false)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to create conversation:', error)
      alert(t('messages.failedToCreate'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 sm:items-center">
      <div className="mx-0 w-full max-w-md rounded-lg bg-white shadow-xl sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('messages.createConversation')}
          </h2>
          <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('messages.name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Team General"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('messages.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('messages.descriptionPlaceholder')}
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('messages.type')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="direct">{t('messages.directMessage')}</option>
              <option value="group">{t('messages.groupChat')}</option>
              <option value="channel">{t('messages.channel')}</option>
            </select>
          </div>

          {/* Privacy */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isPrivate" className="text-sm text-gray-700">
              {t('messages.private')}
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
            >
              {t('messages.cancel')}
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isCreating ? t('messages.creating') : t('messages.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
