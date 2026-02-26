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
            <ContextMenuContent className="w-48 bg-[#1a1a24] border-gray-800 p-1">
                {/* Open / Preview (everyone) */}
                {!isFolder && onOpen && (
                    <ContextMenuItem onClick={() => onOpen(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                        <Eye className="h-4 w-4 text-blue-400" />
                        <span>{t('files.actions.open', 'Open')}</span>
                    </ContextMenuItem>
                )}

                {/* Download (everyone) */}
                {!isFolder && (
                    <ContextMenuItem onClick={() => onDownload(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                        <Download className="h-4 w-4 text-gray-400" />
                        <span>{t('files.actions.download')}</span>
                    </ContextMenuItem>
                )}

                {/* Info (everyone) */}
                {onInfo && (
                    <ContextMenuItem onClick={() => onInfo(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                        <Info className="h-4 w-4 text-gray-400" />
                        <span>{t('files.actions.info')}</span>
                    </ContextMenuItem>
                )}

                <ContextMenuSeparator className="bg-gray-800" />

                {/* Management actions (admin/owner only) */}
                {canManage && (
                    <>
                        <ContextMenuItem onClick={() => onRename(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                            <Pencil className="h-4 w-4 text-amber-500" />
                            <span>{t('files.actions.rename')}</span>
                        </ContextMenuItem>

                        {!isFolder && onDuplicate && (
                            <ContextMenuItem onClick={() => onDuplicate(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                <Copy className="h-4 w-4 text-gray-400" />
                                <span>{t('files.actions.duplicate')}</span>
                            </ContextMenuItem>
                        )}

                        <ContextMenuItem onClick={() => onMove(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                            <FolderOpen className="h-4 w-4 text-gray-400" />
                            <span>{t('files.actions.move')}</span>
                        </ContextMenuItem>

                        {!isFolder && onArchive && (
                            <ContextMenuItem onClick={() => onArchive(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                                <Archive className="h-4 w-4 text-gray-400" />
                                <span>{t('files.actions.archive')}</span>
                            </ContextMenuItem>
                        )}

                        <ContextMenuSeparator className="bg-gray-800" />

                        <ContextMenuItem onClick={() => onDelete(itemId)} className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md cursor-pointer">
                            <Trash2 className="h-4 w-4 text-amber-600" />
                            <span>{t('files.actions.delete')}</span>
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
        </ContextMenu>
    )
}
