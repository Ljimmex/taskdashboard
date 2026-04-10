import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"
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

export function FileContextMenu({ children, itemId, isFolder, onRename, onDelete, onMove, onDownload, onInfo, onArchive, onDuplicate, onOpen, userRole }: FileContextMenuProps) {
    const { t } = useTranslation()
    const canManage = userRole !== 'member'

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-48 bg-[var(--app-bg-card)] border-[var(--app-divider)] p-1 shadow-2xl">
                {/* Open / Preview (everyone) */}
                {!isFolder && onOpen && (
                    <ContextMenuItem onClick={() => onOpen(itemId)} className="flex items-center gap-3 px-3 py-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-md cursor-pointer transition-colors">
                        <Eye className="h-4 w-4 text-[var(--app-accent)]" />
                        <span>{t('files.actions.open', 'Open')}</span>
                    </ContextMenuItem>
                )}

                {/* Download (everyone) */}
                <ContextMenuItem onClick={() => onDownload(itemId)} className="flex items-center gap-3 px-3 py-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-md cursor-pointer transition-colors">
                    <Download className="h-4 w-4 text-[var(--app-text-muted)]" />
                    <span>{t('files.actions.download')}</span>
                </ContextMenuItem>

                {/* Info (everyone) */}
                {onInfo && (
                    <ContextMenuItem onClick={() => onInfo(itemId)} className="flex items-center gap-3 px-3 py-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-md cursor-pointer transition-colors">
                        <Info className="h-4 w-4 text-[var(--app-text-muted)]" />
                        <span>{t('files.actions.info')}</span>
                    </ContextMenuItem>
                )}

                <ContextMenuSeparator className="bg-[var(--app-divider)] my-1" />

                {/* Management actions (admin/owner only) */}
                {canManage && (
                    <>
                        <ContextMenuItem onClick={() => onRename(itemId)} className="flex items-center gap-3 px-3 py-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-md cursor-pointer transition-colors">
                            <Pencil className="h-4 w-4 text-[var(--app-accent)]/80" />
                            <span>{t('files.actions.rename')}</span>
                        </ContextMenuItem>

                        {!isFolder && onDuplicate && (
                            <ContextMenuItem onClick={() => onDuplicate(itemId)} className="flex items-center gap-3 px-3 py-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-md cursor-pointer transition-colors">
                                <Copy className="h-4 w-4 text-[var(--app-text-muted)]" />
                                <span>{t('files.actions.duplicate')}</span>
                            </ContextMenuItem>
                        )}

                        <ContextMenuItem onClick={() => onMove(itemId)} className="flex items-center gap-3 px-3 py-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-md cursor-pointer transition-colors">
                            <FolderOpen className="h-4 w-4 text-[var(--app-text-muted)]" />
                            <span>{t('files.actions.move')}</span>
                        </ContextMenuItem>

                        {!isFolder && onArchive && (
                            <ContextMenuItem onClick={() => onArchive(itemId)} className="flex items-center gap-3 px-3 py-2 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-elevated)] rounded-md cursor-pointer transition-colors">
                                <Archive className="h-4 w-4 text-[var(--app-text-muted)]" />
                                <span>{t('files.actions.archive')}</span>
                            </ContextMenuItem>
                        )}

                        <ContextMenuSeparator className="bg-[var(--app-border)]/50 my-1" />

                        <ContextMenuItem onClick={() => onDelete(itemId)} className="flex items-center gap-3 px-3 py-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-md cursor-pointer transition-colors">
                            <Trash2 className="h-4 w-4" />
                            <span>{t('files.actions.delete')}</span>
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    )
}
