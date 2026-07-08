import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { X, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'

interface WebhookTestPanelProps {
  webhookId: string
  onClose: () => void
}

export function WebhookTestPanel({ webhookId, onClose }: WebhookTestPanelProps) {
  const { data: session } = useSession()
  const { t } = useTranslation()
  const userId = session?.user?.id
  const [response, setResponse] = useState<any>(null)

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('Unauthorized: User not found')
      }
      const res = await apiFetchJson<{ success: boolean; message: string; error?: string }>(
        `/api/webhooks/${webhookId}/test`,
        {
          method: 'POST',
          headers: { 'x-user-id': userId },
        }
      )
      if (!res.success) throw new Error(res.error)
      return res
    },
    onSuccess: (data) => {
      setResponse({
        success: true,
        data,
      })
    },
    onError: (error: any) => {
      setResponse({
        success: false,
        error: error.message || 'Unknown error',
      })
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-800 bg-[#1a1a24] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Play className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('settings.organization.integrations.test_panel.title')}
              </h2>
              <p className="text-sm text-gray-400">
                {t('settings.organization.integrations.test_panel.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 text-sm text-gray-400">
            <Trans
              i18nKey="settings.organization.integrations.test_panel.description"
              components={[
                <code className="rounded bg-gray-800 px-1 py-0.5 text-amber-400" key="0" />,
              ]}
            />
          </div>

          <div className="mb-6 rounded-lg border border-gray-800 bg-[#0f0f14] p-4">
            <div className="mb-2 font-mono text-xs text-gray-500">
              {t('settings.organization.integrations.test_panel.payload_preview')}
            </div>
            <pre className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent max-h-40 overflow-auto font-mono text-xs text-gray-300">
              {JSON.stringify(
                {
                  event: 'webhook.test',
                  timestamp: new Date().toISOString(),
                  payload: {
                    id: 'test-123',
                    message: 'Hello World!',
                    status: 'success',
                  },
                },
                null,
                2
              )}
            </pre>
          </div>

          {response && (
            <div
              className={`mb-6 rounded-lg border p-4 ${response.success ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}`}
            >
              <div className="flex items-start gap-3">
                {response.success ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                )}
                <div>
                  <h4
                    className={`text-sm font-medium ${response.success ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {response.success
                      ? t('settings.organization.integrations.test_panel.success_title')
                      : t('settings.organization.integrations.test_panel.error_title')}
                  </h4>
                  <p
                    className={`mt-1 text-xs ${response.success ? 'text-green-400/80' : 'text-red-400/80'}`}
                  >
                    {response.success
                      ? response.data.message || JSON.stringify(response.data)
                      : response.error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 font-medium text-gray-400 transition-colors hover:text-white"
            >
              {t('settings.organization.integrations.test_panel.close')}
            </button>
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2 font-medium text-black transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('settings.organization.integrations.test_panel.sending')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {t('settings.organization.integrations.test_panel.send_test')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
