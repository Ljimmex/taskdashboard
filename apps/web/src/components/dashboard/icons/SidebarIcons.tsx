// Sidebar Navigation Icons
// Gold (#F2CE88, #7A664E) for active/hover, Gray (#9E9E9E, #545454) for inactive

export const sidebarIcons = {
    dashboard: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="10" height="10" rx="3" fill="#F2CE88" />
                <rect x="18" y="4" width="10" height="10" rx="3" fill="#7A664E" />
                <rect x="4" y="18" width="10" height="10" rx="3" fill="#7A664E" />
                <rect x="18" y="18" width="10" height="10" rx="3" fill="#F2CE88" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="10" height="10" rx="3" fill="#9E9E9E" />
                <rect x="18" y="4" width="10" height="10" rx="3" fill="#545454" />
                <rect x="4" y="18" width="10" height="10" rx="3" fill="#545454" />
                <rect x="18" y="18" width="10" height="10" rx="3" fill="#9E9E9E" />
            </svg>
        ),
    },
    team: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="10" r="4" fill="#F2CE88" />
                <path d="M8 24C8 20.134 11.134 17 15 17H17C20.866 17 24 20.134 24 24V26H8V24Z" fill="#F2CE88" />
                <circle cx="24.5" cy="11" r="3" fill="#7A664E" />
                <path d="M29 22C29 19.5 27 17.5 24.5 17.5" stroke="#7A664E" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="7.5" cy="11" r="3" fill="#7A664E" />
                <path d="M3 22C3 19.5 5 17.5 7.5 17.5" stroke="#7A664E" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="10" r="4" fill="#9E9E9E" />
                <path d="M8 24C8 20.134 11.134 17 15 17H17C20.866 17 24 20.134 24 24V26H8V24Z" fill="#9E9E9E" />
                <circle cx="24.5" cy="11" r="3" fill="#545454" />
                <path d="M29 22C29 19.5 27 17.5 24.5 17.5" stroke="#545454" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="7.5" cy="11" r="3" fill="#545454" />
                <path d="M3 22C3 19.5 5 17.5 7.5 17.5" stroke="#545454" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
        ),
    },
    messages: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="#7A664E" />
                <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#F2CE88" />
                <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#F2CE88" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="#545454" />
                <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#9E9E9E" />
                <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#9E9E9E" />
            </svg>
        ),
    },
    calendar: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M6 10C6 7.79086 7.79086 6 10 6H22C24.2091 6 26 7.79086 26 10V24C26 26.2091 24.2091 28 22 28H10C7.79086 28 6 26.2091 6 24V10Z" fill="#F2CE88" />
                <path d="M6 12H26" stroke="#7A664E" strokeWidth="3" />
                <path d="M11 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
                <path d="M21 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M6 10C6 7.79086 7.79086 6 10 6H22C24.2091 6 26 7.79086 26 10V24C26 26.2091 24.2091 28 22 28H10C7.79086 28 6 26.2091 6 24V10Z" fill="#9E9E9E" />
                <path d="M6 12H26" stroke="#545454" strokeWidth="3" />
                <path d="M11 4V8" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
                <path d="M21 4V8" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            </svg>
        ),
    },
    files: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="6" y="10" width="20" height="14" rx="3" fill="#7A664E" />
                <rect x="8" y="13" width="18" height="11" rx="2" fill="#F2CE88" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="6" y="10" width="20" height="14" rx="3" fill="#545454" />
                <rect x="8" y="13" width="18" height="11" rx="2" fill="#9E9E9E" />
            </svg>
        ),
    },
    product: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M16 4L26 9V20.5L16 25.5L6 20.5V9L16 4Z" fill="#7A664E" />
                <path d="M6 9L16 14L26 9L16 4L6 9Z" fill="#F2CE88" />
                <path d="M16 14V25.5" stroke="#F2CE88" strokeWidth="2" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M16 4L26 9V20.5L16 25.5L6 20.5V9L16 4Z" fill="#545454" />
                <path d="M6 9L16 14L26 9L16 4L6 9Z" fill="#9E9E9E" />
                <path d="M16 14V25.5" stroke="#9E9E9E" strokeWidth="2" />
            </svg>
        ),
    },
    contact: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="24" height="24" rx="5" fill="#F2CE88" />
                <circle cx="16" cy="13" r="4" fill="#7A664E" />
                <path d="M9 23C9 19.6863 12.134 17 16 17C19.866 17 23 19.6863 23 23" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="24" height="24" rx="5" fill="#9E9E9E" />
                <circle cx="16" cy="13" r="4" fill="#545454" />
                <path d="M9 23C9 19.6863 12.134 17 16 17C19.866 17 23 19.6863 23 23" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            </svg>
        ),
    },
    logout: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M12 8H8C5.79086 8 4 9.79086 4 12V20C4 22.2091 5.79086 24 8 24H12" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
                <path d="M16 16H28" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
                <path d="M22 10L28 16L22 22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M12 8H8C5.79086 8 4 9.79086 4 12V20C4 22.2091 5.79086 24 8 24H12" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
                <path d="M16 16H28" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                <path d="M22 10L28 16L22 22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    settings: {
        gold: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="5" fill="#7A664E" />
                <path d="M16 4V8M16 24V28M28 16H24M8 16H4M24.4853 7.51472L21.6569 10.3431M10.3431 21.6569L7.51472 24.4853M24.4853 24.4853L21.6569 21.6569M10.3431 10.3431L7.51472 7.51472" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="5" fill="#545454" />
                <path d="M16 4V8M16 24V28M28 16H24M8 16H4M24.4853 7.51472L21.6569 10.3431M10.3431 21.6569L7.51472 24.4853M24.4853 24.4853L21.6569 21.6569M10.3431 10.3431L7.51472 7.51472" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
            </svg>
        ),
    },
}

