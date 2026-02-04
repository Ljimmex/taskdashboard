import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { Plus, Trash2, Edit2, Activity, MessageSquare, AlertCircle, Smartphone } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { WebhookModal } from '../modals/WebhookModal'
import { WebhookTestPanel } from '../../webhooks/WebhookTestPanel'
import { WebhookDeliveryLogs } from '../../webhooks/WebhookDeliveryLogs'
import { Play, FileText } from 'lucide-react'

// Types
interface Webhook {
    id: string
    url: string
    type: 'generic' | 'discord' | 'slack'
    events: string[]
    isActive: boolean
    silentMode: boolean
    description: string
    failureCount: number
    createdAt: string
}

interface IntegrationsTabProps {
    workspace: any
}

// Icons map
const TYPE_Icons = {
    generic: <Activity className="w-5 h-5 text-gray-400" />,
    discord: <MessageSquare className="w-5 h-5 text-[#5865F2]" />, // Discord Color
    slack: <Smartphone className="w-5 h-5 text-[#E01E5A]" /> // Slack Color
}

export function IntegrationsTab({ workspace }: IntegrationsTabProps) {
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
    const [testWebhookId, setTestWebhookId] = useState<string | null>(null)
    const [logsWebhookId, setLogsWebhookId] = useState<string | null>(null)

    const userId = session?.user?.id

    // Fetch webhooks
    const { data: webhooks = [], isLoading } = useQuery({
        queryKey: ['webhooks', workspace.id],
        queryFn: async () => {
            if (!userId) return []
            const res = await apiFetchJson<{ data: Webhook[] }>(`/api/webhooks?workspaceId=${workspace.id}`, {
                headers: { 'x-user-id': userId }
            })
            return res.data || []
        },
        enabled: !!userId
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!userId) return
            await apiFetchJson(`/api/webhooks/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': userId }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks', workspace.id] })
        }
    })

    // Toggle Active mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            if (!userId) return
            await apiFetchJson(`/api/webhooks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive }),
                headers: { 'x-user-id': userId }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks', workspace.id] })
        }
    })

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this webhook?')) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Integrations & Webhooks</h3>
                    <p className="text-sm text-gray-400">Manage external integrations and webhook events</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Webhook
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl bg-[#1a1a24]/50">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-6 h-6 text-gray-500" />
                    </div>
                    <h4 className="text-white font-medium mb-1">No integrations yet</h4>
                    <p className="text-gray-500 text-sm mb-4">Connect your workspace with external tools like Discord or Slack.</p>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="text-amber-500 hover:text-amber-400 text-sm font-medium"
                    >
                        Create your first webhook
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {webhooks.map((webhook) => (
                        <div
                            key={webhook.id}
                            className={`bg-[#1a1a24] border border-gray-800 rounded-xl p-4 transition-all hover:border-gray-700 ${!webhook.isActive && 'opacity-75 grayscale'}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-lg">
                                        {TYPE_Icons[webhook.type] || TYPE_Icons.generic}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-white font-medium">{webhook.description || 'Untitled Webhook'}</h4>
                                            {webhook.silentMode && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700">
                                                    Silent
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <code className="text-xs bg-[#0f0f14] px-1.5 py-0.5 rounded text-gray-400 max-w-[200px] truncate block">
                                                {webhook.url}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setTestWebhookId(webhook.id)}
                                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-amber-400 transition-colors"
                                        title="Przetestuj"
                                    >
                                        <Play className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setLogsWebhookId(webhook.id)}
                                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
                                        title="Logi"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 bg-gray-800 mx-1" />
                                    <button
                                        onClick={() => toggleActiveMutation.mutate({ id: webhook.id, isActive: !webhook.isActive })}
                                        className={`w-8 h-5 rounded-full relative transition-colors ${webhook.isActive ? 'bg-green-500/20' : 'bg-gray-700'}`}
                                        title={webhook.isActive ? 'Active' : 'Paused'}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 rounded-full transition-transform ${webhook.isActive ? 'bg-green-500 translate-x-3' : 'bg-gray-400'}`} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedWebhook(webhook)
                                            setIsCreateOpen(true)
                                        }}
                                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-800 mt-3">
                                <div className="flex gap-2">
                                    {webhook.events.slice(0, 3).map(event => (
                                        <span key={event} className="px-2 py-1 rounded-md bg-gray-800 text-xs text-gray-400">
                                            {event}
                                        </span>
                                    ))}
                                    {webhook.events.length > 3 && (
                                        <span className="px-2 py-1 rounded-md bg-gray-800 text-xs text-gray-500">
                                            +{webhook.events.length - 3}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <AlertCircle className={`w-3 h-3 ${webhook.failureCount > 0 ? 'text-red-400' : 'text-gray-600'}`} />
                                        <span>{webhook.failureCount} fails</span>
                                    </div>
                                    <span>Created {format(new Date(webhook.createdAt), 'd MMM yyyy', { locale: pl })}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <WebhookModal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false)
                    setSelectedWebhook(null)
                }}
                webhook={selectedWebhook}
            />

            {testWebhookId && (
                <WebhookTestPanel
                    webhookId={testWebhookId}
                    onClose={() => setTestWebhookId(null)}
                />
            )}

            {logsWebhookId && (
                <WebhookDeliveryLogs
                    webhookId={logsWebhookId}
                    onClose={() => setLogsWebhookId(null)}
                />
            )}
        </div>
    )
}
