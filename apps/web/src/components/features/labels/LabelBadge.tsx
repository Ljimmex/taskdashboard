export interface Label {
    id: string
    name: string
    color: string
}

interface LabelBadgeProps {
    label: Label
    size?: 'sm' | 'md'
    onRemove?: () => void
    className?: string
}

export const LabelBadge = ({ label, size = 'sm', onRemove, className = '' }: LabelBadgeProps) => {
    const sizeClasses = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1'
    }

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md font-medium ${sizeClasses[size]} ${className}`}
            style={{
                backgroundColor: `${label.color}20`,
                color: label.color
            }}
        >
            <span className="truncate max-w-[120px]">{label.name}</span>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                    aria-label={`Remove ${label.name}`}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            )}
        </span>
    )
}
