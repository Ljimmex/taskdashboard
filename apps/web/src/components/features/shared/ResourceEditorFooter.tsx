interface ResourceEditorFooterProps {
    left?: React.ReactNode
    center?: React.ReactNode
    right?: React.ReactNode
}

export function ResourceEditorFooter({ left, center, right }: ResourceEditorFooterProps) {
    return (
        <footer className="flex-none h-10 z-30 px-6 lg:px-8 flex items-center justify-between pointer-events-none select-none relative bg-[var(--app-bg-card)] backdrop-blur-md border-t border-[var(--app-border)]">
            <div className="flex items-center gap-3 text-xs text-[var(--app-text-muted)] pointer-events-auto">
                {left}
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-[var(--app-text-muted)] pointer-events-auto">
                {center}
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--app-text-muted)] pointer-events-auto">
                {right}
            </div>
        </footer>
    )
}
