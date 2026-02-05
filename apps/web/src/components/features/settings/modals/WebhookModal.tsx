import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { X, AlertCircle, Check, Webhook } from 'lucide-react'

interface WebhookModalProps {
    isOpen: boolean
    onClose: () => void
    webhook?: any // If provided, edit mode
}

const EVENT_OPTIONS = [
    // Tasks
    { id: 'task.created', label: 'Zadanie utworzone' },
    { id: 'task.updated', label: 'Zadanie zaktualizowane (tytuł, opis)' },
    { id: 'task.status_changed', label: 'Zmieniono status zadania' },
    { id: 'task.priority_changed', label: 'Zmieniono priorytet zadania' },
    { id: 'task.assigned', label: 'Przypisano użytkownika' },
    { id: 'task.due_date_changed', label: 'Zmieniono termin wykonania' },
    { id: 'task.deleted', label: 'Zadanie usunięte' },

    // Subtasks
    { id: 'subtask.created', label: 'Podzadanie utworzone' },
    { id: 'subtask.updated', label: 'Podzadanie zaktualizowane' },
    { id: 'subtask.completed', label: 'Podzadanie ukończone' },

    // Comments
    { id: 'comment.added', label: 'Dodano komentarz' },

    // Files
    { id: 'file.uploaded', label: 'Przesłano plik' },
    { id: 'file.deleted', label: 'Usunięto plik' },

    // Members
    { id: 'member.added', label: 'Dołączył nowy członek' },
    { id: 'member.removed', label: 'Usunięto członka' },
]

