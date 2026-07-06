import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'

function formatStorageSize(bytes: number): string {
    if (bytes <= 0) return '0 GB'
    const gb = bytes / 1024 / 1024 / 1024
    if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(0)} MB`
}

interface StorageQuotaProps {
    workspaceId?: string
}

export function StorageQuota({ workspaceId }: StorageQuotaProps) {
    const { t } = useTranslation()
    const { data: session } = useSession()

    const { data, isLoading } = useQuery({
        queryKey: ['files', 'quota', workspaceId],
        queryFn: async () => {
            if (!workspaceId) return null
            const json = await apiFetchJson<any>(`/api/files/quota?workspaceId=${workspaceId}`, {
                headers: { 'x-user-id': session?.user?.id || '' }
            })
            return json.data as { usedBytes: number; maxStorageGB: number }
        },
        enabled: !!workspaceId && !!session?.user?.id,
        staleTime: 60 * 1000
    })

    const maxBytes = (data?.maxStorageGB ?? 0) * 1024 * 1024 * 1024
    const usedBytes = data?.usedBytes ?? 0
    const percentage = maxBytes > 0 ? Math.min((usedBytes / maxBytes) * 100, 100) : 0
    const isReady = !!data && !isLoading

    return (
        <div className="px-4 pb-2">
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] uppercase tracking-widest text-[var(--app-text-muted)] font-bold">
                    {t('dashboard.storage')}
                </span>
                <span className="text-[10px] font-medium text-[var(--app-text-secondary)]">
                    {isReady
                        ? t('dashboard.storageOf', {
                            used: formatStorageSize(usedBytes),
                            total: `${data.maxStorageGB} GB`
                        })
                        : '— / —'}
                </span>
            </div>
            <div className="h-1.5 w-full bg-[var(--app-bg-elevated)] rounded-full overflow-hidden">
                <div
                    className="h-full bg-[var(--app-accent)] rounded-full shadow-[0_0_8px_rgba(242,206,136,0.3)] transition-all duration-500"
                    style={{ width: isReady ? `${percentage}%` : '0%' }}
                />
            </div>
        </div>
    )
}
