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
    onDelete
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
                body: JSON.stringify({ name, description })
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
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{t('messages.settings')}</h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Info */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('messages.basicInfo')}</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('messages.name')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('messages.description')}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Encryption Status */}
                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('messages.security')}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Lock className="w-4 h-4 text-green-600" />
                        <span>{t('messages.e2e')}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {t('messages.e2eDescription')}
                    </p>
                </div>

                {/* Members (placeholder) */}
                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('messages.members')}</h3>
                    <p className="text-sm text-gray-500">{t('messages.memberManagementComingSoon')}</p>
                </div>

                {/* Danger Zone */}
                {onDelete && (
                    <div className="border-t border-red-200 pt-6">
                        <h3 className="text-sm font-semibold text-red-900 mb-3">{t('messages.dangerZone')}</h3>
                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
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
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isSaving ? t('messages.saving') : t('messages.saveChanges')}
                </button>
            </div>
        </div>
    )
}
