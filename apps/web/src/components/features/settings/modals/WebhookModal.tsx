import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { X, AlertCircle, Check } from 'lucide-react'

interface WebhookModalProps {
    isOpen: boolean
    onClose: () => void
    webhook?: any // If provided, edit mode
}

export function WebhookModal({ isOpen, onClose, webhook }: WebhookModalProps) {
    const { t } = useTranslation()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug?: string }
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const userId = session?.user?.id

    const [url, setUrl] = useState('')
    const [description, setDescription] = useState('')
    const [selectedEvents, setSelectedEvents] = useState<string[]>([])
    const [silentMode, setSilentMode] = useState(false)
    const [type, setType] = useState<'generic' | 'discord' | 'slack'>('generic')
    const [error, setError] = useState('')

    const EVENT_GROUPS = useMemo(() => [
        {
            title: t('settings.organization.integrations.webhook_modal.groups.tasks'),
            items: [
                { id: 'task.created', label: t('settings.organization.integrations.webhook_modal.events.task_created') },
                { id: 'task.updated', label: t('settings.organization.integrations.webhook_modal.events.task_updated') },
                { id: 'task.status_changed', label: t('settings.organization.integrations.webhook_modal.events.task_status_changed') },
                { id: 'task.priority_changed', label: t('settings.organization.integrations.webhook_modal.events.task_priority_changed') },
                { id: 'task.assigned', label: t('settings.organization.integrations.webhook_modal.events.task_assigned') },
                { id: 'task.due_date_changed', label: t('settings.organization.integrations.webhook_modal.events.task_due_date_changed') },
                { id: 'task.deleted', label: t('settings.organization.integrations.webhook_modal.events.task_deleted') },
            ]
        },
        {
            title: t('settings.organization.integrations.webhook_modal.groups.subtasks'),
            items: [
                { id: 'subtask.created', label: t('settings.organization.integrations.webhook_modal.events.subtask_created') },
                { id: 'subtask.updated', label: t('settings.organization.integrations.webhook_modal.events.subtask_updated') },
                { id: 'subtask.completed', label: t('settings.organization.integrations.webhook_modal.events.subtask_completed') },
            ]
        },
        {
            title: t('settings.organization.integrations.webhook_modal.groups.comments'),
            items: [
                { id: 'comment.added', label: t('settings.organization.integrations.webhook_modal.events.comment_added') },
            ]
        },
        {
            title: t('settings.organization.integrations.webhook_modal.groups.files'),
            items: [
                { id: 'file.uploaded', label: t('settings.organization.integrations.webhook_modal.events.file_uploaded') },
                { id: 'file.deleted', label: t('settings.organization.integrations.webhook_modal.events.file_deleted') },
            ]
        },
        {
            title: t('settings.organization.integrations.webhook_modal.groups.calendar'),
            items: [
                { id: 'calendar.created', label: t('settings.organization.integrations.webhook_modal.events.calendar_created') },
                { id: 'calendar.updated', label: t('settings.organization.integrations.webhook_modal.events.calendar_updated') },
                { id: 'calendar.deleted', label: t('settings.organization.integrations.webhook_modal.events.calendar_deleted') },
            ]
        },
        {
            title: t('settings.organization.integrations.webhook_modal.groups.members'),
            items: [
                { id: 'member.added', label: t('settings.organization.integrations.webhook_modal.events.member_added') },
                { id: 'member.removed', label: t('settings.organization.integrations.webhook_modal.events.member_removed') },
            ]
        }
    ], [t])

    // Initialize state when webhook prop changes
    useEffect(() => {
        if (webhook) {
            setUrl(webhook.url)
            setDescription(webhook.description || '')
            setSelectedEvents(webhook.events || [])
            setSilentMode(webhook.silentMode || false)
            setType(webhook.type)
        } else {
            setUrl('')
            setDescription('')
            setSelectedEvents([])
            setSilentMode(false)
            setType('discord') // Default to Discord as it's most common
        }
    }, [webhook, isOpen])

    // Auto-detect type based on URL (only if user hasn't manually selected or just as a helper)
    useEffect(() => {
        if (!webhook && url) {
            if (url.includes('discord.com/api/webhooks') && type !== 'discord') setType('discord')
            else if (url.includes('hooks.slack.com') && type !== 'slack') setType('slack')
        }
    }, [url, webhook])

    // Mutations
    const mutation = useMutation({
        mutationFn: async (data: any) => {
            if (!userId) {
                throw new Error('Unauthorized: User not found')
            }

            // Re-fetching workspace by slug to get ID
            const workspaceRes = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
            const workspaceId = workspaceRes.id

            if (webhook) {
                // Update
                await apiFetchJson(`/api/webhooks/${webhook.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(data),
                    headers: { 'x-user-id': userId }
                })
            } else {
                // Create
                await apiFetchJson(`/api/webhooks`, {
                    method: 'POST',
                    body: JSON.stringify({
                        ...data,
                        workspaceId, // Required for creation
                        secret: 'ignore-for-discord'
                    }),
                    headers: { 'x-user-id': userId }
                })
            }
        },
        onSuccess: () => {
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            onClose()
        },
        onError: (err: any) => {
            setError(err.message || t('settings.organization.integrations.webhook_modal.error_saving'))
        }
    })

    const handleSubmit = () => {
        if (!url) {
            setError(t('settings.organization.integrations.webhook_modal.error_url_required'))
            return
        }
        if (selectedEvents.length === 0) {
            setError(t('settings.organization.integrations.webhook_modal.error_no_events'))
            return
        }

        mutation.mutate({
            url,
            description,
            events: selectedEvents,
            type,
            silentMode: type === 'discord' ? silentMode : false, // Only send silentMode for Discord
            isActive: true
        })
    }

    // Icons
    const DiscordIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
        </svg>
    )

    const SlackIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 15a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-5z" />
            <path d="M9 6a2 2 0 0 1-2-2a2 2 0 0 1 2-2a2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5z" />
            <path d="M18 9a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2V9zm-1 0a2 2 0 0 1-2 2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5z" />
            <path d="M15 18a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-5z" />
        </svg>
    )

    const GenericIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#12121a] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-800/50 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-[#14141b] rounded-t-2xl">
                    <h2 className="text-xl font-bold text-white">
                        {webhook ? t('settings.organization.integrations.webhook_modal.edit_webhook') : t('settings.organization.integrations.webhook_modal.add_webhook')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Platform Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.organization.integrations.webhook_modal.platform')}</label>
                        <div className="flex bg-[#1a1a24] p-1 rounded-full w-full border border-gray-800/50">
                            <button
                                onClick={() => setType('discord')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all",
                                    type === 'discord'
                                        ? "bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10"
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                <div className="scale-75 origin-center">
                                    <DiscordIcon />
                                </div>
                                Discord
                            </button>

                            <button
                                onClick={() => setType('slack')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all",
                                    type === 'slack'
                                        ? "bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10"
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                <div className="scale-75 origin-center">
                                    <SlackIcon />
                                </div>
                                Slack
                            </button>

                            <button
                                onClick={() => setType('generic')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all",
                                    type === 'generic'
                                        ? "bg-[#F2CE88] text-[#0a0a0f] shadow-lg shadow-amber-500/10"
                                        : "text-gray-500 hover:text-white"
                                )}
                            >
                                <div className="scale-75 origin-center">
                                    <GenericIcon />
                                </div>
                                {t('settings.organization.integrations.webhook_modal.other')}
                            </button>
                        </div>
                    </div>

                    {/* URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.organization.integrations.webhook_modal.url_label')}</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder={
                                type === 'discord' ? "https://discord.com/api/webhooks/..." :
                                    type === 'slack' ? "https://hooks.slack.com/services/..." :
                                        "https://example.com/webhook"
                            }
                            className="w-full bg-[#1a1a24] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500/50 focus:bg-[#1f1f2e] focus:outline-none transition-all font-mono text-sm"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            {t('settings.organization.integrations.webhook_modal.description_label')} <span className="text-gray-600 font-normal">({t('settings.organization.integrations.webhook_modal.optional')})</span>
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={
                                type === 'discord' ? t('settings.organization.integrations.webhook_modal.description_placeholder_discord') :
                                    type === 'slack' ? t('settings.organization.integrations.webhook_modal.description_placeholder_slack') :
                                        t('settings.organization.integrations.webhook_modal.description_placeholder_generic')
                            }
                            className="w-full bg-[#1a1a24] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500/50 focus:bg-[#1f1f2e] focus:outline-none transition-all"
                        />
                    </div>

                    {/* Silent Mode */}
                    {type === 'discord' && (
                        <label className="flex items-center gap-3 p-4 bg-[#1a1a24] rounded-xl border border-gray-800 cursor-pointer hover:bg-[#1f1f2e] transition-colors group">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={silentMode}
                                    onChange={(e) => setSilentMode(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${silentMode
                                    ? 'bg-amber-500 border-amber-500 text-black'
                                    : 'bg-transparent border-gray-600 group-hover:border-gray-500'
                                    }`}>
                                    {silentMode && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-white group-hover:text-amber-500 transition-colors">{t('settings.organization.integrations.webhook_modal.silent_mode_title')}</span>
                                <span className="text-xs text-gray-500">{t('settings.organization.integrations.webhook_modal.silent_mode_description')}</span>
                            </div>
                        </label>
                    )}

                    {/* Events Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.organization.integrations.webhook_modal.events_label')}</label>
                        <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-2 max-h-[280px] overflow-y-auto custom-scrollbar">
                            {EVENT_GROUPS.map(group => (
                                <div key={group.title} className="mb-2 last:mb-0">
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 py-2">
                                        {group.title}
                                    </h3>
                                    <div className="space-y-0.5">
                                        {group.items.map(event => {
                                            const isSelected = selectedEvents.includes(event.id)
                                            return (
                                                <label
                                                    key={event.id}
                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${isSelected
                                                        ? 'bg-amber-500/10'
                                                        : 'hover:bg-white/5'
                                                        }`}
                                                >
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedEvents([...selectedEvents, event.id])
                                                                } else {
                                                                    setSelectedEvents(selectedEvents.filter(id => id !== event.id))
                                                                }
                                                            }}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-amber-500 border-amber-500 text-black'
                                                            : 'bg-transparent border-gray-600'
                                                            }`}>
                                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}>
                                                        {event.label}
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-800 flex justify-end gap-3 bg-[#14141b]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-colors text-sm"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:translate-y-[1px] text-black font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.3)] text-sm"
                    >
                        {mutation.isPending ? t('common.saving') : t('common.save')}
                    </button>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #374151;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #4b5563;
                }
            `}</style>
        </div>
    )
}
