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
        if (!mimeType) return <FileText className="w-4 h-4 text-gray-400" />
        if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-400" />
        if (mimeType.startsWith('video/')) return <Film className="w-4 h-4 text-purple-400" />
        if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4 text-pink-400" />
        return <FileText className="w-4 h-4 text-gray-400" />
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div className="rounded-2xl bg-[#12121a] p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">{t('dashboard.lastResources')}</h3>
                <button
                    onClick={onSeeAll}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                    {t('dashboard.seeAll')}
                </button>
            </div>

            {/* Files List */}
            <div className="space-y-3">
                {files.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                        {t('dashboard.noFiles')}
                    </div>
                ) : (
                    files.slice(0, 5).map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-3 group cursor-pointer hover:bg-[#1a1a24] p-2 rounded-xl transition-colors -mx-2"
                            onClick={() => onFileClick?.(file.id)}
                        >
                            {/* Icon Container */}
                            <div className="w-10 h-10 rounded-xl bg-[#1a1a24] group-hover:bg-[#20202b] flex items-center justify-center flex-shrink-0 transition-colors">
                                {getFileIcon(file.mimeType)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-200 truncate group-hover:text-amber-400 transition-colors">
                                    {file.name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
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
