import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"

interface FileContextMenuProps {
    children: React.ReactNode
    itemId: string
    isFolder?: boolean
    onRename: (id: string) => void
    onDelete: (id: string) => void
    onMove: (id: string) => void
    onDownload: (id: string) => void
}

export function FileContextMenu({ children, itemId, isFolder, onRename, onDelete, onMove, onDownload }: FileContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-64">
                <ContextMenuItem inset onClick={() => !isFolder && onDownload(itemId)}>
                    Download
                </ContextMenuItem>
                <ContextMenuItem inset onClick={() => onRename(itemId)}>
                    Rename
                </ContextMenuItem>
                <ContextMenuItem inset onClick={() => onMove(itemId)}>
                    Move to...
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem inset onClick={() => onDelete(itemId)} className="text-destructive">
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
