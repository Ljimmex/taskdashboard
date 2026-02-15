import { useState } from 'react'
import { useLocation, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { signOut, useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { sidebarIcons as icons } from './icons'
import { useTranslation } from 'react-i18next'
import { WorkspaceSwitcher } from '../features/workspace/WorkspaceSwitcher'
import { OrganizationSettingsPanel } from '../features/settings/panels/OrganizationSettingsPanel'

interface SidebarProps {
    isOpen?: boolean
    onToggle?: () => void
}

export function Sidebar({ isOpen = true }: SidebarProps) {
    const location = useLocation()
    const { t } = useTranslation()
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const { data: session } = useSession()

    // Fetch teams count
    const { data: teams } = useQuery({
        queryKey: ['teams', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return []
            const json = await apiFetchJson<any>(`/api/teams?workspaceSlug=${workspaceSlug}`, {
                headers: { 'x-user-id': session?.user?.id || '' }
            })
            return json.data
        },
        enabled: !!workspaceSlug
    })

    // Fetch conversations for unread count
    const { data: unreadCount } = useQuery({
        queryKey: ['conversations', 'unread', workspaceSlug],
        queryFn: async () => {
            if (!workspaceSlug) return 0
            const json = await apiFetchJson<any>(`/api/conversations?workspaceSlug=${workspaceSlug}&includeMessages=false&type=direct`, {
                headers: { 'x-user-id': session?.user?.id || '' }
            })
            const conversations = json.data || []
            return conversations.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0)
        },
        enabled: !!workspaceSlug && !!session?.user?.id,
        refetchInterval: 2000 // Poll every 2s for near real-time updates
    })

    // Default to 'dashboard' if no slug (shouldn't happen in workspace route)
    const baseUrl = workspaceSlug ? `/${workspaceSlug}` : '/dashboard'

    const navItems = [
        { iconKey: 'dashboard', label: t('dashboard.title'), path: `${baseUrl}`, count: null },
        { iconKey: 'team', label: t('dashboard.team'), path: `${baseUrl}/team`, count: teams?.length || null },
        { iconKey: 'product', label: t('dashboard.projects'), path: `${baseUrl}/projects`, count: null },
        { iconKey: 'messages', label: t('dashboard.messages'), path: `${baseUrl}/messages`, count: unreadCount || null },
        { iconKey: 'calendar', label: t('dashboard.calendar'), path: `${baseUrl}/calendar`, count: null },
        { iconKey: 'files', label: t('dashboard.files'), path: `${baseUrl}/files`, count: null },
        { iconKey: 'contact', label: t('dashboard.contact'), path: `${baseUrl}/contact`, count: null },
    ]

    return (
        <aside className={`fixed left-0 top-0 h-screen w-56 bg-[#0d0d14] flex flex-col z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} animate-slide-in`}>
            {/* Logo */}
            <div className="p-5">
                <a href="/" className="flex items-center gap-2">
                    <img src="/Zadano/Zadano_Logo_Full_Dark.svg" alt="Zadano.app" className="h-7" />
                </a>
            </div>

            {/* Navigation */}
            <nav className="px-3 space-y-0.5">
                {navItems.map((item) => {
                    // Exact match for dashboard root, startsWith for others
                    const isActive = item.path === baseUrl
                        ? location.pathname === baseUrl || location.pathname === `${baseUrl}/`
                        : location.pathname.startsWith(item.path)

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

            {/* Organisation Settings */}
            <div className="px-3 pt-2">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    onMouseEnter={() => setHoveredItem('settings')}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-all ${hoveredItem === 'settings' || isSettingsOpen
                        ? 'bg-[#1a1a24] text-[#F2CE88]'
                        : 'text-gray-500 hover:bg-gray-800/30'
                        }`}
                >
                    <div className="w-6 h-6 flex items-center justify-center">
                        {hoveredItem === 'settings' || isSettingsOpen ? icons.settings.gold : icons.settings.gray}
                    </div>
                    <span className={`text-sm whitespace-nowrap ${hoveredItem === 'settings' || isSettingsOpen ? 'text-[#F2CE88] font-medium' : 'text-gray-500'}`}>
                        {t('dashboard.settings')}
                    </span>
                </button>
            </div>

            {/* Logout */}
            <div className="px-3 py-2">
                <button
                    onClick={async () => {
                        await signOut()
                        window.location.href = '/'
                    }}
                    onMouseEnter={() => setHoveredItem('logout')}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="flex items-center gap-3 px-3 py-2 w-full text-gray-500 hover:text-[#F2CE88] rounded-lg hover:bg-gray-800/30 transition-all"
                >
                    <div className="w-6 h-6 flex items-center justify-center">
                        {hoveredItem === 'logout' ? icons.logout.gold : icons.logout.gray}
                    </div>
                    <span className={`text-sm ${hoveredItem === 'logout' ? 'text-[#F2CE88]' : ''}`}>{t('dashboard.logout')}</span>
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
                            <span className={`text-sm ${!isDarkMode ? 'text-white' : 'text-gray-600'}`}>{t('dashboard.dayMode')}</span>
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
                            <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>{t('dashboard.nightMode')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Flex spacer */}
            <div className="flex-1" />

            {/* Workspace Switcher */}
            <WorkspaceSwitcher />

            {/* Settings Panel */}
            <OrganizationSettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

        </aside>
    )
}
