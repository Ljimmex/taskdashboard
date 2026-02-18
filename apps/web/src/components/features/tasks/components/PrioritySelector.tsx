import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { apiFetchJson } from '@/lib/api'
import { cn } from '../../../../lib/utils'
import {
    PriorityUrgentIcon,
    PriorityHighIcon,
    PriorityMediumIcon,
    PriorityLowIcon,
} from './TaskIcons'

interface Priority {
    id: string
    name: string
    color: string
    icon?: string
    position: number
}

interface PrioritySelectorProps {
    value: string
    onChange: (priority: string) => void
    disabled?: boolean
    size?: 'sm' | 'md'
    className?: string
}

// Icon mapping based on priority ID
const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
    'urgent': PriorityUrgentIcon,
    'high': PriorityHighIcon,
    'medium': PriorityMediumIcon,
    'low': PriorityLowIcon,
}

// Fallback priorities with icons
const DEFAULT_PRIORITIES: Priority[] = [
    { id: 'low', name: 'Low', color: '#6b7280', position: 0 },
    { id: 'medium', name: 'Medium', color: '#3b82f6', position: 1 },
    { id: 'high', name: 'High', color: '#f59e0b', position: 2 },
    { id: 'urgent', name: 'Urgent', color: '#ef4444', position: 3 },
]

export function PrioritySelector({
    value,
    onChange,
    disabled = false,
    size = 'md',
    className,
}: PrioritySelectorProps) {
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug?: string }
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Fetch workspace to get priorities
    const { data: workspace } = useQuery({
        queryKey: ['workspace', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return null
            const res = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
            return res
        },
        enabled: !!workspaceSlug
    })

    const priorities: Priority[] = workspace?.priorities || DEFAULT_PRIORITIES
    const sortedPriorities = [...priorities].sort((a, b) => a.position - b.position)
    const selected = sortedPriorities.find(p => p.id === value) || sortedPriorities[1]

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
    const SelectedIcon = ICON_MAP[selected.id] || PriorityMediumIcon

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'flex items-center rounded-lg font-medium transition-all',
                    sizeStyles,
                    'bg-gray-800/50 hover:bg-gray-800',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
                style={{ color: selected.color }}
            >
                <SelectedIcon size={iconSize} />
                <span>{selected.name}</span>
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
                    {sortedPriorities.map(priority => {
                        const Icon = ICON_MAP[priority.id] || PriorityMediumIcon
                        return (
                            <button
                                key={priority.id}
                                onClick={() => {
                                    onChange(priority.id)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors flex items-center gap-2.5',
                                    value === priority.id ? 'bg-gray-800/50' : ''
                                )}
                            >
                                <Icon size={18} />
                                <span style={{ color: priority.color }}>{priority.name}</span>
                                {value === priority.id && (
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
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// Compact badge variant (display only)
export function PriorityBadge({ priority, size = 'sm' }: { priority: string; size?: 'sm' | 'md' }) {
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug?: string }

    const { data: workspace } = useQuery({
        queryKey: ['workspace', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return null
            const res = await apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`)
            return res
        },
        enabled: !!workspaceSlug
    })

    const priorities: Priority[] = workspace?.priorities || DEFAULT_PRIORITIES
    const config = priorities.find(p => p.id === priority) || priorities[1]
    const Icon = ICON_MAP[config.id] || PriorityMediumIcon

    const sizeStyles = size === 'sm'
        ? 'px-2 py-0.5 text-[10px] gap-1'
        : 'px-2.5 py-1 text-xs gap-1.5'

    const iconSize = size === 'sm' ? 12 : 14

    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-full bg-gray-800/50',
                sizeStyles
            )}
            style={{ color: config.color }}
        >
            <Icon size={iconSize} />
            {config.name}
        </span>
    )
}

