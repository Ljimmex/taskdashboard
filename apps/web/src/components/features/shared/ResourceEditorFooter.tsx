interface ResourceEditorFooterProps {
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
}

export function ResourceEditorFooter({ left, center, right }: ResourceEditorFooterProps) {
  return (
    <footer className="pointer-events-none relative z-30 flex h-10 flex-none select-none items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-bg-card)] px-6 backdrop-blur-md lg:px-8">
      <div className="pointer-events-auto flex items-center gap-3 text-xs text-[var(--app-text-muted)]">
        {left}
      </div>
      <div className="pointer-events-auto hidden items-center gap-3 text-xs text-[var(--app-text-muted)] md:flex">
        {center}
      </div>
      <div className="pointer-events-auto flex items-center gap-3 text-xs text-[var(--app-text-muted)]">
        {right}
      </div>
    </footer>
  )
}
