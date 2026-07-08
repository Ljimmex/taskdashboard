import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Download,
  Trash2,
  Pencil,
  Folder,
  Calendar,
  HardDrive,
  FileType,
  Hash,
  Users,
} from 'lucide-react'
import { FileRecord } from '@taskdashboard/types'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { pl, enUS } from 'date-fns/locale'

interface FileInfoPanelProps {
  file: FileRecord | null
  isOpen: boolean
  onClose: () => void
  onDownload?: (id: string) => void
  onDelete?: (id: string) => void
  onRename?: (id: string) => void
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📗'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦'
  return '📄'
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '-'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function FileInfoPanel({
  file,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onRename,
}: FileInfoPanelProps) {
  const { t, i18n } = useTranslation()
  const currentLocale = i18n.language === 'pl' ? pl : enUS
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const getFriendlyFileType = (
    mimeType: string | null,
    fileType: string | null | undefined
  ): string => {
    if (fileType) {
      return fileType.toUpperCase()
    }
    if (!mimeType) return t('files.types.unknown')

    // Common mime type mappings
    const mimeMap: Record<string, string> = {
      // PDF
      'application/pdf': t('files.types.pdf'),

      // Word Documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        t('files.types.word'),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
        t('files.types.word'), // Reuse word
      'application/msword': t('files.types.word'),
      'application/vnd.ms-word.document.macroEnabled.12': t('files.types.word'),

      // Excel Spreadsheets
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': t('files.types.excel'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template':
        t('files.types.excel'), // Reuse excel
      'application/vnd.ms-excel': t('files.types.excel'),
      'application/vnd.ms-excel.sheet.macroEnabled.12': t('files.types.excel'),

      // PowerPoint Presentations
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        t('files.types.powerpoint'),
      'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
        t('files.types.powerpoint'),
      'application/vnd.openxmlformats-officedocument.presentationml.template':
        t('files.types.powerpoint'),
      'application/vnd.ms-powerpoint': t('files.types.powerpoint'),
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12': t('files.types.powerpoint'),

      // Archives
      'application/zip': t('files.types.zip'),
      'application/x-rar-compressed': t('files.types.rar'),
      'application/x-7z-compressed': t('files.types.7z'),
      'application/gzip': t('files.types.gzip'),
      'application/x-tar': t('files.types.tar'),

      // Code/Text
      'application/json': t('files.types.json'),
      'text/plain': t('files.types.text'),
      'text/html': t('files.types.html'),
      'text/css': t('files.types.css'),
      'text/javascript': t('files.types.javascript'),
      'application/javascript': t('files.types.javascript'),
      'text/typescript': t('files.types.typescript'),
      'text/xml': t('files.types.xml'),
      'application/xml': t('files.types.xml'),
    }

    if (mimeMap[mimeType]) return mimeMap[mimeType]

    // Fallback: extract subtype and format nicely
    if (mimeType.startsWith('image/'))
      return `${t('files.types.image')} (${mimeType.split('/')[1].toUpperCase()})`
    if (mimeType.startsWith('video/'))
      return `${t('files.types.video')} (${mimeType.split('/')[1].toUpperCase()})`
    if (mimeType.startsWith('audio/'))
      return `${t('files.types.audio')} (${mimeType.split('/')[1].toUpperCase()})`

    const subtype = mimeType.split('/')[1]
    return subtype ? subtype.toUpperCase() : t('files.types.unknown')
  }

  if (!isOpen || !file) return null

  const isImage = file.mimeType?.startsWith('image/')

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'} `}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none border border-white/5 bg-[var(--app-bg-card)] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'} `}
      >
        {/* Header */}
        <div className="flex flex-none items-center justify-between border-b border-white/5 p-6">
          <h2 className="text-lg font-bold text-[var(--app-text-primary)]">
            {t('files.properties.details')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Preview Thumbnail */}
          <div className="bg-[var(--app-bg-elevated)]/50 flex aspect-video items-center justify-center rounded-none border border-[var(--app-divider)] sm:rounded-xl">
            {isImage && file.thumbnailUrl ? (
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            ) : (
              <span className="text-5xl opacity-50 grayscale filter">
                {getFileIcon(file.mimeType)}
              </span>
            )}
          </div>

          {/* File Name */}
          <div>
            <h3 className="break-words text-xl font-semibold text-[var(--app-text-primary)]">
              {file.name}
            </h3>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              {getFriendlyFileType(file.mimeType, file.fileType)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {onDownload && (
              <button
                onClick={() => onDownload(file.id)}
                className="flex flex-1 items-center justify-center gap-2 rounded-none bg-[var(--app-accent)] px-4 py-2.5 font-medium text-white shadow-sm transition-all hover:opacity-90 sm:rounded-xl"
              >
                <Download size={18} />
                {t('files.actions.download')}
              </button>
            )}
            {onRename && (
              <button
                onClick={() => onRename(file.id)}
                className="rounded-none border border-[var(--app-divider)] bg-[var(--app-bg-elevated)] p-2.5 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)] sm:rounded-xl"
                title={t('files.actions.rename')}
              >
                <Pencil size={18} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(file.id)}
                className="rounded-none border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-500 transition-colors hover:bg-amber-500/20 sm:rounded-xl"
                title={t('files.actions.delete')}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* File Properties */}
          <div className="space-y-3 border-t border-white/5 pt-4">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
              {t('files.properties.section_title')}
            </h4>

            <div className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2 text-[var(--app-text-muted)]">
                <HardDrive size={14} className="opacity-70" />
                <span>{t('files.properties.size')}</span>
              </div>
              <span className="font-medium text-[var(--app-text-primary)]">
                {formatFileSize(file.size)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2 text-[var(--app-text-muted)]">
                <FileType size={14} className="opacity-70" />
                <span>{t('files.properties.type')}</span>
              </div>
              <span className="font-medium text-[var(--app-text-primary)]">
                {getFriendlyFileType(file.mimeType, file.fileType)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2 text-[var(--app-text-muted)]">
                <Calendar size={14} className="opacity-70" />
                <span>{t('files.properties.created')}</span>
              </div>
              <span className="font-medium text-[var(--app-text-primary)]">
                {format(new Date(file.createdAt), 'dd.MM.yyyy', { locale: currentLocale })}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2 text-[var(--app-text-muted)]">
                <Folder size={14} className="opacity-70" />
                <span>{t('files.properties.location')}</span>
              </div>
              <span className="font-medium text-[var(--app-text-primary)]">
                {file.folderId ? t('files.messages.in_folder') : t('files.messages.root')}
              </span>
            </div>

            {file.teamId && (
              <div className="flex items-center justify-between py-1 text-sm">
                <div className="flex items-center gap-2 text-[var(--app-text-muted)]">
                  <Users size={14} className="opacity-70" />
                  <span>{t('files.properties.team')}</span>
                </div>
                <span className="font-mono text-xs font-medium text-[var(--app-text-primary)]">
                  {file.teamId.slice(0, 12)}...
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2 text-[var(--app-text-muted)]">
                <Hash size={14} className="opacity-70" />
                <span>{t('files.properties.id')}</span>
              </div>
              <span className="font-mono text-xs text-[var(--app-text-muted)]">
                {file.id.slice(0, 12)}...
              </span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
