import { useState, useRef, useEffect } from 'react'
import { cn } from '../../../../lib/utils'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

interface StatusConfig {
    label: string
    color: string
    dotColor: string
    bgColor: string
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
    todo: {
        label: 'Do zrobienia',
        color: 'text-[#818cf8]',
        dotColor: 'bg-[#6366f1]',
        bgColor: 'bg-[#6366f1]/10',
    },
    in_progress: {
        label: 'W trakcie',
        color: 'text-[#fbbf24]',
        dotColor: 'bg-[#f59e0b]',
        bgColor: 'bg-[#f59e0b]/10',
    },
    review: {
        label: 'Do sprawdzenia',
        color: 'text-[#c084fc]',
        dotColor: 'bg-[#a855f7]',
        bgColor: 'bg-[#a855f7]/10',
    },
    done: {
        label: 'Zrobione',
        color: 'text-[#34d399]',
        dotColor: 'bg-[#10b981]',
        bgColor: 'bg-[#10b981]/10',
    },
}

export interface ProjectStage {
    id: string
    name: string
    color: string
    isFinal?: boolean
}

interface StatusBadgeProps {
    status: string
    stages?: ProjectStage[]
    className?: string
    size?: 'sm' | 'md'
}

export function StatusBadge({ status, stages, className, size = 'md' }: StatusBadgeProps) {
    const stage = stages?.find(s => s.id === status || s.name === status)

    const config = stage ? {
        label: stage.name,
        color: `text-[${stage.color}]`,
        dotColor: `bg-[${stage.color}]`,
        bgColor: `hover:bg-[${stage.color}]/10`,
        // Tailwind JIT workaround for dynamic colors if needed, but let's use style for safety
        style: { color: stage.color, backgroundColor: `${stage.color}1a` },
        dotStyle: { backgroundColor: stage.color }
    } : (STATUS_CONFIG[status] || {
        label: status,
        color: 'text-gray-400',
        dotColor: 'bg-gray-400',
        bgColor: 'bg-gray-400/10',
        style: {},
        dotStyle: {}
    }) as any

    const sizeStyles = {
        sm: 'px-2 py-0.5 text-[10px] gap-1.5',
        md: 'px-2.5 py-1 text-xs gap-2',
    }

    const dotSizes = {
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
    }

    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded-lg transition-colors',
                !stage && config.bgColor,
                !stage && config.color,
                sizeStyles[size],
                className
            )}
            style={stage ? config.style : {}}
        >
            <span
                className={cn('rounded-full', !stage && config.dotColor, dotSizes[size])}
                style={stage ? config.dotStyle : {}}
            />
            {config.label}
        </span>
    )
}

interface StatusSelectorProps {
    value: string
    onChange: (status: string) => void
    stages?: ProjectStage[]
    disabled?: boolean
    className?: string
}

export function StatusSelector({ value, onChange, stages, disabled, className }: StatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

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

    const stage = stages?.find(s => s.id === value || s.name === value)
    const current = stage ? { label: stage.name, dotColor: '', dotStyle: { backgroundColor: stage.color } } : (STATUS_CONFIG[value] || { label: value, dotColor: 'bg-gray-400', dotStyle: {} }) as any

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a24] border border-gray-800 hover:border-gray-700 transition-all text-sm font-medium',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <span className={cn('w-2 h-2 rounded-full', current.dotColor)} style={current.dotStyle} />
                <span className="text-white">{current.label}</span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={cn('ml-1 text-gray-500 transition-transform', isOpen && 'rotate-180')}
                >
                    <path d="M6 9L12 15L18 9" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a24] border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-1.5">
                    {stages ? (
                        stages.map((s) => {
                            const isSelected = value === s.id
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(s.id)
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                                        isSelected ? 'bg-gray-800 shadow-inner' : 'hover:bg-gray-800/50'
                                    )}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                                    <span className={cn(isSelected ? 'text-white' : 'text-gray-400')}>
                                        {s.name}
                                    </span>
                                    {isSelected && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                    )}
                                </button>
                            )
                        })
                    ) : (
                        (Object.keys(STATUS_CONFIG)).map((status) => {
                            const config = STATUS_CONFIG[status]
                            const isSelected = value === status
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                        onChange(status)
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium',
                                        isSelected ? 'bg-gray-800 shadow-inner' : 'hover:bg-gray-800/50'
                                    )}
                                >
                                    <span className={cn('w-2.5 h-2.5 rounded-full shadow-sm', config.dotColor)} />
                                    <span className={cn(
                                        isSelected ? 'text-white' : 'text-gray-400'
                                    )}>
                                        {config.label}
                                    </span>
                                    {isSelected && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
