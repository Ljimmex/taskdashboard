import { X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardPanelShellProps {
  children: React.ReactNode
  isEditing?: boolean
  onRemove?: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDragging?: boolean
}

export function DashboardPanelShell({
  children,
  isEditing,
  onRemove,
  dragHandleProps,
  isDragging,
}: DashboardPanelShellProps) {
  return (
    <div
      className={cn(
        'relative transition-shadow',
        isDragging && 'ring-[var(--app-accent)]/50 z-50 opacity-90 shadow-2xl ring-2',
        isEditing && 'ring-dashed ring-[var(--app-accent)]/30 rounded-2xl ring-1'
      )}
    >
      {isEditing && (
        <div className="absolute -top-3 left-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-1 py-0.5 shadow-sm">
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </div>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-[var(--app-text-muted)] transition-colors hover:text-red-500"
              title="Usuń panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
