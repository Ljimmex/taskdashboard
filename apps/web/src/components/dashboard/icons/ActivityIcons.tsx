// Team Activity Icons
// Gold (#F2CE88, #7A664E) for hover, Gray (#9E9E9E, #545454) for default

export const HeartIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M16 28C16 28 4 20.5 4 11.5C4 7.5 7.5 4.5 11.5 4.5C13.5 4.5 15.5 6 16 8C16.5 6 18.5 4.5 20.5 4.5C24.5 4.5 28 7.5 28 11.5C28 20.5 16 28 16 28Z" fill="var(--app-accent-text)" />
            <path d="M22 10L28 14" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M16 28C16 28 4 20.5 4 11.5C4 7.5 7.5 4.5 11.5 4.5C13.5 4.5 15.5 6 16 8C16.5 6 18.5 4.5 20.5 4.5C24.5 4.5 28 7.5 28 11.5C28 20.5 16 28 16 28Z" fill="var(--app-text-muted)" />
            <path d="M22 10L28 14" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

export const CommentIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="var(--app-accent-hover)" />
            <circle cx="10" cy="15" r="2" fill="var(--app-accent-text)" />
            <circle cx="16" cy="15" r="2" fill="var(--app-accent-text)" />
            <circle cx="22" cy="15" r="2" fill="var(--app-accent-text)" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="var(--app-text-secondary)" />
            <circle cx="10" cy="15" r="2" fill="var(--app-text-muted)" />
            <circle cx="16" cy="15" r="2" fill="var(--app-text-muted)" />
            <circle cx="22" cy="15" r="2" fill="var(--app-text-muted)" />
        </svg>
    )
)

export const ShareIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <circle cx="24" cy="8" r="4" fill="var(--app-accent-text)" />
            <circle cx="24" cy="24" r="4" fill="var(--app-accent-text)" />
            <circle cx="8" cy="16" r="4" fill="var(--app-accent-hover)" />
            <path d="M21 10L11 14" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M11 18L21 22" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <circle cx="24" cy="8" r="4" fill="var(--app-text-muted)" />
            <circle cx="24" cy="24" r="4" fill="var(--app-text-muted)" />
            <circle cx="8" cy="16" r="4" fill="var(--app-text-secondary)" />
            <path d="M21 10L11 14" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M11 18L21 22" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)
