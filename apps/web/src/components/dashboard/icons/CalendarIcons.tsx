// Calendar Section Icons
// Gold (#F2CE88, #7A664E) for hover/active, Gray (#9E9E9E, #545454) for default

export const CalendarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <path d="M6 10C6 7.79086 7.79086 6 10 6H22C24.2091 6 26 7.79086 26 10V24C26 26.2091 24.2091 28 22 28H10C7.79086 28 6 26.2091 6 24V10Z" fill="#F2CE88" />
        <path d="M6 12H26" stroke="#7A664E" strokeWidth="3" />
        <path d="M11 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <path d="M21 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const FilterIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 7C4 5.34315 5.34315 4 7 4H25C26.6569 4 28 5.34315 28 7V10L19 17V26L13 28V17L4 10V7Z" fill="#7A664E" />
            <rect x="8" y="8" width="16" height="4" rx="2" fill="#F2CE88" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 7C4 5.34315 5.34315 4 7 4H25C26.6569 4 28 5.34315 28 7V10L19 17V26L13 28V17L4 10V7Z" fill="#545454" />
            <rect x="8" y="8" width="16" height="4" rx="2" fill="#9E9E9E" />
        </svg>
    )
)

export const ScheduleIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="12" y="6" width="16" height="4" rx="2" fill="#7A664E" />
            <rect x="12" y="14" width="16" height="4" rx="2" fill="#7A664E" />
            <rect x="12" y="22" width="16" height="4" rx="2" fill="#7A664E" />
            <circle cx="6" cy="8" r="3" fill="#F2CE88" />
            <circle cx="6" cy="16" r="3" fill="#F2CE88" />
            <circle cx="6" cy="24" r="3" fill="#F2CE88" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="12" y="6" width="16" height="4" rx="2" fill="#545454" />
            <rect x="12" y="14" width="16" height="4" rx="2" fill="#545454" />
            <rect x="12" y="22" width="16" height="4" rx="2" fill="#545454" />
            <circle cx="6" cy="8" r="3" fill="#9E9E9E" />
            <circle cx="6" cy="16" r="3" fill="#9E9E9E" />
            <circle cx="6" cy="24" r="3" fill="#9E9E9E" />
        </svg>
    )
)

export const ArrowLeftIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M24 6L6 16" stroke="#F2CE88" strokeWidth="6" strokeLinecap="round" />
            <path d="M24 26L6 16" stroke="#7A664E" strokeWidth="6" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M24 6L6 16" stroke="#9E9E9E" strokeWidth="6" strokeLinecap="round" />
            <path d="M24 26L6 16" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        </svg>
    )
)

export const ArrowRightIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M8 6L26 16" stroke="#F2CE88" strokeWidth="6" strokeLinecap="round" />
            <path d="M8 26L26 16" stroke="#7A664E" strokeWidth="6" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M8 6L26 16" stroke="#9E9E9E" strokeWidth="6" strokeLinecap="round" />
            <path d="M8 26L26 16" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        </svg>
    )
)
