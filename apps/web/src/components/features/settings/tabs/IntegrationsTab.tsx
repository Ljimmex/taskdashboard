import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { Plus, Trash2, Smartphone, Activity, Edit2, Play, FileText } from 'lucide-react'
import { WebhookModal } from '../modals/WebhookModal'
import { WebhookTestPanel } from '../../webhooks/WebhookTestPanel'
import { WebhookDeliveryLogs } from '../../webhooks/WebhookDeliveryLogs'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useSession } from '@/lib/auth'

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

// Discord SVG Icon
const DiscordIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
    </svg>
)

// Clock Icon for stats
const ClockIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
    </svg>
)

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

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this webhook?')) {
            deleteMutation.mutate(id)
        }
    }

    const getWebhookIcon = (type: string) => {
        switch (type) {
            case 'discord':
                return <DiscordIcon />
            case 'slack':
                return <Smartphone className="w-5 h-5 text-white" />
            default:
                return <Activity className="w-5 h-5 text-gray-400" />
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Integrations & Webhooks</h3>
                    <p className="text-sm text-gray-500">Manage external integrations and webhook events</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    New Webhook
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-[#1a1f2e]">
                    <div className="w-12 h-12 bg-[#2d3548] rounded-lg flex items-center justify-center mx-auto mb-4">
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
                <div className="flex flex-col gap-3">
                    {webhooks.map((webhook) => (
                        <div
                            key={webhook.id}
                            className={`bg-[#1a1f2e] rounded-xl p-4 transition-all hover:bg-[#1f2937] ${!webhook.isActive ? 'opacity-60' : ''}`}
                        >
                            {/* Top Row */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-[#2d3548] flex items-center justify-center flex-shrink-0">
                                        {getWebhookIcon(webhook.type)}
                                    </div>

                                    {/* Title + URL */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-white text-[15px]">
                                                {webhook.description || 'Untitled Webhook'}
                                            </h4>
                                            {webhook.silentMode && (
                                                <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-400 text-[11px] font-medium">
                                                    Silent
                                                </span>
                                            )}
                                        </div>
                                        <code className="text-gray-500 text-xs font-mono mt-1 block">
                                            {webhook.url.length > 30 ? webhook.url.slice(0, 30) + '...' : webhook.url}
                                        </code>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setTestWebhookId(webhook.id)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                                        title="Test"
                                    >
                                        <Play className="w-[18px] h-[18px]" />
                                    </button>
                                    <button
                                        onClick={() => setLogsWebhookId(webhook.id)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                                        title="Logs"
                                    >
                                        <FileText className="w-[18px] h-[18px]" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedWebhook(webhook)
                                            setIsCreateOpen(true)
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-[18px] h-[18px]" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-[18px] h-[18px]" />
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Row - Events and Info */}
                            <div className="flex justify-between items-center gap-4 mt-3">
                                {/* Event Tags */}
                                <div className="flex items-center gap-1.5 flex-shrink min-w-0">
                                    {webhook.events.slice(0, 2).map((event: string) => (
                                        <span key={event} className="px-2 py-1 rounded-md bg-gray-700 text-gray-300 text-[11px] font-medium whitespace-nowrap">
                                            {event}
                                        </span>
                                    ))}
                                    {webhook.events.length > 2 && (
                                        <div className="relative group">
                                            <span className="px-2 py-1 rounded-md bg-gray-700 text-gray-400 text-[11px] font-medium cursor-pointer hover:bg-gray-600 transition-colors">
                                                +{webhook.events.length - 2}
                                            </span>
                                            {/* Hover Dropdown */}
                                            <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50">
                                                <div className="bg-[#1f2937] rounded-lg p-2 shadow-xl min-w-[160px]">
                                                    <p className="text-[10px] text-gray-500 mb-1.5 font-medium">All events:</p>
                                                    <div className="flex flex-col gap-1">
                                                        {webhook.events.slice(2).map((event: string) => (
                                                            <span key={event} className="px-2 py-1 rounded bg-gray-700 text-gray-300 text-[10px]">
                                                                {event}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <ClockIcon />
                                        <span>{webhook.failureCount} fails</span>
                                    </div>
                                    <span className="whitespace-nowrap">Created {format(new Date(webhook.createdAt), 'd MMM yyyy', { locale: pl })}</span>
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
