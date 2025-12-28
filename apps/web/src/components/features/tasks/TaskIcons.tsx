import React from 'react'

export const FlagIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M8 28V6" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
        <path d="M10 7C10 7 14 5 18 7C22 9 26 7 26 7V17C26 17 22 19 18 17C14 15 10 17 10 17V7Z" fill="#9E9E9E" />
    </svg>
)

export const CloseIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const UserIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="12" r="5" fill="#9E9E9E" />
        <path d="M6 26C6 21.5817 9.58172 18 14 18H18C22.4183 18 26 21.5817 26 26" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const CalendarSmallIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 10C6 7.79 7.79 6 10 6H22C24.21 6 26 7.79 26 10V24C26 26.21 24.21 28 22 28H10C7.79 28 6 26.21 6 24V10Z" fill="#9E9E9E" />
        <path d="M6 12H26" stroke="#545454" strokeWidth="2" />
        <path d="M11 4V8" stroke="#545454" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 4V8" stroke="#545454" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

export const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" fill="#545454" />
        <path d="M10 16L14 20L22 12" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const SortIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="8" width="14" height="4" rx="2" fill="#9E9E9E" />
        <rect x="6" y="16" width="10" height="4" rx="2" fill="#9E9E9E" />
        <rect x="6" y="24" width="6" height="4" rx="2" fill="#9E9E9E" />
        <path d="M24 8V24" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <path d="M21 21L24 24L27 21" stroke="#545454" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)


export const BellIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M16 8C12.69 8 10 10.69 10 14V20H8C7.45 20 7 20.45 7 21C7 21.55 7.45 22 8 22H24C24.55 22 25 21.55 25 21C25 20.45 24.55 20 24 20H22V14C22 10.69 19.31 8 16 8Z" fill="#9E9E9E" />
        <circle cx="16" cy="25" r="3" fill="#545454" />
    </svg>
)

export const ArrowRightSmallIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M8 6L26 16" stroke="#9E9E9E" strokeWidth="5" strokeLinecap="round" />
        <path d="M8 26L26 16" stroke="#545454" strokeWidth="5" strokeLinecap="round" />
    </svg>
)

export const ZapIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#9E9E9E" stroke="#545454" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const GripVerticalIcon = ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        {...props}
    >
        <path d="M8 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8-18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
)

export const PaletteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28C17.95 28 19.78 27.53 21.41 26.69C21.68 26.55 22 26.63 22.21 26.84L23.29 27.92C23.88 28.51 24.87 28.34 25.21 27.58C26.32 25.06 27.35 20.84 25.81 16.59C24.06 11.76 19.83 6.62 16 4Z" fill="#545454" />
        <circle cx="11.5" cy="11.5" r="2.5" fill="#9E9E9E" />
        <circle cx="20.5" cy="11.5" r="2.5" fill="#9E9E9E" />
        <circle cx="16" cy="20.5" r="2.5" fill="#9E9E9E" />
    </svg>
)

export const HashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M10 4V28" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
        <path d="M22 4V28" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
        <path d="M4 12H28" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
        <path d="M4 20H28" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

// New icons extracted from TaskCard.tsx and KanbanBoardHeader.tsx
export const PaperclipIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M20.5 9.5L11.5 18.5C10.1193 19.8807 10.1193 22.1193 11.5 23.5C12.8807 24.8807 15.1193 24.8807 16.5 23.5L25.5 14.5C27.9853 12.0147 27.9853 7.98528 25.5 5.5C23.0147 3.01472 18.9853 3.01472 16.5 5.5L7.5 14.5" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <path d="M16.5 23.5L24 16" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
        <path d="M11.5 18.5L16.5 13.5" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const PaperclipIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M20.5 9.5L11.5 18.5C10.1193 19.8807 10.1193 22.1193 11.5 23.5C12.8807 24.8807 15.1193 24.8807 16.5 23.5L25.5 14.5C27.9853 12.0147 27.9853 7.98528 25.5 5.5C23.0147 3.01472 18.9853 3.01472 16.5 5.5L7.5 14.5" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <path d="M16.5 23.5L24 16" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
        <path d="M11.5 18.5L16.5 13.5" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const CommentIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 8C6 6.89543 6.89543 6 8 6H24C25.1046 6 26 6.89543 26 8V20C26 21.1046 25.1046 22 24 22H12L6 28V8Z" fill="#545454" />
        <circle cx="11" cy="14" r="2" fill="#9E9E9E" />
        <circle cx="16" cy="14" r="2" fill="#9E9E9E" />
        <circle cx="21" cy="14" r="2" fill="#9E9E9E" />
    </svg>
)

