import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { Plus, Trash2, Activity, Edit2, Play, FileText, LayoutGrid, Loader } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WebhookModal } from '../modals/WebhookModal'
import { WebhookTestPanel } from '../../webhooks/WebhookTestPanel'
import { WebhookDeliveryLogs } from '../../webhooks/WebhookDeliveryLogs'
import { format } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
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

// Slack SVG Icon
const SlackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M26.5002 14.9996C27.8808 14.9996 29 13.8804 29 12.4998C29 11.1192 27.8807 10 26.5001 10C25.1194 10 24 11.1193 24 12.5V14.9996H26.5002ZM19.5 14.9996C20.8807 14.9996 22 13.8803 22 12.4996V5.5C22 4.11929 20.8807 3 19.5 3C18.1193 3 17 4.11929 17 5.5V12.4996C17 13.8803 18.1193 14.9996 19.5 14.9996Z"
      fill="#2EB67D"
    />
    <path
      d="M5.49979 17.0004C4.11919 17.0004 3 18.1196 3 19.5002C3 20.8808 4.1193 22 5.49989 22C6.8806 22 8 20.8807 8 19.5V17.0004H5.49979ZM12.5 17.0004C11.1193 17.0004 10 18.1197 10 19.5004V26.5C10 27.8807 11.1193 29 12.5 29C13.8807 29 15 27.8807 15 26.5V19.5004C15 18.1197 13.8807 17.0004 12.5 17.0004Z"
      fill="#E01E5A"
    />
    <path
      d="M17.0004 26.5002C17.0004 27.8808 18.1196 29 19.5002 29C20.8808 29 22 27.8807 22 26.5001C22 25.1194 20.8807 24 19.5 24L17.0004 24L17.0004 26.5002ZM17.0004 19.5C17.0004 20.8807 18.1197 22 19.5004 22L26.5 22C27.8807 22 29 20.8807 29 19.5C29 18.1193 27.8807 17 26.5 17L19.5004 17C18.1197 17 17.0004 18.1193 17.0004 19.5Z"
      fill="#ECB22E"
    />
    <path
      d="M14.9996 5.49979C14.9996 4.11919 13.8804 3 12.4998 3C11.1192 3 10 4.1193 10 5.49989C10 6.88061 11.1193 8 12.5 8L14.9996 8L14.9996 5.49979ZM14.9996 12.5C14.9996 11.1193 13.8803 10 12.4996 10L5.5 10C4.11929 10 3 11.1193 3 12.5C3 13.8807 4.11929 15 5.5 15L12.4996 15C13.8803 15 14.9996 13.8807 14.9996 12.5Z"
      fill="#36C5F0"
    />
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
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'pl' ? pl : enUS
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
      const res = await apiFetchJson<{ data: Webhook[] }>(
        `/api/webhooks?workspaceId=${workspace.id}`,
        {
          headers: { 'x-user-id': userId },
        }
      )
      return res.data || []
    },
    enabled: !!userId,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return
      await apiFetchJson(`/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', workspace.id] })
    },
  })

  const handleDelete = (id: string) => {
    if (confirm(t('settings.organization.integrations.delete_webhook_confirm'))) {
      deleteMutation.mutate(id)
    }
  }

  const getWebhookIcon = (type: string) => {
    switch (type) {
      case 'discord':
        return <DiscordIcon />
      case 'slack':
        return <SlackIcon />
      default:
        return <Activity className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--app-text-primary)]">
            {t('settings.organization.integrations.title')}
          </h3>
          <p className="text-sm text-[var(--app-text-muted)]">
            {t('settings.organization.integrations.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 active:translate-y-[1px]"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          {t('settings.organization.integrations.new_webhook_button')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader className="h-8 w-8 animate-spin text-[var(--app-accent)]" />
          <p className="text-sm text-[var(--app-text-muted)]">
            {t('settings.organization.integrations.loading_webhooks')}
          </p>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-[var(--app-bg-elevated)] px-4 py-16 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--app-bg-card)] shadow-inner">
            <LayoutGrid className="h-8 w-8 text-[var(--app-text-muted)]" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-[var(--app-text-primary)]">
            {t('settings.organization.integrations.no_integrations_title')}
          </h4>
          <p className="mb-8 max-w-sm text-sm leading-relaxed text-[var(--app-text-muted)]">
            {t('settings.organization.integrations.no_integrations_subtitle')}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--app-bg-card)] px-6 py-3 font-medium text-[var(--app-text-primary)] shadow-sm transition-all hover:bg-[var(--app-bg-page)] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {t('settings.organization.integrations.create_first_webhook_button')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={cn(
                'group/card rounded-2xl bg-[var(--app-bg-elevated)] p-5 shadow-sm transition-all hover:bg-[var(--app-bg-card)] hover:shadow-md',
                !webhook.isActive && 'opacity-50 grayscale'
              )}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--app-bg-card)] transition-transform group-hover/card:scale-110">
                    {getWebhookIcon(webhook.type)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[15px] font-semibold leading-none text-[var(--app-text-primary)]">
                        {webhook.description ||
                          t('settings.organization.integrations.untitled_webhook')}
                      </h4>
                      {webhook.silentMode && (
                        <span className="rounded bg-[var(--app-bg-card)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                          {t('settings.organization.integrations.silent_badge')}
                        </span>
                      )}
                    </div>
                    <div
                      className="scrollbar-hide max-w-full overflow-x-auto rounded bg-[var(--app-bg-card)] px-2 py-1 text-xs text-[var(--app-text-muted)]"
                      title={webhook.url}
                    >
                      <span className="whitespace-nowrap font-mono">{webhook.url}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 transition-opacity sm:opacity-0 sm:group-hover/card:opacity-100">
                  <button
                    onClick={() => setTestWebhookId(webhook.id)}
                    className="hover:bg-[var(--app-accent)]/10 rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-accent)]"
                    title={t('settings.organization.integrations.test_title')}
                  >
                    <Play className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={() => setLogsWebhookId(webhook.id)}
                    className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
                    title={t('settings.organization.integrations.logs_title')}
                  >
                    <FileText className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWebhook(webhook)
                      setIsCreateOpen(true)
                    }}
                    className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
                    title={t('common.edit')}
                  >
                    <Edit2 className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="rounded-lg p-2 text-[var(--app-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </div>

              <div className="bg-[var(--app-border)]/50 mb-4 mt-4 h-px" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                    {t('settings.organization.integrations.all_events_header')}
                  </span>
                  {webhook.events.slice(0, 3).map((event: string) => (
                    <span
                      key={event}
                      className="rounded-lg bg-[var(--app-bg-card)] px-2.5 py-1 text-[10px] font-bold text-[var(--app-text-secondary)]"
                    >
                      {event}
                    </span>
                  ))}
                  {webhook.events.length > 3 && (
                    <div className="group/events relative">
                      <span className="cursor-pointer rounded-lg bg-[var(--app-bg-card)] px-2.5 py-1 text-[10px] font-bold text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-page)]">
                        +{webhook.events.length - 3}
                      </span>
                      <div className="absolute bottom-full left-0 z-50 mb-2 hidden group-hover/events:block">
                        <div className="animate-in fade-in slide-in-from-bottom-1 min-w-[160px] rounded-xl bg-[var(--app-bg-elevated)] p-2 shadow-2xl duration-200">
                          <div className="flex flex-col gap-1">
                            {webhook.events.slice(3).map((event: string) => (
                              <span
                                key={event}
                                className="rounded-lg bg-[var(--app-bg-card)] px-2 py-1 text-[10px] text-[var(--app-text-secondary)]"
                              >
                                {event}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-3 whitespace-nowrap text-[11px] text-[var(--app-text-muted)]">
                  {webhook.failureCount > 0 && (
                    <div className="flex items-center gap-1.5 font-medium text-red-500">
                      <Activity className="h-3.5 w-3.5" />
                      <span>
                        {webhook.failureCount === 1
                          ? t('settings.organization.integrations.fails_stat_one', { count: 1 })
                          : t('settings.organization.integrations.fails_stat_other', {
                              count: webhook.failureCount,
                            })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <ClockIcon />
                    <span>
                      {t('settings.organization.integrations.created_at_stat', {
                        date: format(new Date(webhook.createdAt), 'd MMM yyyy', {
                          locale: dateLocale,
                        }),
                      })}
                    </span>
                  </div>
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
        <WebhookTestPanel webhookId={testWebhookId} onClose={() => setTestWebhookId(null)} />
      )}

      {logsWebhookId && (
        <WebhookDeliveryLogs webhookId={logsWebhookId} onClose={() => setLogsWebhookId(null)} />
      )}
    </div>
  )
}
