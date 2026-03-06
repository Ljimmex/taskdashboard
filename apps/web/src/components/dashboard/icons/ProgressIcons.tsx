// Overall Progress Icons
// Static gold/brown color scheme

export const ChecklistIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <path d="M6 10C6 7.79086 7.79086 6 10 6H22C24.2091 6 26 7.79086 26 10V24C26 26.2091 24.2091 28 22 28H10C7.79086 28 6 26.2091 6 24V10Z" fill="var(--app-accent-hover)" />
        <path d="M10 13L13 16L19 10" stroke="var(--app-accent-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 21H22" stroke="var(--app-accent-text)" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const HistoryIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" stroke="var(--app-accent-hover)" strokeWidth="3" />
        <path d="M16 10V16L20 20" stroke="var(--app-accent-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const FoldersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="10" width="24" height="16" rx="3" fill="var(--app-accent-text)" />
        <path d="M4 10V8C4 6.89543 4.89543 6 6 6H12L14 10H4Z" fill="var(--app-accent-hover)" />
    </svg>
)

export const CalendarSmallIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="8" width="20" height="18" rx="3" fill="var(--app-accent-text)" />
        <path d="M6 12H26" stroke="var(--app-accent-hover)" strokeWidth="2" />
        <path d="M11 5V9" stroke="var(--app-accent-hover)" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 5V9" stroke="var(--app-accent-hover)" strokeWidth="2" strokeLinecap="round" />
    </svg>
)
