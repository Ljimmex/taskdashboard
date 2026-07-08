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
  rightSlot,
}: ResourceEditorHeaderProps) {
  const label = type === 'doc' ? 'Dokument' : 'Whiteboard'

  return (
    <header className="pointer-events-none relative z-30 flex h-16 flex-none select-none items-center justify-between border-b border-[var(--app-border)] bg-transparent px-6 lg:px-8">
      {/* Left: Brand / File Info */}
      <div className="pointer-events-auto flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--app-accent)] transition-colors hover:bg-[var(--app-bg-elevated)]"
          title="Wróć"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-[var(--app-accent)]">Zadano</span>
          <div className="h-4 w-px bg-[var(--app-divider)]" />
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full max-w-[320px] border-none bg-transparent text-lg font-semibold text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] outline-none focus:ring-0 lg:max-w-[420px]"
            placeholder={type === 'doc' ? 'Tytuł dokumentu' : 'Nazwa tablicy'}
          />
        </div>
      </div>

      {/* Center: Resource type badge */}
      <div className="pointer-events-auto absolute left-1/2 top-4 hidden -translate-x-1/2 md:block">
        <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] px-5 py-1.5 text-sm font-medium text-[var(--app-text-secondary)]">
          {label}
        </div>
      </div>

      {/* Right: Collaboration & Actions */}
      <div className="pointer-events-auto flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-1 pr-4">
          <div className="flex -space-x-2">
            {collaborators.slice(0, 4).map((collab, idx) => {
              const name = collab.username || collab.name || '?'
              const color = collab.color || collab.background || '#7c3aed'
              return (
                <div
                  key={collab.userId || `${name}-${idx}`}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--app-bg-card)] text-[10px] font-bold text-white"
                  style={{ backgroundColor: color }}
                  title={name}
                >
                  {collab.avatarUrl ? (
                    <img src={collab.avatarUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </div>
              )
            })}
            {collaborators.length === 0 && (
              <div className="h-8 w-8 rounded-full border-2 border-dashed border-[var(--app-text-muted)] bg-transparent" />
            )}
            {collaborators.length > 4 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--app-bg-card)] bg-[var(--app-accent)] text-[10px] font-bold text-[var(--app-accent-text)]">
                +{collaborators.length - 4}
              </div>
            )}
          </div>
          {onHistory && (
            <>
              <div className="h-4 w-px bg-[var(--app-divider)]" />
              <button
                onClick={onHistory}
                className="text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)]"
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
            className="flex items-center gap-2 rounded-lg bg-[var(--app-accent)] px-5 py-2 text-sm font-semibold text-[var(--app-accent-text)] shadow-[0_0_15px_rgba(242,206,136,0.25)] transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--app-accent-hover)] active:scale-[0.98]"
          >
            <Share2 size={16} />
            Udostępnij
          </button>
        )}
      </div>
    </header>
  )
}
