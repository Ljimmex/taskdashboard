import { FileRecord } from '@taskdashboard/types'
import { useTranslation } from 'react-i18next'
import { FileText, Image, Film, Music } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface LastResourcesProps {
  files: FileRecord[]
  onSeeAll?: () => void
  onFileClick?: (fileId: string) => void
}

export function LastResources({ files, onSeeAll, onFileClick }: LastResourcesProps) {
  const { t } = useTranslation()
  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="h-4 w-4 text-gray-400" />
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-400" />
    if (mimeType.startsWith('video/')) return <Film className="h-4 w-4 text-purple-400" />
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-pink-400" />
    return <FileText className="h-4 w-4 text-gray-400" />
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-5 transition-all duration-300">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--app-text-primary)]">
          {t('dashboard.lastResources')}
        </h3>
        <button
          onClick={onSeeAll}
          className="text-xs text-amber-400 transition-colors hover:text-amber-300"
        >
          {t('dashboard.seeAll')}
        </button>
      </div>

      {/* Files List */}
      <div className="space-y-3">
        {files.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">{t('dashboard.noFiles')}</div>
        ) : (
          files.slice(0, 5).map((file) => (
            <div
              key={file.id}
              className="group -mx-2 flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[var(--app-bg-elevated)]"
              onClick={() => onFileClick?.(file.id)}
            >
              {/* Icon Container */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] transition-colors group-hover:bg-[var(--app-bg-card)]">
                {getFileIcon(file.mimeType)}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-medium text-[var(--app-text-primary)] transition-colors group-hover:text-amber-500">
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-[var(--app-text-secondary)]">
                  <span>{formatSize(file.size || 0)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
