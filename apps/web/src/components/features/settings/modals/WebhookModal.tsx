import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { X, AlertCircle, Check } from 'lucide-react'

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
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setType('discord')}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${type === 'discord'
                                    ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                Discord
                            </button>
                            <button
                                onClick={() => setType('slack')}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${type === 'slack'
                                    ? 'bg-[#4A154B]/20 border-[#4A154B] text-[#E01E5A]' // Slack colorsish
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                Slack
                            </button>
                            <button
                                onClick={() => setType('generic')}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${type === 'generic'
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                    : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                Inny (Generic)
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
