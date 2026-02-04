import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { X, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface WebhookTestPanelProps {
    webhookId: string
    onClose: () => void
}

export function WebhookTestPanel({ webhookId, onClose }: WebhookTestPanelProps) {
    const [response, setResponse] = useState<any>(null)

    const testMutation = useMutation({
        mutationFn: async () => {
            return await apiFetchJson(`/api/workspaces/dummy/webhooks/${webhookId}/test`, {
                method: 'POST'
            })
        },
        onSuccess: (data) => {
            setResponse({
                success: true,
                data
            })
        },
        onError: (error: any) => {
            setResponse({
                success: false,
                error: error.message || 'Unknown error'
            })
        }
    })

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a24] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-800 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Play className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Przetestuj Webhook</h2>
                            <p className="text-sm text-gray-400">Wyślij przykładowe zdarzenie</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-400 mb-6">
                        To narzędzie wyśle testowe zdarzenie <code>webhook.test</code> na skonfigurowany adres URL.
                        Pozwoli to zweryfikować czy Twój serwer poprawnie odbiera i przetwarza żądania.
                    </p>

                    <div className="bg-[#0f0f14] rounded-lg border border-gray-800 p-4 mb-6">
                        <div className="text-xs text-gray-500 mb-2 font-mono">PAYLOAD PREVIEW</div>
                        <pre className="text-xs text-gray-300 font-mono overflow-auto max-h-40 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {JSON.stringify({
                                event: "webhook.test",
                                timestamp: new Date().toISOString(),
                                payload: {
                                    id: "test-123",
                                    message: "Hello World!",
                                    status: "success"
                                }
                            }, null, 2)}
                        </pre>
                    </div>

                    {response && (
                        <div className={`p-4 rounded-lg border mb-6 ${response.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <div className="flex items-start gap-3">
                                {response.success ? (
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <h4 className={`text-sm font-medium ${response.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {response.success ? 'Wysłano pomyślnie' : 'Błąd wysyłania'}
                                    </h4>
                                    <p className={`text-xs mt-1 ${response.success ? 'text-green-400/80' : 'text-red-400/80'}`}>
                                        {response.success ? JSON.stringify(response.data) : response.error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
                        >
                            Zamknij
                        </button>
                        <button
                            onClick={() => testMutation.mutate()}
                            disabled={testMutation.isPending}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {testMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Wysyłanie...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    Wyślij test
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
