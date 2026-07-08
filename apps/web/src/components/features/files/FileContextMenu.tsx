import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useTranslation } from 'react-i18next'
import { Eye, Pencil, Copy, FolderOpen, Archive, Info, Download, Trash2 } from 'lucide-react'

interface FileContextMenuProps {
  children: React.ReactNode
  itemId: string
  isFolder?: boolean
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string) => void
  onDownload: (id: string) => void
  onInfo?: (id: string) => void
  onArchive?: (id: string) => void
  onDuplicate?: (id: string) => void
  onOpen?: (id: string) => void
  userRole?: string | null
}

export function FileContextMenu({
  children,
  itemId,
  isFolder,
  onRename,
  onDelete,
  onMove,
  onDownload,
  onInfo,
  onArchive,
  onDuplicate,
  onOpen,
  userRole,
}: FileContextMenuProps) {
  const { t } = useTranslation()
  const canManage = userRole !== 'member'

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 border-[var(--app-divider)] bg-[var(--app-bg-card)] p-1 shadow-2xl">
        {/* Open / Preview (everyone) */}
        {!isFolder && onOpen && (
          <ContextMenuItem
            onClick={() => onOpen(itemId)}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <Eye className="h-4 w-4 text-[var(--app-accent)]" />
            <span>{t('files.actions.open', 'Open')}</span>
          </ContextMenuItem>
        )}

        {/* Download (everyone) */}
        <ContextMenuItem
          onClick={() => onDownload(itemId)}
          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
        >
          <Download className="h-4 w-4 text-[var(--app-text-muted)]" />
          <span>{t('files.actions.download')}</span>
        </ContextMenuItem>

        {/* Info (everyone) */}
        {onInfo && (
          <ContextMenuItem
            onClick={() => onInfo(itemId)}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
          >
            <Info className="h-4 w-4 text-[var(--app-text-muted)]" />
            <span>{t('files.actions.info')}</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator className="my-1 bg-[var(--app-divider)]" />

        {/* Management actions (admin/owner only) */}
        {canManage && (
          <>
            <ContextMenuItem
              onClick={() => onRename(itemId)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              <Pencil className="text-[var(--app-accent)]/80 h-4 w-4" />
              <span>{t('files.actions.rename')}</span>
            </ContextMenuItem>

            {!isFolder && onDuplicate && (
              <ContextMenuItem
                onClick={() => onDuplicate(itemId)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
              >
                <Copy className="h-4 w-4 text-[var(--app-text-muted)]" />
                <span>{t('files.actions.duplicate')}</span>
              </ContextMenuItem>
            )}

            <ContextMenuItem
              onClick={() => onMove(itemId)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
            >
              <FolderOpen className="h-4 w-4 text-[var(--app-text-muted)]" />
              <span>{t('files.actions.move')}</span>
            </ContextMenuItem>

            {!isFolder && onArchive && (
              <ContextMenuItem
                onClick={() => onArchive(itemId)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
              >
                <Archive className="h-4 w-4 text-[var(--app-text-muted)]" />
                <span>{t('files.actions.archive')}</span>
              </ContextMenuItem>
            )}

            <ContextMenuSeparator className="bg-[var(--app-border)]/50 my-1" />

            <ContextMenuItem
              onClick={() => onDelete(itemId)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-amber-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t('files.actions.delete')}</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