export function WebhookModal({ isOpen, onClose, webhook }: WebhookModalProps) {
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
            setError(err.message || 'Wystąpił błąd podczas zapisywania webhooka')
        }
    })

    const handleSubmit = () => {
        if (!url) {
            setError('URL jest wymagany')
            return
        }
        if (selectedEvents.length === 0) {
            setError('Wybierz przynajmniej jedno zdarzenie')
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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a24] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        {webhook ? 'Edytuj Webhook' : 'Dodaj Webhook'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Platform Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Platforma</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setType('discord')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${type === 'discord'
                                    ? 'bg-[#5865F2]/20 border-[#5865F2] text-white ring-1 ring-[#5865F2]/50'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800/50'
                                    }`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-2">
                                    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c.04.05.08.1.12.15c1.6 1.18 3.15 1.91 4.71 2.2c.03 0 .07-.01.08-.04c.36-.49.68-1.02.96-1.57c.02-.05-.03-.11-.08-.13a11.48 11.48 0 0 1-1.6-.77c-.06-.03-.06-.11 0-.16c.32-.23.63-.49.92-.75c.05-.05.12-.05.15 0c3.23 1.49 6.7 1.49 9.92 0c.04-.01.1 0 .15.06c.29.26.6.51.92.75c.06.05.06.13 0 .16a11.48 11.48 0 0 1-1.6.77c-.05.02-.1.08-.08.13c.27.55.6 1.08.96 1.57c.01.03.05.05.08.04c1.56-.29 3.11-1.02 4.71-2.2c.04-.05.08-.1.12-.15c.42-4.35-.61-8.31-3.1-11.95c-.01-.01-.02-.02-.03-.02ZM8.5 13.5c-.9 0-1.62-.83-1.62-1.83s.71-1.83 1.62-1.83s1.62.83 1.62 1.83s-.71 1.83-1.62 1.83ZM15.5 13.5c-.9 0-1.62-.83-1.62-1.83s.71-1.83 1.62-1.83s1.62.83 1.62 1.83s-.71 1.83-1.62 1.83Z" fill="#5865F2" />
                                </svg>
                                <span className="text-sm font-semibold">Discord</span>
                            </button>
                            <button
                                onClick={() => setType('slack')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${type === 'slack'
                                    ? 'bg-[#4A154B]/20 border-[#4A154B] text-white ring-1 ring-[#4A154B]/50'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800/50'
                                    }`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-2">
                                    <path d="M5.042 15.123a2.52 2.52 0 0 1-2.52 2.523 2.52 2.52 0 0 1-2.522-2.523 2.52 2.52 0 0 1 2.522-2.52h2.52v2.52Zm1.261 0a2.52 2.52 0 0 1 2.521-2.52 2.52 2.52 0 0 1 2.521 2.52v6.307a2.52 2.52 0 0 1-2.52 2.523 2.52 2.52 0 0 1-2.522-2.523v-6.307Zm3.782-5.042a2.52 2.52 0 0 1 2.52-2.522 2.52 2.52 0 0 1 2.522 2.522 2.52 2.52 0 0 1-2.522 2.52h-2.52v-2.52ZM8.823 8.82a2.52 2.52 0 0 1-2.52 2.522 2.52 2.52 0 0 1-2.522-2.522V2.513a2.52 2.52 0 0 1 2.522-2.523 2.52 2.52 0 0 1 2.52 2.523V8.82Zm6.307 2.52a2.52 2.52 0 0 1 2.52 2.523 2.52 2.52 0 0 1 2.522-2.523 2.52 2.52 0 0 1-2.522 2.52h-2.52v-2.52Zm-1.261 0a2.52 2.52 0 0 1-2.522 2.52 2.52 2.52 0 0 1-2.52-2.52V2.512a2.52 2.52 0 0 1 2.52-2.523 2.52 2.52 0 0 1 2.522 2.523v6.308Zm3.782 5.042a2.52 2.52 0 0 1-2.52 2.522 2.52 2.52 0 0 1-2.522-2.522 2.52 2.52 0 0 1 2.522-2.52h2.52v2.52Zm1.26 1.262a2.52 2.52 0 0 1 2.523 2.522 2.52 2.52 0 0 1-2.523 2.522h-6.306a2.52 2.52 0 0 1-2.522-2.522 2.52 2.52 0 0 1 2.522-2.522h6.307Z" fill="#E01E5A" />
                                </svg>
                                <span className="text-sm font-semibold">Slack</span>
                            </button>
                            <button
                                onClick={() => setType('generic')}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${type === 'generic'
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-500 ring-1 ring-amber-500/50'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800/50'
                                    }`}
                            >
                                <Webhook className="w-8 h-8 mb-2" />
                                <span className="text-sm font-semibold">Inny</span>
                            </button>
                        </div>
                    </div>

                    {/* URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Webhook URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder={
                                type === 'discord' ? "https://discord.com/api/webhooks/..." :
                                    type === 'slack' ? "https://hooks.slack.com/services/..." :
                                        "https://example.com/webhook"
                            }
                            className="w-full bg-[#0f0f14] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Opis (opcjonalne)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={
                                type === 'discord' ? "np. Powiadomienia Discord #general" :
                                    type === 'slack' ? "np. Slack #alerts" :
                                        "np. Integracja z CRM"
                            }
                            className="w-full bg-[#0f0f14] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Silent Mode */}
                    {type === 'discord' && (
                        <label className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-800 cursor-pointer hover:border-gray-700 transition-colors">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={silentMode}
                                    onChange={(e) => setSilentMode(e.target.checked)}
                                    className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${silentMode
                                    ? 'bg-amber-500 border-amber-500 text-black'
                                    : 'bg-gray-800 border-gray-600'
                                    }`}>
                                    {silentMode && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-white">Tryb cichy (@silent)</span>
                                <span className="text-xs text-gray-400">Wiadomości nie będą wysyłać powiadomień push</span>
                            </div>
                        </label>
                    )}

                    {/* Events Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Zdarzenia</label>
                        <div className="grid grid-cols-1 gap-2">
                            {EVENT_OPTIONS.map(event => (
                                <label
                                    key={event.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedEvents.includes(event.id)
                                        ? 'bg-amber-500/10 border-amber-500/50'
                                        : 'bg-gray-800/30 border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedEvents.includes(event.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedEvents([...selectedEvents, event.id])
                                                } else {
                                                    setSelectedEvents(selectedEvents.filter(id => id !== event.id))
                                                }
                                            }}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedEvents.includes(event.id)
                                            ? 'bg-amber-500 border-amber-500 text-black'
                                            : 'bg-gray-800 border-gray-600'
                                            }`}>
                                            {selectedEvents.includes(event.id) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                    <span className={`text-sm font-medium ${selectedEvents.includes(event.id) ? 'text-amber-500' : 'text-gray-300'}`}>
                                        {event.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {mutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
                    </button>
                </div>
            </div>
        </div>
    )
}
