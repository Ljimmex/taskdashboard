import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import { HardDrive } from 'lucide-react'
import type { DashboardPanelProps } from '@/lib/dashboard'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function StorageQuotaPanel({ workspaceSlug }: DashboardPanelProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug, session?.user?.id],
    queryFn: async () => {
      if (!workspaceSlug || !session?.user?.id) return null
      return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
        headers: { 'x-user-id': session.user.id },
      })
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
  })

  const workspaceId = workspaceData?.id

  const { data: quota, isLoading } = useQuery({
    queryKey: ['files-quota', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null
      const res = await apiFetchJson<{ data: { usedBytes: number; maxStorageGB: number } }>(
        `/api/files/quota?workspaceId=${workspaceId}`
      )
      return res?.data || null
    },
    enabled: !!workspaceId,
  })

  if (isLoading || !quota) {
    return (
      <div className="space-y-3">
        <div className="h-4 animate-pulse rounded bg-gray-800/20" />
        <div className="h-3 animate-pulse rounded bg-gray-800/20" />
      </div>
    )
  }

  const usedBytes = quota.usedBytes || 0
  const maxBytes = (quota.maxStorageGB || 0) * 1024 * 1024 * 1024
  const percent = maxBytes > 0 ? Math.min(100, Math.round((usedBytes / maxBytes) * 100)) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <HardDrive size={20} className="text-amber-500" />
        <div>
          <p className="text-sm font-medium text-[var(--app-text-primary)]">
            {formatBytes(usedBytes)} / {quota.maxStorageGB} GB
          </p>
          <p className="text-xs text-[var(--app-text-muted)]">
            {t('dashboard.storageOf', {
              used: formatBytes(usedBytes),
              total: `${quota.maxStorageGB} GB`,
            })}
          </p>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--app-bg-elevated)]">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-right text-xs text-[var(--app-text-muted)]">{percent}%</p>
    </div>
  )
}
