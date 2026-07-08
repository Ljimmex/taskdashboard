import { useState, useEffect, useRef } from 'react'
import { usePanelStore } from '../../../lib/panelStore'
import { ChevronDoubleRightIcon } from '../tasks/components/TaskIcons'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

interface InviteMemberPanelProps {
  isOpen: boolean
  onClose: () => void
  teamName: string
  workspaceSlug: string
  workspaceId?: string // Added workspaceId
  onInvite: (data: {
    type: 'email' | 'link'
    emails?: string[]
    userIds?: string[]
    role?: string
  }) => void
}

interface WorkspaceMember {
  id: string
  name: string
  email: string
  image?: string
  position?: string
}

export function InviteMemberPanel({
  isOpen,
  onClose,
  teamName,
  workspaceSlug,
  workspaceId,
  onInvite,
}: InviteMemberPanelProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'link'>('email')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null)
  const [role, setRole] = useState<'team_lead' | 'senior' | 'mid' | 'junior' | 'intern' | 'member'>(
    'mid'
  )
  const [isCopied, setIsCopied] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [origin, setOrigin] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  const setIsPanelOpen = usePanelStore((state) => state.setIsPanelOpen)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()
  const { t } = useTranslation()

  // Sync global panel state
  useEffect(() => {
    setIsPanelOpen(isOpen)
  }, [isOpen, setIsPanelOpen])

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // Auto-focus input
  useEffect(() => {
    if (isOpen && activeTab === 'email') {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen, activeTab])

  // Fetch workspace members for search
  const { data: workspaceMembers, isLoading: isSearching } = useQuery({
    queryKey: ['workspace-members-search', workspaceId, searchQuery],
    queryFn: async () => {
      if (!workspaceId) return []
      const json = await apiFetchJson<{ data: any[] }>(
        `/api/workspaces/${workspaceId}/members?q=${searchQuery}`,
        {
          headers: {
            'x-user-id': session?.user?.id || '',
          },
        }
      )
      // API returns { user: {id, name, email, image}, role, status }
      // Map to flat WorkspaceMember shape expected by the component
      return (json.data || []).map((m: any) => ({
        id: m.user?.id || m.id,
        name: m.user?.name || m.name || '',
        email: m.user?.email || m.email || '',
        image: m.user?.image || m.image,
        position: m.user?.position || m.position,
      })) as WorkspaceMember[]
    },
    enabled: isOpen && activeTab === 'email' && !!workspaceId && searchQuery.length >= 2,
  })

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleSendInvite = () => {
    if (activeTab === 'email' && selectedMember) {
      onInvite({ type: 'email', userIds: [selectedMember.id], role })
      setSelectedMember(null)
      setSearchQuery('')
      onClose()
    }
  }

  const { data: authData } = useSession()
  const inviterName = authData?.user.name || 'TaskFlow User'
  const inviterRole = 'Project Owner'

  const [linkToken, setLinkToken] = useState('')

  const getInviteLink = () => {
    const baseUrl = `${origin}/invite/${teamName.toLowerCase().replace(/\s+/g, '-')}`
    const params = new URLSearchParams()
    if (inviterName) params.set('inviter', inviterName)
    params.set('role', inviterRole)
    params.set('workspace', workspaceSlug)
    if (linkToken) params.set('t', linkToken)
    return `${baseUrl}?${params.toString()}`
  }

  const handleGenerateNewLink = () => {
    const newToken = Math.random().toString(36).substring(7)
    setLinkToken(newToken)
    setIsCopied(false)
  }

  const handleCopyLink = () => {
    const link = getInviteLink()
    navigator.clipboard.writeText(link)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const inviteLink = getInviteLink()

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed inset-0 z-50 flex w-full max-w-none transform flex-col rounded-none bg-[var(--app-bg-deepest)] shadow-2xl transition-transform duration-300 ease-out sm:inset-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-[448px] sm:max-w-md sm:rounded-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[calc(100%+2rem)]'}`}
      >
        {/* Header */}
        <div className="flex-none border-b border-[var(--app-border)] p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-input)] hover:text-[var(--app-text-primary)]"
            >
              <ChevronDoubleRightIcon />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-[var(--app-text-primary)]">
                {t('teams.invite_panel.title', { teamName })}
              </h2>
              <p className="text-xs text-[var(--app-text-muted)]">
                {t('teams.invite_panel.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-none px-6 pt-6">
          <div className="flex gap-6 border-b border-[var(--app-border)]">
            <button
              onClick={() => setActiveTab('email')}
              className={`relative pb-3 text-sm font-medium transition-colors ${activeTab === 'email' ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
            >
              {t('teams.invite_panel.tabs.email')}
              {activeTab === 'email' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-amber-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`relative pb-3 text-sm font-medium transition-colors ${activeTab === 'link' ? 'text-[var(--app-text-primary)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]'}`}
            >
              {t('teams.invite_panel.tabs.link')}
              {activeTab === 'link' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-amber-500" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {activeTab === 'email' ? (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                  {t('teams.invite_panel.search_label')}
                </label>
                <div className="relative">
                  {selectedMember ? (
                    <div className="flex items-center justify-between rounded-none border border-amber-500/50 bg-[var(--app-bg-sidebar)] px-4 py-3 sm:rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--app-bg-input)]">
                          {selectedMember.image ? (
                            <img
                              src={selectedMember.image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-[var(--app-text-secondary)]">
                              {(selectedMember.name || selectedMember.email || '?').charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--app-text-primary)]">
                            {selectedMember.name}
                          </div>
                          <div className="text-xs text-[var(--app-text-muted)]">
                            {selectedMember.email}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMember(null)}
                        className="rounded-lg p-1 text-[var(--app-text-muted)] hover:bg-[var(--app-bg-input)] hover:text-[var(--app-text-primary)]"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setIsSearchOpen(true)
                          }}
                          onFocus={() => setIsSearchOpen(true)}
                          placeholder={t('teams.invite_panel.search_placeholder')}
                          className="w-full rounded-none border border-[var(--app-border)] bg-[var(--app-bg-sidebar)] px-4 py-3 text-sm text-[var(--app-text-primary)] placeholder-gray-500 outline-none transition-colors focus:border-amber-500/50 sm:rounded-xl"
                        />
                        {isSearching && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <svg
                              className="h-4 w-4 animate-spin text-amber-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </div>
                        )}
                      </div>

                      {isSearchOpen && searchQuery.length >= 2 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-hidden overflow-y-auto rounded-none border border-[var(--app-border)] bg-[var(--app-bg-sidebar)] py-2 shadow-2xl sm:rounded-xl">
                          {workspaceMembers && workspaceMembers.length > 0 ? (
                            workspaceMembers.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setSelectedMember(m)
                                  setIsSearchOpen(false)
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--app-bg-input)]"
                              >
                                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--app-bg-elevated)]">
                                  {m.image ? (
                                    <img
                                      src={m.image}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs text-[var(--app-text-secondary)]">
                                      {(m.name || m.email || '?').charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-[var(--app-text-primary)]">
                                    {m.name}
                                  </div>
                                  <div className="text-xs text-[var(--app-text-muted)]">
                                    {m.email}
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : !isSearching ? (
                            <div className="px-4 py-3 text-center text-sm italic text-[var(--app-text-muted)]">
                              {t('teams.invite_panel.no_member_found')}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                  {t('teams.invite_panel.role_label')}
                </label>
                <div className="relative">
                  <button
                    onClick={() => setActiveDropdown(!activeDropdown)}
                    className="flex w-full items-center justify-between rounded-none border border-[var(--app-border)] bg-[var(--app-bg-sidebar)] px-4 py-3 text-sm text-[var(--app-text-primary)] transition-colors hover:border-[var(--app-border)] sm:rounded-xl"
                  >
                    <span className="capitalize">{role.replace('_', ' ')}</span>
                    <svg
                      width="10"
                      height="6"
                      viewBox="0 0 10 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`transition-transform ${activeDropdown ? 'rotate-180' : ''}`}
                    >
                      <path d="M1 1L5 5L9 1" />
                    </svg>
                  </button>

                  {activeDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveDropdown(false)}
                      />
                      <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-none border border-[var(--app-border)] bg-[var(--app-bg-sidebar)] py-1 shadow-xl sm:rounded-xl">
                        {['team_lead', 'senior', 'mid', 'junior', 'intern', 'member'].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setRole(r as any)
                              setActiveDropdown(false)
                            }}
                            className={`w-full px-4 py-2 text-left text-sm capitalize transition-colors hover:bg-[var(--app-bg-input)] ${role === r ? 'bg-amber-500/10 text-amber-400' : 'text-[var(--app-text-secondary)]'}`}
                          >
                            {r.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
                  {t('teams.invite_panel.link_label')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 cursor-text select-all rounded-none border border-[var(--app-border)] bg-[var(--app-bg-sidebar)] px-4 py-3 text-sm text-[var(--app-text-secondary)] outline-none sm:rounded-xl"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex min-w-[3rem] items-center justify-center rounded-none border border-[var(--app-border)] bg-[var(--app-bg-sidebar)] px-4 py-2 transition-colors hover:bg-[var(--app-bg-input)] sm:rounded-xl"
                    title="Copy Link"
                  >
                    {isCopied ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22C55E"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-[var(--app-text-secondary)]"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--app-text-muted)]">
                  {t('teams.invite_panel.anyone_with_link')}{' '}
                  <strong>{t('teams.invite_panel.member_role')}</strong>.
                </p>
              </div>
              <button
                onClick={handleGenerateNewLink}
                className="text-sm font-medium text-amber-500 transition-colors hover:text-amber-400"
              >
                {t('teams.invite_panel.generate_new_link')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none rounded-b-2xl bg-[var(--app-bg-deepest)] p-6">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--app-text-secondary)] transition-colors hover:text-[var(--app-text-primary)]"
            >
              {t('teams.create_panel.cancel')}
            </button>
            {activeTab === 'email' && (
              <button
                onClick={handleSendInvite}
                disabled={!selectedMember}
                className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                  selectedMember
                    ? 'bg-[var(--app-accent)] text-white hover:brightness-110'
                    : 'cursor-not-allowed bg-[var(--app-bg-input)] text-[var(--app-text-muted)]'
                }`}
              >
                {t('teams.invite_panel.add_to_team')}
              </button>
            )}
            {activeTab === 'link' && (
              <button
                onClick={onClose}
                className="rounded-lg bg-[var(--app-accent)] px-6 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
              >
                {t('teams.invite_panel.done')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
