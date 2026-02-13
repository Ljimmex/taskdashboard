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
    onSuccess
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
                    isPrivate
                })
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">{t('messages.createConversation')}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('messages.name')} *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Team General"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('messages.description')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder={t('messages.descriptionPlaceholder')}
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('messages.type')}
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
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
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {t('messages.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || !name.trim()}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isCreating ? t('messages.creating') : t('messages.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
