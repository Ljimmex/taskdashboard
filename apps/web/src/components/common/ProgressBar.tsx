import { cn } from '../../lib/utils'

interface ProgressBarProps {
    value: number // 0-100
    max?: number
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'success' | 'warning' | 'danger'
    showLabel?: boolean
    label?: string
    animated?: boolean
    className?: string
}

const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
}

const variantStyles = {
    default: 'bg-gradient-to-r from-[#F2CE88] to-[#d4b476]',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
    danger: 'bg-gradient-to-r from-red-500 to-red-400',
}

export function ProgressBar({
    value,
    max = 100,
    size = 'md',
    variant = 'default',
    showLabel = false,
    label,
    animated = true,
    className,
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    // Auto-select variant based on percentage
    const autoVariant = percentage >= 100 ? 'success' : percentage < 25 ? 'danger' : variant

    return (
        <div className={cn('w-full', className)}>
            {(showLabel || label) && (
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-400">
                        {label || 'Postęp'}
                    </span>
                    <span className="text-xs font-bold text-white">
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
            <div className={cn(
                'w-full bg-gray-800 rounded-full overflow-hidden',
                sizeStyles[size]
            )}>
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-500 ease-out',
                        variantStyles[autoVariant],
                        animated && 'animate-pulse-subtle'
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

// Subtask progress variant
interface SubtaskProgressProps {
    completed: number
    total: number
    className?: string
}

export function SubtaskProgress({ completed, total, className }: SubtaskProgressProps) {
    if (total === 0) return null

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <ProgressBar
                value={completed}
                max={total}
                size="sm"
                showLabel={false}
                className="flex-1"
            />
            <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap">
                {completed}/{total}
            </span>
        </div>
    )
}
