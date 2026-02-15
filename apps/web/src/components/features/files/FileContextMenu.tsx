import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { useTranslation } from "react-i18next"

interface FileContextMenuProps {
    children: React.ReactNode
    itemId: string
    isFolder?: boolean
    onRename: (id: string) => void
    onDelete: (id: string) => void
    onMove: (id: string) => void
    onDownload: (id: string) => void
    userRole?: string | null
}

export function FileContextMenu({ children, itemId, isFolder, onRename, onDelete, onMove, onDownload, userRole }: FileContextMenuProps) {
    const { t } = useTranslation()
    const canManage = userRole !== 'member'

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem inset onClick={() => !isFolder && onDownload(itemId)}>
                    {t('files.actions.download')}
                </ContextMenuItem>
                {canManage && (
                    <>
                        <ContextMenuItem inset onClick={() => onRename(itemId)}>
                            {t('files.actions.rename')}
                        </ContextMenuItem>
                        <ContextMenuItem inset onClick={() => onMove(itemId)}>
                            {t('files.actions.move')}
                        </ContextMenuItem>
                    </>
                )}
                <ContextMenuSeparator />
                {canManage && (
                    <ContextMenuItem inset onClick={() => onDelete(itemId)} className="text-destructive">
                        {t('files.actions.delete')}
                    </ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    )
}
