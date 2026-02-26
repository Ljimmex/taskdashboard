import { useState, useRef, useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSession, signOut } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { DropdownArrowUp, DropdownArrowDown } from './icons'
import { NotificationPanel } from '@/components/features/notifications/NotificationPanel'
import { UserSettingsPanel } from '@/components/features/settings/panels/UserSettingsPanel'
import { LanguageSwitcher } from '@/components/language-switcher'

export function Header() {
    const { t } = useTranslation()
    const { data: session } = useSession()
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [userPosition, setUserPosition] = useState<string>('')
    const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false)

    // Fetch user data for position
    useEffect(() => {
        const fetchUserData = async () => {
            if (!session?.user?.id) return
            try {
                const data = await apiFetchJson<any>('/api/users/me')
                // Handle both wrapped and unwrapped responses
                const userData = data.data || data
                if (userData && userData.position) {
                    setUserPosition(userData.position)
                }
            } catch (err) {
                console.error('Failed to fetch user position', err)
            }
        }
        fetchUserData()
    }, [session?.user?.id])

    // Refs for click outside
    const userMenuRef = useRef<HTMLDivElement>(null)
    const notifRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const user = session?.user
    const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
    const baseUrl = workspaceSlug ? `/${workspaceSlug}` : '/dashboard'

    return (
        <header className="h-16 bg-[#0d0d14] flex items-center justify-between px-6">
            {/* Search Bar with SVG icon */}
            <div className="flex-1 max-w-md">
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="group-focus-within:hidden">
                            <circle cx="14" cy="14" r="8" stroke="#9E9E9E" strokeWidth="4" />
                            <path d="M21 21L27 27" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="hidden group-focus-within:block">
                            <circle cx="14" cy="14" r="8" stroke="#F2CE88" strokeWidth="4" />
                            <path d="M21 21L27 27" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a0a0f] border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                    />
                </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
                {/* Language Selector */}
                <LanguageSwitcher />

                {/* Notifications with SVG icon */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors group"
                    >
                        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                            <path d="M16 8C12.6863 8 10 10.6863 10 14V20H8C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22H24C24.5523 22 25 21.5523 25 21C25 20.4477 24.5523 20 24 20H22V14C22 10.6863 19.3137 8 16 8Z" fill="#9E9E9E" />
                            <circle cx="16" cy="25" r="3" fill="#9E9E9E" />
                            <path d="M16 4V8" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
                            <path d="M26 10C27.5 11.5 28 13.5 28 16" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                            <path d="M16 8C12.6863 8 10 10.6863 10 14V20H8C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22H24C24.5523 22 25 21.5523 25 21C25 20.4477 24.5523 20 24 20H22V14C22 10.6863 19.3137 8 16 8Z" fill="#F2CE88" />
                            <circle cx="16" cy="25" r="3" fill="#F2CE88" />
                            <path d="M16 4V8" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
                            <path d="M26 10C27.5 11.5 28 13.5 28 16" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                    </button>
                    {showNotifications && (
                        <NotificationPanel onClose={() => setShowNotifications(false)} />
                    )}
                </div>

                {/* User Profile */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors group"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-black font-bold text-xs ring-2 ring-[#1a1a24] overflow-hidden ${user?.image ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                            {user?.image ? (
                                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.charAt(0) || user?.email?.charAt(0) || '?'
                            )}
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                            <p className="text-xs text-gray-500">{userPosition || 'Member'}</p>
                        </div>
                        {/* Arrow icon - changes direction based on menu state */}
                        {showUserMenu ? (
                            <DropdownArrowUp isHovered={false} />
                        ) : (
                            <DropdownArrowDown isHovered={false} />
                        )}
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 top-14 w-56 bg-[#12121a] rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="p-2 space-y-1">
                                <a href={baseUrl} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group">
                                    {/* My Profile icon */}
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                            <circle cx="16" cy="16" r="12" fill="#545454" />
                                            <circle cx="16" cy="12" r="4" fill="#9E9E9E" />
                                            <path d="M8.5 24C8.5 20 11.5 18 16 18C20.5 18 23.5 20 23.5 24" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                            <circle cx="16" cy="16" r="12" fill="#7A664E" />
                                            <circle cx="16" cy="12" r="4" fill="#F2CE88" />
                                            <path d="M8.5 24C8.5 20 11.5 18 16 18C20.5 18 23.5 20 23.5 24" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <span>{t('dashboard.myProfile')}</span>
                                </a>
                                <a href={baseUrl} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group">
                                    {/* My Chat icon - Messages from Sidebar */}
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                            <path d="M4 10C4 6.68629 6.68629 4 10 4H22C25.3137 4 28 6.68629 28 10V18C28 21.3137 25.3137 24 22 24H12L6 28V22H10C6.68629 22 4 19.3137 4 16V10Z" fill="#9E9E9E" />
                                            <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#545454" />
                                            <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#545454" />
                                        </svg>
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                            <path d="M4 10C4 6.68629 6.68629 4 10 4H22C25.3137 4 28 6.68629 28 10V18C28 21.3137 25.3137 24 22 24H12L6 28V22H10C6.68629 22 4 19.3137 4 16V10Z" fill="#F2CE88" />
                                            <rect x="10" y="11" width="12" height="3" rx="1.5" fill="#7A664E" />
                                            <rect x="10" y="17" width="8" height="3" rx="1.5" fill="#7A664E" />
                                        </svg>
                                    </div>
                                    <span>{t('dashboard.myChat')}</span>
                                </a>
                                <a href={`${baseUrl}/my-tasks`} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group">
                                    {/* Tasks icon */}
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                            <rect x="10" y="8" width="16" height="4" rx="2" fill="#545454" />
                                            <rect x="10" y="16" width="16" height="4" rx="2" fill="#545454" />
                                            <rect x="10" y="24" width="12" height="4" rx="2" fill="#545454" />
                                            <rect x="4" y="8" width="4" height="4" rx="1" fill="#9E9E9E" />
                                            <rect x="4" y="16" width="4" height="4" rx="1" fill="#9E9E9E" />
                                            <rect x="4" y="24" width="4" height="4" rx="1" fill="#9E9E9E" />
                                        </svg>
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                            <rect x="10" y="8" width="16" height="4" rx="2" fill="#7A664E" />
                                            <rect x="10" y="16" width="16" height="4" rx="2" fill="#7A664E" />
                                            <rect x="10" y="24" width="12" height="4" rx="2" fill="#7A664E" />
                                            <rect x="4" y="8" width="4" height="4" rx="1" fill="#F2CE88" />
                                            <rect x="4" y="16" width="4" height="4" rx="1" fill="#F2CE88" />
                                            <rect x="4" y="24" width="4" height="4" rx="1" fill="#F2CE88" />
                                        </svg>
                                    </div>
                                    <span>{t('dashboard.myTasks')}</span>
                                </a>
                                <button
                                    onClick={() => {
                                        setIsUserSettingsOpen(true)
                                        setShowUserMenu(false)
                                    }}
                                    className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group text-left"
                                >
                                    {/* Settings icon */}
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M26.5 16C26.5 17.3 26.3 18.6 25.9 19.8L28.8 22.1L26 27L22.5 25.8C21.1 26.8 19.6 27.6 17.9 28L17.3 31.7H13.8L13.2 28C11.5 27.6 9.9 26.8 8.5 25.8L5.1 27L2.3 22.1L5.1 19.8C4.7 18.6 4.5 17.3 4.5 16C4.5 14.7 4.7 13.4 5.1 12.2L2.3 9.9L5.1 5L8.5 6.2C9.9 5.2 11.5 4.4 13.2 4L13.8 0.3H17.3L17.9 4C19.6 4.4 21.1 5.2 22.5 6.2L26 5L28.8 9.9L25.9 12.2C26.3 13.4 26.5 14.7 26.5 16Z" fill="#545454" />
                                            <circle cx="15.5" cy="16" r="5.5" fill="#9E9E9E" />
                                        </svg>
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M26.5 16C26.5 17.3 26.3 18.6 25.9 19.8L28.8 22.1L26 27L22.5 25.8C21.1 26.8 19.6 27.6 17.9 28L17.3 31.7H13.8L13.2 28C11.5 27.6 9.9 26.8 8.5 25.8L5.1 27L2.3 22.1L5.1 19.8C4.7 18.6 4.5 17.3 4.5 16C4.5 14.7 4.7 13.4 5.1 12.2L2.3 9.9L5.1 5L8.5 6.2C9.9 5.2 11.5 4.4 13.2 4L13.8 0.3H17.3L17.9 4C19.6 4.4 21.1 5.2 22.5 6.2L26 5L28.8 9.9L25.9 12.2C26.3 13.4 26.5 14.7 26.5 16Z" fill="#7A664E" />
                                            <circle cx="15.5" cy="16" r="5.5" fill="#F2CE88" />
                                        </svg>
                                    </div>
                                    <span>{t('dashboard.userSettings')}</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        await signOut()
                                        window.location.href = '/'
                                    }}
                                    className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group"
                                >
                                    {/* Logout icon */}
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                            <path d="M12 8H8C5.79086 8 4 9.79086 4 12V20C4 22.2091 5.79086 24 8 24H12" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
                                            <path d="M16 16H28" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M22 10L28 16L22 22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                            <path d="M12 8H8C5.79086 8 4 9.79086 4 12V20C4 22.2091 5.79086 24 8 24H12" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
                                            <path d="M16 16H28" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M22 10L28 16L22 22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <span>{t('dashboard.logout')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* User Settings Panel */}
            <UserSettingsPanel
                isOpen={isUserSettingsOpen}
                onClose={() => setIsUserSettingsOpen(false)}
            />
        </header>
    )
}