// Day/Night mode icons
export const DayIcon = ({ isActive }: { isActive: boolean }) => (
    isActive ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="6" fill="#F2CE88" />
            <path d="M16 4V8" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 24V28" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 16H24" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 16H4" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 7.5L21.5 10.5" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 21.5L7.5 24.5" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 24.5L21.5 21.5" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 10.5L7.5 7.5" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="6" fill="#545454" />
            <path d="M16 4V8" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 24V28" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 16H24" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 16H4" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 7.5L21.5 10.5" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 21.5L7.5 24.5" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 24.5L21.5 21.5" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 10.5L7.5 7.5" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

export const NightIcon = ({ isActive }: { isActive: boolean }) => (
    isActive ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M16 4C10.4772 4 6 8.47715 6 14C6 19.5228 10.4772 24 16 24C18.5 24 20.7 23 22.3 21.3C20.5 22 18.6 21.6 17.5 20.5C16.4 19.4 16 17.5 16.7 15.7C17.4 13.9 19.1 12.7 21 12.7C22.9 12.7 24.5 13.8 25.2 15.5C25.7 15 26 14.5 26 14C26 8.47715 21.5228 4 16 4Z" fill="#F2CE88" />
            <circle cx="22" cy="8" r="2" fill="#7A664E" />
            <circle cx="26" cy="12" r="1.5" fill="#7A664E" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M16 4C10.4772 4 6 8.47715 6 14C6 19.5228 10.4772 24 16 24C18.5 24 20.7 23 22.3 21.3C20.5 22 18.6 21.6 17.5 20.5C16.4 19.4 16 17.5 16.7 15.7C17.4 13.9 19.1 12.7 21 12.7C22.9 12.7 24.5 13.8 25.2 15.5C25.7 15 26 14.5 26 14C26 8.47715 21.5228 4 16 4Z" fill="#545454" />
            <circle cx="22" cy="8" r="2" fill="#9E9E9E" />
            <circle cx="26" cy="12" r="1.5" fill="#9E9E9E" />
        </svg>
    )
)

// Add Project icon
export const AddProjectIcon = () => (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" fill="#7A664E" />
        <path d="M16 10V22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 16H22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

// Logo icon
export const LogoIcon = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="#F2CE88" />
        <path d="M10 16L14 20L22 12" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)
