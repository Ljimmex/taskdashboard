// Header Icons
// Gold (#F2CE88, #7A664E) for hover/active, Gray (#9E9E9E, #545454) for default

// Search icon with focus states (using CSS group-focus-within)
export const SearchIconDefault = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <circle cx="14" cy="14" r="8" stroke="var(--app-text-muted)" strokeWidth="4" />
        <path d="M21 21L27 27" stroke="var(--app-text-secondary)" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

export const SearchIconActive = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <circle cx="14" cy="14" r="8" stroke="var(--app-accent-text)" strokeWidth="4" />
        <path d="M21 21L27 27" stroke="var(--app-accent-hover)" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

// Globe/Language icon
export const GlobeIconDefault = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" fill="var(--app-text-muted)" />
        <circle cx="16" cy="16" r="11" stroke="var(--app-text-secondary)" strokeWidth="3" />
        <path d="M5 16H27" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 5V27" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="16" cy="16" rx="6" ry="11" stroke="var(--app-text-secondary)" strokeWidth="3" />
    </svg>
)

export const GlobeIconHover = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" fill="var(--app-accent-text)" />
        <circle cx="16" cy="16" r="11" stroke="var(--app-accent-hover)" strokeWidth="3" />
        <path d="M5 16H27" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 5V27" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="16" cy="16" rx="6" ry="11" stroke="var(--app-accent-hover)" strokeWidth="3" />
    </svg>
)

// Notification/Bell icon
export const NotificationIconDefault = () => (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <path d="M16 8C12.6863 8 10 10.6863 10 14V20H8C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22H24C24.5523 22 25 21.5523 25 21C25 20.4477 24.5523 20 24 20H22V14C22 10.6863 19.3137 8 16 8Z" fill="var(--app-text-muted)" />
        <circle cx="16" cy="25" r="3" fill="var(--app-text-muted)" />
        <path d="M16 4V8" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 10C27.5 11.5 28 13.5 28 16" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const NotificationIconHover = () => (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <path d="M16 8C12.6863 8 10 10.6863 10 14V20H8C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22H24C24.5523 22 25 21.5523 25 21C25 20.4477 24.5523 20 24 20H22V14C22 10.6863 19.3137 8 16 8Z" fill="var(--app-accent-text)" />
        <circle cx="16" cy="25" r="3" fill="var(--app-accent-text)" />
        <path d="M16 4V8" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 10C27.5 11.5 28 13.5 28 16" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

// User menu dropdown icons
export const ProfileIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="12" r="5" fill="var(--app-accent-text)" />
            <path d="M6 26C6 21.5817 9.58172 18 14 18H18C22.4183 18 26 21.5817 26 26" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="12" r="5" fill="var(--app-text-muted)" />
            <path d="M6 26C6 21.5817 9.58172 18 14 18H18C22.4183 18 26 21.5817 26 26" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

export const ChatMenuIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="var(--app-accent-hover)" />
            <rect x="10" y="11" width="12" height="3" rx="1.5" fill="var(--app-accent-text)" />
            <rect x="10" y="17" width="8" height="3" rx="1.5" fill="var(--app-accent-text)" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="var(--app-text-secondary)" />
            <rect x="10" y="11" width="12" height="3" rx="1.5" fill="var(--app-text-muted)" />
            <rect x="10" y="17" width="8" height="3" rx="1.5" fill="var(--app-text-muted)" />
        </svg>
    )
)

export const TasksMenuIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="6" width="20" height="20" rx="3" fill="var(--app-accent-hover)" />
            <path d="M10 13L13 16L19 10" stroke="var(--app-accent-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 21H22" stroke="var(--app-accent-text)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="6" width="20" height="20" rx="3" fill="var(--app-text-secondary)" />
            <path d="M10 13L13 16L19 10" stroke="var(--app-text-muted)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 21H22" stroke="var(--app-text-muted)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

export const SettingsIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="4" fill="var(--app-accent-text)" />
            <path d="M16 4V8" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 24V28" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 16H24" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 16H4" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 7.5L21.5 10.5" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 21.5L7.5 24.5" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 24.5L21.5 21.5" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 10.5L7.5 7.5" stroke="var(--app-accent-hover)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="4" fill="var(--app-text-muted)" />
            <path d="M16 4V8" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 24V28" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 16H24" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 16H4" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 7.5L21.5 10.5" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 21.5L7.5 24.5" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 24.5L21.5 21.5" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 10.5L7.5 7.5" stroke="var(--app-text-secondary)" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

// Dropdown Arrow Icons (for user profile menu)
export const DropdownArrowUp = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 24L16 6" stroke="var(--app-accent-text)" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 24L16 6" stroke="var(--app-accent-hover)" strokeWidth="6" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 24L16 6" stroke="var(--app-text-muted)" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 24L16 6" stroke="var(--app-text-primary)" strokeWidth="6" strokeLinecap="round" />
        </svg>
    )
)

export const DropdownArrowDown = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 8L16 26" stroke="var(--app-accent-text)" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 8L16 26" stroke="var(--app-accent-hover)" strokeWidth="6" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 8L16 26" stroke="var(--app-text-muted)" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 8L16 26" stroke="var(--app-text-primary)" strokeWidth="6" strokeLinecap="round" />
        </svg>
    )
)
