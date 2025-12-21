// Shared utility for generating consistent colors based on status string
export const getStatusColor = (status: string): { bg: string; text: string } => {
    const colors = [
        { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
        { bg: 'bg-amber-500/10', text: 'text-amber-400' },
        { bg: 'bg-purple-500/10', text: 'text-purple-400' },
        { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
        { bg: 'bg-blue-500/10', text: 'text-blue-400' },
        { bg: 'bg-pink-500/10', text: 'text-pink-400' },
        { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    ]

    let hash = 0
    for (let i = 0; i < status.length; i++) {
        hash = status.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
}

// Format status for display (e.g., "zakupy_materiałów" -> "Zakupy Materiałów")
export const formatStatusLabel = (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Shared StatusBadge component
interface StatusBadgeProps {
    status: string
    className?: string
}

export const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
    const label = formatStatusLabel(status)
    const { bg, text } = getStatusColor(status)

    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${bg} ${text} ${className}`}>
            {label}
        </span>
    )
}