export const CommentIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 8C6 6.89543 6.89543 6 8 6H24C25.1046 6 26 6.89543 26 8V20C26 21.1046 25.1046 22 24 22H12L6 28V8Z" fill="#7A664E" />
        <circle cx="11" cy="14" r="2" fill="#F2CE88" />
        <circle cx="16" cy="14" r="2" fill="#F2CE88" />
        <circle cx="21" cy="14" r="2" fill="#F2CE88" />
    </svg>
)

export const DocumentIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M8 6C8 4.89543 8.89543 4 10 4H18L24 10V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z" fill="#9E9E9E" />
        <path d="M18 4V8C18 9.10457 18.8954 10 20 10H24" fill="#545454" />
        <path d="M12 14H20" stroke="#545454" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 18H20" stroke="#545454" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 22H16" stroke="#545454" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

export const DocumentIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M8 6C8 4.89543 8.89543 4 10 4H18L24 10V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z" fill="#F2CE88" />
        <path d="M18 4V8C18 9.10457 18.8954 10 20 10H24" fill="#7A664E" />
        <path d="M12 14H20" stroke="#7A664E" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 18H20" stroke="#7A664E" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 22H16" stroke="#7A664E" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

export const FireIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M16 3C13 7 8 12 8 18C8 23.5 11.5 28 16 28C20.5 28 24 23.5 24 18C24 12 19 7 16 3Z" fill="#545454" />
        <path d="M16 10C14.5 12 12 15 12 18C12 21 13.5 23 16 23C18.5 23 20 21 20 18C20 15 17.5 12 16 10Z" fill="#9E9E9E" />
    </svg>
)

export const ClockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" stroke="#545454" strokeWidth="4" />
        <circle cx="16" cy="16" r="2" fill="#9E9E9E" />
        <path d="M16 16V11" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 16L20 20" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const KanbanIconGold = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <rect x="5" y="6" width="6" height="20" rx="2" fill="#7A664E" />
        <rect x="13" y="6" width="6" height="20" rx="2" fill="#7A664E" />
        <rect x="21" y="6" width="6" height="20" rx="2" fill="#7A664E" />
        <rect x="6" y="9" width="4" height="4" rx="1" fill="#F2CE88" />
        <rect x="14" y="9" width="4" height="4" rx="1" fill="#F2CE88" />
        <rect x="14" y="15" width="4" height="4" rx="1" fill="#F2CE88" />
        <rect x="22" y="18" width="4" height="4" rx="1" fill="#F2CE88" />
    </svg>
)

export const KanbanIconGrey = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <rect x="5" y="6" width="6" height="20" rx="2" fill="#545454" />
        <rect x="13" y="6" width="6" height="20" rx="2" fill="#545454" />
        <rect x="21" y="6" width="6" height="20" rx="2" fill="#545454" />
        <rect x="6" y="9" width="4" height="4" rx="1" fill="#9E9E9E" />
        <rect x="14" y="9" width="4" height="4" rx="1" fill="#9E9E9E" />
        <rect x="14" y="15" width="4" height="4" rx="1" fill="#9E9E9E" />
        <rect x="22" y="18" width="4" height="4" rx="1" fill="#9E9E9E" />
    </svg>
)

export const SortIconGold = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="8" width="14" height="4" rx="2" fill="#F2CE88" />
        <rect x="6" y="16" width="10" height="4" rx="2" fill="#F2CE88" />
        <rect x="6" y="24" width="6" height="4" rx="2" fill="#F2CE88" />
        <path d="M24 8V24" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <path d="M21 21L24 24L27 21" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const SortIconGrey = () => (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="8" width="14" height="4" rx="2" fill="#9E9E9E" />
        <rect x="6" y="16" width="10" height="4" rx="2" fill="#9E9E9E" />
        <rect x="6" y="24" width="6" height="4" rx="2" fill="#9E9E9E" />
        <path d="M24 8V24" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <path d="M21 21L24 24L27 21" stroke="#545454" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)


// Action Icons for Menus (Edit, Duplicate, Archive, Delete)
export const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#545454" />
        <path d="M12 25L7 20L4 28L12 25Z" fill="#9E9E9E" />
    </svg>
)

export const PencilIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#7A664E" />
        <path d="M12 25L7 20L4 28L12 25Z" fill="#F2CE88" />
    </svg>
)

export const DuplicateIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <rect x="10" y="10" width="16" height="16" rx="3" fill="#9E9E9E" />
        <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

