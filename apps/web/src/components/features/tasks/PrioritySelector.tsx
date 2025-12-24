import { useState, useRef, useEffect } from 'react'
import { cn } from '../../../lib/utils'
import {
    PriorityUrgentIcon,
    PriorityHighIcon,
    PriorityMediumIcon,
    PriorityLowIcon,
} from './TaskIcons'

type Priority = 'urgent' | 'high' | 'medium' | 'low'

interface PrioritySelectorProps {
    value: Priority
    onChange: (priority: Priority) => void
    disabled?: boolean
    size?: 'sm' | 'md'
    className?: string
}

const PRIORITIES: { value: Priority; label: string; Icon: React.FC<{ size?: number }>; color: string; bg: string }[] = [
    { value: 'urgent', label: 'Pilne', Icon: PriorityUrgentIcon, color: 'text-red-400', bg: 'bg-red-500/20 hover:bg-red-500/30' },
    { value: 'high', label: 'Wysoki', Icon: PriorityHighIcon, color: 'text-orange-400', bg: 'bg-orange-500/20 hover:bg-orange-500/30' },
    { value: 'medium', label: 'Średni', Icon: PriorityMediumIcon, color: 'text-amber-400', bg: 'bg-amber-500/20 hover:bg-amber-500/30' },
    { value: 'low', label: 'Niski', Icon: PriorityLowIcon, color: 'text-blue-400', bg: 'bg-blue-500/20 hover:bg-blue-500/30' },
]

export function PrioritySelector({
    value,
    onChange,
    disabled = false,
    size = 'md',
    className,
}: PrioritySelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const selected = PRIORITIES.find(p => p.value === value) || PRIORITIES[2]

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const sizeStyles = size === 'sm'
        ? 'px-2 py-1 text-xs gap-1.5'
        : 'px-3 py-2 text-sm gap-2'

    const iconSize = size === 'sm' ? 14 : 16

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'flex items-center rounded-lg font-medium transition-all',
                    sizeStyles,
                    selected.bg,
                    selected.color,
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <selected.Icon size={iconSize} />
                <span>{selected.label}</span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={cn('transition-transform', isOpen && 'rotate-180')}
                >
                    <path d="M6 9L12 15L18 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-44 bg-[#1a1a24] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {PRIORITIES.map(priority => (
                        <button
                            key={priority.value}
                            onClick={() => {
                                onChange(priority.value)
                                setIsOpen(false)
                            }}
                            className={cn(
                                'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors flex items-center gap-2.5',
                                value === priority.value ? 'bg-gray-800/50' : ''
                            )}
                        >
                            <priority.Icon size={18} />
                            <span className={priority.color}>{priority.label}</span>
                            {value === priority.value && (
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="ml-auto text-[#F2CE88]"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// Compact badge variant (display only)
export function PriorityBadge({ priority, size = 'sm' }: { priority: Priority; size?: 'sm' | 'md' }) {
    const config = PRIORITIES.find(p => p.value === priority) || PRIORITIES[2]

    const sizeStyles = size === 'sm'
        ? 'px-2 py-0.5 text-[10px] gap-1'
        : 'px-2.5 py-1 text-xs gap-1.5'

    const iconSize = size === 'sm' ? 12 : 14

    return (
        <span className={cn(
            'inline-flex items-center font-medium rounded-full',
            sizeStyles,
            config.bg.replace('hover:bg-', ''),
            config.color
        )}>
            <config.Icon size={iconSize} />
            {config.label}
        </span>
    )
}
