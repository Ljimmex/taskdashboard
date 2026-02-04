import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { X, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface WebhookDeliveryLogsProps {
    webhookId: string
    onClose: () => void
}

interface DeliveryLog {
    id: string
    event: string
    payload: any
    responseStatus: number
    responseBody: string
    durationMs: number
    createdAt: string
    attemptIndex: number
}

export function WebhookDeliveryLogs({ webhookId, onClose }: WebhookDeliveryLogsProps) {
    const { data: session } = useSession()
    const userId = session?.user?.id

    // Fetch logs
    const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['webhook-logs', webhookId],
        queryFn: async () => {
            if (!userId) return []
            const res = await apiFetchJson<{ data: DeliveryLog[] }>(`/api/webhooks/${webhookId}/deliveries`, {
                headers: { 'x-user-id': userId }
            })
            return res.data || []
        },
        refetchInterval: 5000, // Poll every 5s
        enabled: !!userId
    })

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a24] rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-800 flex flex-col h-[80vh]">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white">Logi dostarczeń</h2>
                        <p className="text-sm text-gray-400">Historia ostatnich 50 prób dostarczenia</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            disabled={isRefetching}
                            className={`p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors ${isRefetching ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Ładowanie logów...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center">
                                <Clock className="w-8 h-8 text-gray-600" />
                            </div>
                            <p>Brak historii dostarczeń dla tego webhooka</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#12121a] sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Zdarzenie</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Odpowiedź</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Czas</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {logs.map((log) => {
                                    const isSuccess = log.responseStatus >= 200 && log.responseStatus < 300
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {isSuccess ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                                    )}
                                                    <span className={`text-sm font-medium ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                                                        {log.responseStatus || 'ERR'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-300 font-mono border border-gray-700">
                                                    {log.event}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs truncate text-xs text-gray-400 font-mono" title={log.responseBody}>
                                                    {log.responseBody || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {log.durationMs}ms
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-right">
                                                {format(new Date(log.createdAt), 'd MMM HH:mm:ss', { locale: pl })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
