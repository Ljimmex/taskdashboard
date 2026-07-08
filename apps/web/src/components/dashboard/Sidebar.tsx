import { useState } from 'react'
import { useThemeStore } from '@/lib/themeStore'
import { useLocation, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { signOut, useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { sidebarIcons as icons } from './icons'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { WorkspaceSwitcher } from '../features/workspace/WorkspaceSwitcher'
import { StorageQuota } from '../features/files/StorageQuota'
import { OrganizationSettingsPanel } from '../features/settings/panels/OrganizationSettingsPanel'

interface SidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

export function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const { workspaceSlug } = useParams({ strict: false }) as { workspaceSlug: string }
  const { isDark: isDarkMode, toggle: toggleTheme, setTheme } = useThemeStore()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const { data: session } = useSession()

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', workspaceSlug, session?.user?.id],
    queryFn: async () => {
      if (!workspaceSlug || !session?.user?.id) return null
      return apiFetchJson<any>(`/api/workspaces/slug/${workspaceSlug}`, {
        headers: { 'x-user-id': session?.user?.id || '' },
      })
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
  })

  // If workspace fails to load (wrong slug like "messages"), redirect back to dashboard
  // to re-resolve valid workspace
  if (workspaceData && (workspaceData.success === false || workspaceData.error)) {
    window.location.href = '/dashboard'
    return null
  }

  const userRole = workspaceData?.userRole
  const canManageSettings = userRole === 'owner' || userRole === 'admin'

  // Fetch teams count
  const { data: teams } = useQuery({
    queryKey: ['teams', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return []
      const json = await apiFetchJson<any>(`/api/teams?workspaceSlug=${workspaceSlug}`, {
        headers: { 'x-user-id': session?.user?.id || '' },
      })
      return json.data
    },
    enabled: !!workspaceSlug,
  })

  // Fetch projects count
  const { data: projects } = useQuery({
    queryKey: ['projects', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return []
      const json = await apiFetchJson<any>(`/api/projects?workspaceSlug=${workspaceSlug}`, {
        headers: { 'x-user-id': session?.user?.id || '' },
      })
      return json.data
    },
    enabled: !!workspaceSlug,
  })

  // Fetch conversations for unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['conversations', 'unread', workspaceSlug],
    queryFn: async () => {
      if (!workspaceSlug) return 0
      const json = await apiFetchJson<any>(
        `/api/conversations?workspaceSlug=${workspaceSlug}&includeMessages=false&type=direct`,
        {
          headers: { 'x-user-id': session?.user?.id || '' },
        }
      )
      const conversations = json.data || []
      return conversations.reduce((acc: number, conv: any) => acc + (conv.unreadCount || 0), 0)
    },
    enabled: !!workspaceSlug && !!session?.user?.id,
    refetchInterval: 2000, // Poll every 2s for near real-time updates
  })

  // Default to 'dashboard' if no slug (shouldn't happen in workspace route)
  const baseUrl = workspaceSlug ? `/${workspaceSlug}` : '/dashboard'

  const navItems = [
    { iconKey: 'dashboard', label: t('dashboard.title'), path: `${baseUrl}`, count: null },
    {
      iconKey: 'team',
      label: t('dashboard.team'),
      path: `${baseUrl}/team`,
      count: teams?.length || null,
    },
    {
      iconKey: 'product',
      label: t('dashboard.projects'),
      path: `${baseUrl}/projects`,
      count: projects?.length || null,
    },
    {
      iconKey: 'messages',
      label: t('dashboard.messages'),
      path: `${baseUrl}/messages`,
      count: unreadCount || null,
    },
    {
      iconKey: 'calendar',
      label: t('dashboard.calendar'),
      path: `${baseUrl}/calendar`,
      count: null,
    },
    { iconKey: 'files', label: t('dashboard.files'), path: `${baseUrl}/files`, count: null },
    { iconKey: 'board', label: t('dashboard.resources'), path: `${baseUrl}/board`, count: null },
    {
      iconKey: 'timetracker',
      label: t('dashboard.timeTracker'),
      path: `${baseUrl}/time-tracker`,
      count: null,
    },
  ]

  return (
    <aside
      className={`fixed left-0 top-0 z-[100] flex h-screen w-56 flex-col bg-[var(--app-bg-sidebar)] transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} animate-slide-in lg:translate-x-0`}
    >
      {/* Logo and Close Button */}
      <div className="flex h-16 items-center justify-between p-5">
        <a href="/" className="flex items-center gap-2">
          <img
            src={
              isDarkMode
                ? '/Zadano/Zadano_Logo_Full_Dark.svg'
                : '/Zadano/Zadano_Logo_Full_Light.svg'
            }
            alt="Zadano.app"
            className="h-7 transition-opacity duration-300"
          />
        </a>
        <button
          onClick={onToggle}
          className="-mr-2 p-2 text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text-primary)] lg:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 px-3">
        {navItems.map((item) => {
          // Exact match for dashboard root, startsWith for others
          const isActive =
            item.path === baseUrl
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
              className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
                isActive ? 'bg-[var(--app-bg-elevated)]' : 'hover:bg-[var(--app-bg-elevated)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center">
                  {showGold ? icon.gold : icon.gray}
                </div>
                <span
                  className={`text-sm ${showGold ? 'font-medium text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)] group-hover:text-[var(--app-text-primary)]'}`}
                >
                  {item.label}
                </span>
              </div>
              {item.count && (
                <span
                  className={cn(
                    'min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold transition-all duration-300',
                    showGold
                      ? 'bg-[var(--app-accent)] text-[var(--app-accent-text)] shadow-sm'
                      : 'bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)]'
                  )}
                >
                  {item.count}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* Separator line */}
      <div className="mx-3 mt-2 border-t border-[var(--app-border)]" />

      {/* Organisation Settings */}
      {canManageSettings && (
        <div className="px-3 pt-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            onMouseEnter={() => setHoveredItem('settings')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              hoveredItem === 'settings' || isSettingsOpen
                ? 'bg-[var(--app-bg-elevated)] text-[var(--app-accent)]'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)]'
            }`}
          >
            <div className="flex h-6 w-6 items-center justify-center">
              {hoveredItem === 'settings' || isSettingsOpen
                ? icons.settings.gold
                : icons.settings.gray}
            </div>
            <span
              className={`whitespace-nowrap text-sm ${hoveredItem === 'settings' || isSettingsOpen ? 'font-medium text-[#F2CE88]' : 'text-[var(--app-text-secondary)]'}`}
            >
              {t('dashboard.settings')}
            </span>
          </button>
        </div>
      )}

      {/* Logout */}
      <div className="px-3 py-2">
        <button
          onClick={async () => {
            await signOut()
            window.location.href = '/'
          }}
          onMouseEnter={() => setHoveredItem('logout')}
          onMouseLeave={() => setHoveredItem(null)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-bg-elevated)] hover:text-[#F2CE88]"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            {hoveredItem === 'logout' ? icons.logout.gold : icons.logout.gray}
          </div>
          <span className={`text-sm ${hoveredItem === 'logout' ? 'text-[#F2CE88]' : ''}`}>
            {t('dashboard.logout')}
          </span>
        </button>
      </div>

      {/* Theme Toggle - vertical switch layout */}
      <div className="mt-4 px-3">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--app-bg-elevated)] p-2">
          {/* Vertical Toggle Switch */}
          <button
            onClick={toggleTheme}
            className="relative h-10 w-5 flex-shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-deepest)]"
          >
            <div
              className={`absolute left-0.5 h-4 w-4 rounded-full bg-[#F2CE88] transition-all duration-200 ${
                isDarkMode ? 'bottom-0.5' : 'top-0.5'
              }`}
            />
          </button>

          {/* Mode Labels */}
          <div className="flex flex-col gap-0.5">
            {/* Day mode */}
            <div
              className={`flex cursor-pointer items-center gap-1.5 transition-all ${!isDarkMode ? 'scale-[1.02] opacity-100' : 'opacity-40 grayscale hover:opacity-100'}`}
              onClick={() => setTheme('light')}
            >
              <div className="flex h-7 w-7 items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                  <circle
                    cx="16"
                    cy="16"
                    r="7"
                    fill={!isDarkMode ? 'var(--app-accent)' : 'var(--app-text-muted)'}
                  />
                  <path
                    d="M16 4V6M16 26V28M28 16H26M6 16H4M24.4853 7.51472L23.0711 8.92893M8.92893 23.0711L7.51472 24.4853M24.4853 24.4853L23.0711 23.0711M8.92893 8.92893L7.51472 7.51472"
                    stroke={!isDarkMode ? 'var(--app-accent)' : 'var(--app-text-muted)'}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold transition-colors',
                  !isDarkMode ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)]'
                )}
              >
                {t('dashboard.dayMode')}
              </span>
            </div>

            {/* Night mode */}
            <div
              className={`flex cursor-pointer items-center gap-1.5 transition-all ${isDarkMode ? 'scale-[1.02] opacity-100' : 'opacity-40 grayscale hover:opacity-100'}`}
              onClick={() => setTheme('dark')}
            >
              <div className="flex h-7 w-7 items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M26 16C26 21.5228 21.5228 26 16 26C11.7532 26 8.14025 23.3415 6.58575 19.5C9.10485 20.6156 11.9149 20.3343 14.1924 18.6716C16.4699 17.0088 17.75 14.3006 17.75 11.5C17.75 11.5 17.75 11.5 17.75 11.5C17.75 9.6723 17.1989 7.96597 16.2396 6.52991C21.8131 7.56242 26 12.3684 26 16Z"
                    fill={isDarkMode ? 'var(--app-accent)' : 'var(--app-text-muted)'}
                  />
                  <circle
                    cx="23"
                    cy="9"
                    r="2"
                    fill={isDarkMode ? 'var(--app-accent)' : 'var(--app-text-muted)'}
                  />
                </svg>
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold transition-colors',
                  isDarkMode ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)]'
                )}
              >
                {t('dashboard.nightMode')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flex spacer */}
      <div className="flex-1" />

      {/* Storage quota for Files */}
      <StorageQuota workspaceId={workspaceData?.id} />

      {/* Workspace Switcher */}
      <WorkspaceSwitcher />

      {/* Settings Panel */}
      {canManageSettings && (
        <OrganizationSettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </aside>
  )
}
