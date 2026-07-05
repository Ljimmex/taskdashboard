import { ArrowLeft, Share2, History } from 'lucide-react'

interface Collaborator {
    userId?: string
    username?: string
    name?: string
    avatarUrl?: string
    color?: string
    background?: string
}

interface ResourceEditorHeaderProps {
    title: string
    onTitleChange: (title: string) => void
    onBack: () => void
    type: 'doc' | 'whiteboard'
    collaborators?: Collaborator[]
    onShare?: () => void
    onHistory?: () => void
    rightSlot?: React.ReactNode
}

export function ResourceEditorHeader({
    title,
    onTitleChange,
    onBack,
    type,
    collaborators = [],
    onShare,
    onHistory,
    rightSlot
}: ResourceEditorHeaderProps) {
    const label = type === 'doc' ? 'Dokument' : 'Whiteboard'

    return (
        <header className="flex-none h-16 z-30 px-6 lg:px-8 flex justify-between items-center pointer-events-none select-none relative bg-transparent border-b border-[var(--app-border)]">
            {/* Left: Brand / File Info */}
            <div className="flex items-center gap-4 pointer-events-auto">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--app-accent)] hover:bg-[var(--app-bg-elevated)] transition-colors"
                    title="Wróć"
                >
                    <ArrowLeft size={22} />
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-[var(--app-accent)] tracking-tight">Zadano</span>
                    <div className="h-4 w-px bg-[var(--app-divider)]" />
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-[var(--app-text-primary)] text-lg font-semibold w-full max-w-[320px] lg:max-w-[420px] placeholder-[var(--app-text-muted)] focus:ring-0"
                        placeholder={type === 'doc' ? 'Tytuł dokumentu' : 'Nazwa tablicy'}
                    />
                </div>
            </div>

            {/* Center: Resource type badge */}
            <div className="absolute left-1/2 top-4 -translate-x-1/2 pointer-events-auto hidden md:block">
                <div className="px-5 py-1.5 rounded-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] text-sm font-medium text-[var(--app-text-secondary)]">
                    {label}
                </div>
            </div>

            {/* Right: Collaboration & Actions */}
            <div className="flex items-center gap-4 pointer-events-auto">
                <div className="flex items-center bg-[var(--app-bg-elevated)] rounded-full p-1 pr-4 gap-3 border border-[var(--app-border)]">
                    <div className="flex -space-x-2">
                        {collaborators.slice(0, 4).map((collab, idx) => {
                            const name = collab.username || collab.name || '?'
                            const color = collab.color || collab.background || '#7c3aed'
                            return (
                                <div
                                    key={collab.userId || `${name}-${idx}`}
                                    className="w-8 h-8 rounded-full border-2 border-[var(--app-bg-card)] overflow-hidden flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ backgroundColor: color }}
                                    title={name}
                                >
                                    {collab.avatarUrl ? (
                                        <img src={collab.avatarUrl} alt={name} className="w-full h-full object-cover" />
                                    ) : (
                                        name.charAt(0).toUpperCase()
                                    )}
                                </div>
                            )
                        })}
                        {collaborators.length === 0 && (
                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--app-text-muted)] bg-transparent" />
                        )}
                        {collaborators.length > 4 && (
                            <div className="w-8 h-8 rounded-full border-2 border-[var(--app-bg-card)] bg-[var(--app-accent)] text-[var(--app-accent-text)] flex items-center justify-center text-[10px] font-bold">
                                +{collaborators.length - 4}
                            </div>
                        )}
                    </div>
                    {onHistory && (
                        <>
                            <div className="h-4 w-px bg-[var(--app-divider)]" />
                            <button
                                onClick={onHistory}
                                className="text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors"
                                title="Historia"
                            >
                                <History size={18} />
                            </button>
                        </>
                    )}
                </div>

                {rightSlot}

                {onShare && (
                    <button
                        onClick={onShare}
                        className="bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-[var(--app-accent-text)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(242,206,136,0.25)]"
                    >
                        <Share2 size={16} />
                        Udostępnij
                    </button>
                )}
            </div>
        </header>
    )
}
