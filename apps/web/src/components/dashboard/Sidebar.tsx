import { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { signOut } from '@/lib/auth'

interface SidebarProps {
    isOpen?: boolean
    onToggle?: () => void
}

// SVG Icons - gold color (#F2CE88) for active, gray (#9E9E9E/#545454) for inactive
const icons = {
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
                <path d="M8 22C8 18.6863 11.5817 16 16 16C20.4183 16 24 18.6863 24 22V24H8V22Z" fill="#F2CE88" />
                <circle cx="24.5" cy="11" r="3" fill="#7A664E" />
                <path d="M29 22C29 19.5 27 17.5 24.5 17.5" stroke="#7A664E" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="7.5" cy="11" r="3" fill="#7A664E" />
                <path d="M3 22C3 19.5 5 17.5 7.5 17.5" stroke="#7A664E" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="10" r="4" fill="#9E9E9E" />
                <path d="M8 22C8 18.6863 11.5817 16 16 16C20.4183 16 24 18.6863 24 22V24H8V22Z" fill="#9E9E9E" />
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
                <path d="M4 10C4 6.68629 6.68629 4 10 4H22C25.3137 4 28 6.68629 28 10V18C28 21.3137 25.3137 24 22 24H12L6 28V22H10C6.68629 22 4 19.3137 4 16V10Z" fill="#F2CE88" />
                <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#7A664E" />
                <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#7A664E" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M4 10C4 6.68629 6.68629 4 10 4H22C25.3137 4 28 6.68629 28 10V18C28 21.3137 25.3137 24 22 24H12L6 28V22H10C6.68629 22 4 19.3137 4 16V10Z" fill="#9E9E9E" />
                <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#545454" />
                <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#545454" />
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
                <path d="M6 8C6 6.89543 6.89543 6 8 6H14L16 9H24C25.1046 9 26 9.89543 26 11V24C26 25.1046 25.1046 26 24 26H8C6.89543 26 6 25.1046 6 24V8Z" fill="#7A664E" />
                <rect x="8" y="13" width="18" height="11" rx="2" fill="#F2CE88" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M6 8C6 6.89543 6.89543 6 8 6H14L16 9H24C25.1046 9 26 9.89543 26 11V24C26 25.1046 25.1046 26 24 26H8C6.89543 26 6 25.1046 6 24V8Z" fill="#545454" />
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
                <path d="M16 16H28" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 10L28 16L22 22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        gray: (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M12 8H8C5.79086 8 4 9.79086 4 12V20C4 22.2091 5.79086 24 8 24H12" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
                <path d="M16 16H28" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 10L28 16L22 22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
}

export function Sidebar({ isOpen = true }: SidebarProps) {
    const location = useLocation()
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)

    const navItems = [
        { iconKey: 'dashboard', label: 'Dashboard', path: '/dashboard', count: null },
        { iconKey: 'team', label: 'Team', path: '/dashboard/team', count: 4 },
        { iconKey: 'messages', label: 'Messages', path: '/dashboard/messages', count: 21 },
        { iconKey: 'calendar', label: 'Calendar', path: '/dashboard/calendar', count: null },
        { iconKey: 'files', label: 'Files', path: '/dashboard/files', count: 32 },
        { iconKey: 'product', label: 'Product', path: '/dashboard/product', count: 36 },
        { iconKey: 'contact', label: 'Contact', path: '/dashboard/contact', count: 10 },
    ]

    return (
        <aside className={`fixed left-0 top-0 h-screen w-56 bg-[#0d0d14] flex flex-col z-40 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Logo */}
            <div className="p-5">
                <a href="/" className="flex items-center gap-2">
                    <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-7" />
                </a>
            </div>

            {/* Navigation */}
            <nav className="px-3 space-y-0.5">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard')
                    const isHovered = hoveredItem === item.path
                    const showGold = isActive || isHovered
                    const icon = icons[item.iconKey as keyof typeof icons]

                    return (
                        <a
                            key={item.path}
                            href={item.path}
                            onMouseEnter={() => setHoveredItem(item.path)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${isActive
                                ? 'bg-[#1a1a24]'
                                : 'hover:bg-gray-800/30'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 flex items-center justify-center">
                                    {showGold ? icon.gold : icon.gray}
                                </div>
                                <span className={`text-sm ${showGold ? 'text-[#F2CE88] font-medium' : 'text-gray-500'}`}>
                                    {item.label}
                                </span>
                            </div>
                            {item.count && (
                                <span className={`text-xs ${showGold ? 'text-[#F2CE88]/60' : 'text-gray-600'}`}>
                                    {item.count}
                                </span>
                            )}
                        </a>
                    )
                })}
            </nav>

            {/* Separator line */}
            <div className="border-t border-gray-800/50 mx-3 mt-2" />

            {/* Logout */}
            <div className="px-3 py-2">
                <button
                    onClick={() => signOut()}
                    onMouseEnter={() => setHoveredItem('logout')}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="flex items-center gap-3 px-3 py-2 w-full text-gray-500 hover:text-[#F2CE88] rounded-lg hover:bg-gray-800/30 transition-all"
                >
                    <div className="w-6 h-6 flex items-center justify-center">
                        {hoveredItem === 'logout' ? icons.logout.gold : icons.logout.gray}
                    </div>
                    <span className={`text-sm ${hoveredItem === 'logout' ? 'text-[#F2CE88]' : ''}`}>Log Out</span>
                </button>
            </div>

            {/* Theme Toggle - vertical switch layout */}
            <div className="px-3 mt-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a24]">
                    {/* Vertical Toggle Switch */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="relative w-5 h-10 rounded-full bg-[#0d0d14] border border-gray-700 flex-shrink-0"
                    >
                        <div
                            className={`absolute left-0.5 w-4 h-4 rounded-full bg-[#F2CE88] transition-all duration-200 ${isDarkMode ? 'bottom-0.5' : 'top-0.5'
                                }`}
                        />
                    </button>

                    {/* Mode Labels */}
                    <div className="flex flex-col gap-2">
                        {/* Day mode */}
                        <div
                            className={`flex items-center gap-2 cursor-pointer ${!isDarkMode ? 'opacity-100' : 'opacity-40'}`}
                            onClick={() => setIsDarkMode(false)}
                        >
                            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                                <circle cx="16" cy="16" r="7" fill={!isDarkMode ? "#F2CE88" : "#9E9E9E"} />
                                <path d="M16 4V6M16 26V28M28 16H26M6 16H4M24.4853 7.51472L23.0711 8.92893M8.92893 23.0711L7.51472 24.4853M24.4853 24.4853L23.0711 23.0711M8.92893 8.92893L7.51472 7.51472" stroke={!isDarkMode ? "#7A664E" : "#545454"} strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <span className={`text-xs ${!isDarkMode ? 'text-white' : 'text-gray-600'}`}>Day mode</span>
                        </div>

                        {/* Night mode */}
                        <div
                            className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'opacity-100' : 'opacity-40'}`}
                            onClick={() => setIsDarkMode(true)}
                        >
                            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                                <path d="M26 16C26 21.5228 21.5228 26 16 26C11.7532 26 8.14025 23.3415 6.58575 19.5C9.10485 20.6156 11.9149 20.3343 14.1924 18.6716C16.4699 17.0088 17.75 14.3006 17.75 11.5C17.75 9.6723 17.1989 7.96597 16.2396 6.52991C21.8131 7.56242 26 12.3684 26 16Z" fill={isDarkMode ? "#F2CE88" : "#9E9E9E"} />
                                <circle cx="23" cy="9" r="2" fill={isDarkMode ? "#7A664E" : "#545454"} />
                            </svg>
                            <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Night mode</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Project */}
            <div className="px-3 pb-4 mt-4">
                <button className="flex flex-col items-center justify-center w-full p-3 rounded-xl border border-dashed border-gray-700 hover:border-amber-500/50 text-gray-500 hover:text-amber-400 transition-all">
                    <div className="w-7 h-7 rounded-full bg-gray-800/50 flex items-center justify-center mb-1">
                        <span className="text-base">+</span>
                    </div>
                    <span className="text-[10px] font-medium">Add New Project</span>
                    <span className="text-[9px] text-gray-600">Or use invite link</span>
                </button>
            </div>

            {/* Flex spacer */}
            <div className="flex-1" />
        </aside>
    )
}
