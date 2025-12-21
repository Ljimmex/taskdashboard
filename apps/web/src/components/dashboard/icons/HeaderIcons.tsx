// Header Icons
// Gold (#F2CE88, #7A664E) for hover/active, Gray (#9E9E9E, #545454) for default

// Search icon with focus states (using CSS group-focus-within)
export const SearchIconDefault = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <circle cx="14" cy="14" r="8" stroke="#9E9E9E" strokeWidth="4" />
        <path d="M21 21L27 27" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

export const SearchIconActive = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <circle cx="14" cy="14" r="8" stroke="#F2CE88" strokeWidth="4" />
        <path d="M21 21L27 27" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

// Globe/Language icon
export const GlobeIconDefault = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" fill="#9E9E9E" />
        <circle cx="16" cy="16" r="11" stroke="#545454" strokeWidth="3" />
        <path d="M5 16H27" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 5V27" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="16" cy="16" rx="6" ry="11" stroke="#545454" strokeWidth="3" />
    </svg>
)

export const GlobeIconHover = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" fill="#F2CE88" />
        <circle cx="16" cy="16" r="11" stroke="#7A664E" strokeWidth="3" />
        <path d="M5 16H27" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 5V27" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="16" cy="16" rx="6" ry="11" stroke="#7A664E" strokeWidth="3" />
    </svg>
)

// Notification/Bell icon
export const NotificationIconDefault = () => (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <path d="M16 8C12.6863 8 10 10.6863 10 14V20H8C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22H24C24.5523 22 25 21.5523 25 21C25 20.4477 24.5523 20 24 20H22V14C22 10.6863 19.3137 8 16 8Z" fill="#9E9E9E" />
        <circle cx="16" cy="25" r="3" fill="#9E9E9E" />
        <path d="M16 4V8" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 10C27.5 11.5 28 13.5 28 16" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const NotificationIconHover = () => (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <path d="M16 8C12.6863 8 10 10.6863 10 14V20H8C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22H24C24.5523 22 25 21.5523 25 21C25 20.4477 24.5523 20 24 20H22V14C22 10.6863 19.3137 8 16 8Z" fill="#F2CE88" />
        <circle cx="16" cy="25" r="3" fill="#F2CE88" />
        <path d="M16 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 10C27.5 11.5 28 13.5 28 16" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

// User menu dropdown icons
export const ProfileIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="12" r="5" fill="#F2CE88" />
            <path d="M6 26C6 21.5817 9.58172 18 14 18H18C22.4183 18 26 21.5817 26 26" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="12" r="5" fill="#9E9E9E" />
            <path d="M6 26C6 21.5817 9.58172 18 14 18H18C22.4183 18 26 21.5817 26 26" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

export const ChatMenuIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="#7A664E" />
            <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#F2CE88" />
            <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#F2CE88" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="#545454" />
            <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#9E9E9E" />
            <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#9E9E9E" />
        </svg>
    )
)

export const TasksMenuIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="6" width="20" height="20" rx="3" fill="#7A664E" />
            <path d="M10 13L13 16L19 10" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 21H22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="6" width="20" height="20" rx="3" fill="#545454" />
            <path d="M10 13L13 16L19 10" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 21H22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

export const SettingsIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="4" fill="#F2CE88" />
            <path d="M16 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M16 24V28" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 16H24" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 16H4" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 7.5L21.5 10.5" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 21.5L7.5 24.5" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M24.5 24.5L21.5 21.5" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M10.5 10.5L7.5 7.5" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="4" fill="#9E9E9E" />
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

// Dropdown Arrow Icons (for user profile menu)
export const DropdownArrowUp = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 24L16 6" stroke="#F2CE88" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 24L16 6" stroke="#7A664E" strokeWidth="6" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 24L16 6" stroke="#9E9E9E" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 24L16 6" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        </svg>
    )
)

export const DropdownArrowDown = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 8L16 26" stroke="#F2CE88" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 8L16 26" stroke="#7A664E" strokeWidth="6" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 8L16 26" stroke="#9E9E9E" strokeWidth="6" strokeLinecap="round" />
            <path d="M26 8L16 26" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        </svg>
    )
)
