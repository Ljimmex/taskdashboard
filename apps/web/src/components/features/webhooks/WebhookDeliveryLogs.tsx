import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { X, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

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
  const { t, i18n } = useTranslation()

  const dateLocale = i18n.language === 'pl' ? pl : enUS

  // Fetch logs
  const {
    data: logs = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['webhook-logs', webhookId],
    queryFn: async () => {
      if (!userId) return []
      const res = await apiFetchJson<{ data: DeliveryLog[] }>(
        `/api/webhooks/${webhookId}/deliveries`,
        {
          headers: { 'x-user-id': userId },
        }
      )
      return res.data || []
    },
    refetchInterval: 5000, // Poll every 5s
    enabled: !!userId,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-2xl border border-gray-800 bg-[#1a1a24] shadow-2xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-800 p-6">
          <div>
            <h2 className="text-lg font-bold text-white">
              {t('settings.organization.integrations.delivery_logs.title')}
            </h2>
            <p className="text-sm text-gray-400">
              {t('settings.organization.integrations.delivery_logs.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className={`rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white ${isRefetching ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              {t('settings.organization.integrations.delivery_logs.loading')}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-500">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/50">
                <Clock className="h-8 w-8 text-gray-600" />
              </div>
              <p>{t('settings.organization.integrations.delivery_logs.empty')}</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[#12121a]">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('settings.organization.integrations.delivery_logs.table.status')}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('settings.organization.integrations.delivery_logs.table.event')}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('settings.organization.integrations.delivery_logs.table.response')}
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('settings.organization.integrations.delivery_logs.table.time')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    {t('settings.organization.integrations.delivery_logs.table.date')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => {
                  const isSuccess = log.responseStatus >= 200 && log.responseStatus < 300
                  return (
                    <tr key={log.id} className="group transition-colors hover:bg-gray-800/30">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isSuccess ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={`text-sm font-medium ${isSuccess ? 'text-green-500' : 'text-red-500'}`}
                          >
                            {log.responseStatus || 'ERR'}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded border border-gray-700 bg-gray-800 px-2 py-1 font-mono text-xs text-gray-300">
                          {log.event}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="max-w-xs truncate font-mono text-xs text-gray-400"
                          title={log.responseBody}
                        >
                          {log.responseBody || '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                        {log.durationMs}ms
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-400">
                        {format(new Date(log.createdAt), 'd MMM HH:mm:ss', { locale: dateLocale })}
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