export const DuplicateIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <rect x="10" y="10" width="16" height="16" rx="3" fill="#F2CE88" />
        <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

export const ArchiveIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="12" width="24" height="16" rx="3" fill="#545454" />
        <rect x="6" y="8" width="20" height="4" rx="1" fill="#9E9E9E" />
    </svg>
)

export const ArchiveIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="12" width="24" height="16" rx="3" fill="#7A664E" />
        <rect x="6" y="8" width="20" height="4" rx="1" fill="#F2CE88" />
    </svg>
)

export const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#545454" />
        <rect x="4" y="6" width="24" height="4" rx="2" fill="#9E9E9E" />
    </svg>
)

export const TrashRedIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#7A664E" />
        <rect x="4" y="6" width="24" height="4" rx="2" fill="#ef4444" />
    </svg>
)

// Download Icon
export const DownloadIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M16 4V20" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
        <path d="M16 20L11 15" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
        <path d="M16 20L21 15" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
        <path d="M6 24H26V21" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const DownloadIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M16 4V20" stroke="#F2CE88" strokeWidth="4" strokeLinecap="round" />
        <path d="M16 20L11 15" stroke="#F2CE88" strokeWidth="4" strokeLinecap="round" />
        <path d="M16 20L21 15" stroke="#F2CE88" strokeWidth="4" strokeLinecap="round" />
        <path d="M6 24H26V21" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

// Chevron Double Left Icon (Collapse)
export const ChevronDoubleLeftIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M26 6L16 16L26 26" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6L6 16L16 26" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const ChevronDoubleLeftIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M26 6L16 16L26 26" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6L6 16L16 26" stroke="#F2CE88" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

// Chevron Double Right Icon (Expand)
export const ChevronDoubleRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 6L16 16L6 26" stroke="#545454" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6L26 16L16 26" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const ChevronDoubleRightIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 6L16 16L6 26" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 6L26 16L16 26" stroke="#F2CE88" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

// Subtask Checkbox Icon
export const SubtaskCheckboxIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 6V16C6 18.2091 7.79086 20 10 20H14" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        <rect x="14" y="14" width="12" height="12" rx="3" fill="#9E9E9E" />
        <path d="M18 20L20 22L24 18" stroke="#545454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export const SubtaskCheckboxIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M6 6V16C6 18.2091 7.79086 20 10 20H14" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        <rect x="14" y="14" width="12" height="12" rx="3" fill="#F2CE88" />
        <path d="M18 20L20 22L24 18" stroke="#7A664E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

// History Icon for Activity Feed
export const HistoryIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" stroke="#545454" strokeWidth="4" />
        <path d="M16 8V16L20 20" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 4L16 2" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

export const HistoryIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="11" stroke="#7A664E" strokeWidth="4" />
        <path d="M16 8V16L20 20" stroke="#F2CE88" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 4L16 2" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
    </svg>
)

// Send Icon (Paper Plane)
export const SendIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M28 4L4 14L14 18L28 4Z" fill="#9E9E9E" />
        <path d="M28 4L14 18V28L20 22M28 4L20 22" stroke="#545454" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 18H24" stroke="#545454" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

export const SendIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M28 4L4 14L14 18L28 4Z" fill="#F2CE88" />
        <path d="M28 4L14 18V28L20 22M28 4L20 22" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 18H24" stroke="#7A664E" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

// Plus Icon for adding items
export const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M16 6V26" stroke="#9E9E9E" strokeWidth="4" strokeLinecap="round" />
        <path d="M6 16H26" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

export const PlusIconGold = () => (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <path d="M16 6V26" stroke="#F2CE88" strokeWidth="4" strokeLinecap="round" />
        <path d="M6 16H26" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
    </svg>
)

// Priority Icons
export const PriorityUrgentIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C13 7 8 12 8 18C8 23.5 11.5 28 16 28C20.5 28 24 23.5 24 18C24 12 19 7 16 3Z" fill="#7A664E" />
        <path d="M16 10C14.5 12 12 15 12 18C12 21 13.5 23 16 23C18.5 23 20 21 20 18C20 15 17.5 12 16 10Z" fill="#F2CE88" />
    </svg>
)

export const PriorityHighIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="#F2CE88" stroke="#7A664E" strokeWidth="2" />
    </svg>
)

export const PriorityMediumIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="10" stroke="#F2CE88" strokeWidth="6" />
    </svg>
)

export const PriorityLowIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="11" stroke="#7A664E" strokeWidth="3" />
        <circle cx="16" cy="16" r="5" fill="#F2CE88" />
    </svg>
)
