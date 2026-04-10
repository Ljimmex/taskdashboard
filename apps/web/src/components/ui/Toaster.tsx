import { useToastStore, ToastType } from '../../hooks/useToast'
import { X } from 'lucide-react'

const SuccessIcon = () => (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="shrink-0">
        <rect x="4" y="4" width="24" height="24" rx="8" fill="var(--app-accent)" opacity="0.15" />
        <rect x="8" y="8" width="16" height="16" rx="6" fill="var(--app-accent)" opacity="0.3" />
        <path d="M11 16L14 19L21 12" stroke="var(--app-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const ErrorIcon = () => (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="shrink-0">
        <rect x="4" y="4" width="24" height="24" rx="8" fill="#f43f5e" opacity="0.15" />
        <rect x="8" y="8" width="16" height="16" rx="6" fill="#f43f5e" opacity="0.3" />
        <path d="M12 12L20 20M20 12L12 20" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const InfoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="shrink-0">
        <rect x="4" y="4" width="24" height="24" rx="8" fill="var(--app-accent)" opacity="0.15" />
        <rect x="8" y="8" width="16" height="16" rx="6" fill="var(--app-accent)" opacity="0.3" />
        <path d="M16 11V16M16 21H16.01" stroke="var(--app-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const WarningIcon = () => (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="shrink-0">
        <rect x="4" y="4" width="24" height="24" rx="8" fill="#f59e0b" opacity="0.15" />
        <rect x="8" y="8" width="16" height="16" rx="6" fill="#f59e0b" opacity="0.3" />
        <path d="M16 11V16M16 20H16.01" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const TOAST_CONFIG: Record<ToastType, { icon: any, colorClass: string, shadowClass: string }> = {
    success: {
        icon: <SuccessIcon />,
        colorClass: 'text-[var(--app-accent)]',
        shadowClass: 'shadow-[0_8px_32px_rgba(242,206,136,0.15)]'
    },
    error: {
        icon: <ErrorIcon />,
        colorClass: 'text-rose-500',
        shadowClass: 'shadow-[0_8px_32px_rgba(244,63,94,0.15)]'
    },
    warning: {
        icon: <WarningIcon />,
        colorClass: 'text-amber-500',
        shadowClass: 'shadow-[0_8px_32px_rgba(245,158,11,0.15)]'
    },
    info: {
        icon: <InfoIcon />,
        colorClass: 'text-[var(--app-accent)]',
        shadowClass: 'shadow-[0_8px_32px_rgba(242,206,136,0.15)]'
    }
}

export function Toaster() {
    const { toasts, removeToast } = useToastStore()

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-4 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => {
                const config = TOAST_CONFIG[toast.type]

                return (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto flex items-center justify-between gap-4 p-5 
              rounded-[24px] ${config.shadowClass} bg-[var(--app-bg-card)]/95 backdrop-blur-xl 
              transition-all duration-300 group hover:scale-[1.02]
              animate-in fade-in slide-in-from-right-12 duration-500
            `}
                    >
                        <div className="flex items-center gap-4">
                            {config.icon}
                            <p className={`text-sm font-black tracking-tight ${config.colorClass}`}>
                                {toast.message}
                            </p>
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 rounded-full hover:bg-white/5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-all"
                        >
                            <X size={16} />
                        </button>

                        {/* Progress Bar (Subtle) */}
                        <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-white/5 overflow-hidden rounded-full">
                            <div
                                className={`h-full opacity-40 ${toast.type === 'success' ? 'bg-[var(--app-accent)]' : toast.type === 'error' ? 'bg-rose-500' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-[var(--app-accent)]'} animate-toast-progress`}
                                style={{ animationDuration: `${toast.duration || 3000}ms` }}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
