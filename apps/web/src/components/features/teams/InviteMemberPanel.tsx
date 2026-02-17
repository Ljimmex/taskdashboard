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
    onInvite: (data: { type: 'email' | 'link'; emails?: string[]; userIds?: string[]; role?: string }) => void
}

interface WorkspaceMember {
    id: string
    name: string
    email: string
    image?: string
    position?: string
}

export function InviteMemberPanel({ isOpen, onClose, teamName, workspaceSlug, workspaceId, onInvite }: InviteMemberPanelProps) {
    const [activeTab, setActiveTab] = useState<'email' | 'link'>('email')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null)
    const [role, setRole] = useState<'team_lead' | 'senior' | 'mid' | 'junior' | 'intern' | 'member'>('mid')
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
            const json = await apiFetchJson<{ data: any[] }>(`/api/workspaces/${workspaceId}/members?q=${searchQuery}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
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
        enabled: isOpen && activeTab === 'email' && !!workspaceId && searchQuery.length >= 2
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
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <ChevronDoubleRightIcon />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{t('teams.invite_panel.title', { teamName })}</h2>
                            <p className="text-xs text-gray-500">{t('teams.invite_panel.subtitle')}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex-none px-6 pt-6">
                    <div className="flex gap-6 border-b border-gray-800">
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'email' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {t('teams.invite_panel.tabs.email')}
                            {activeTab === 'email' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('link')}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'link' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {t('teams.invite_panel.tabs.link')}
                            {activeTab === 'link' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                    {activeTab === 'email' ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('teams.invite_panel.search_label')}</label>
                                <div className="relative">
                                    {selectedMember ? (
                                        <div className="flex items-center justify-between bg-[#1a1a24] border border-amber-500/50 rounded-xl px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                                    {selectedMember.image ? (
                                                        <img src={selectedMember.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-gray-400">{(selectedMember.name || selectedMember.email || '?').charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{selectedMember.name}</div>
                                                    <div className="text-xs text-gray-500">{selectedMember.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedMember(null)}
                                                className="p-1 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                                                    className="w-full text-sm text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl border border-gray-800 focus:border-amber-500/50 transition-colors"
                                                />
                                                {isSearching && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <svg className="animate-spin h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {isSearchOpen && searchQuery.length >= 2 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a24] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto py-2">
                                                    {workspaceMembers && workspaceMembers.length > 0 ? (
                                                        workspaceMembers.map((m) => (
                                                            <button
                                                                key={m.id}
                                                                onClick={() => {
                                                                    setSelectedMember(m)
                                                                    setIsSearchOpen(false)
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors flex items-center gap-3"
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                                                    {m.image ? (
                                                                        <img src={m.image} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400">{(m.name || m.email || '?').charAt(0)}</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-white">{m.name}</div>
                                                                    <div className="text-xs text-gray-500">{m.email}</div>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : !isSearching ? (
                                                        <div className="px-4 py-3 text-sm text-gray-500 text-center italic">
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
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('teams.invite_panel.role_label')}</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(!activeDropdown)}
                                        className="w-full flex items-center justify-between bg-[#1a1a24] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white hover:border-gray-700 transition-colors"
                                    >
                                        <span className="capitalize">{role.replace('_', ' ')}</span>
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${activeDropdown ? 'rotate-180' : ''}`}>
                                            <path d="M1 1L5 5L9 1" />
                                        </svg>
                                    </button>

                                    {activeDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(false)} />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a24] border border-gray-800 rounded-xl shadow-xl overflow-hidden z-20 py-1">
                                                {['team_lead', 'senior', 'mid', 'junior', 'intern', 'member'].map((r) => (
                                                    <button
                                                        key={r}
                                                        onClick={() => {
                                                            setRole(r as any)
                                                            setActiveDropdown(false)
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-sm transition-colors capitalize hover:bg-gray-800 ${role === r ? 'text-amber-400 bg-amber-500/10' : 'text-gray-300'}`}
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
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('teams.invite_panel.link_label')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={inviteLink}
                                        className="flex-1 text-sm text-gray-400 bg-[#1a1a24] outline-none px-4 py-3 rounded-xl border border-gray-800 cursor-text select-all"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="px-4 py-2 bg-[#1a1a24] border border-gray-800 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center min-w-[3rem]"
                                        title="Copy Link"
                                    >
                                        {isCopied ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    {t('teams.invite_panel.anyone_with_link')} <strong>{t('teams.invite_panel.member_role')}</strong>.
                                </p>
                            </div>
                            <button
                                onClick={handleGenerateNewLink}
                                className="text-sm text-amber-500 hover:text-amber-400 transition-colors font-medium"
                            >
                                {t('teams.invite_panel.generate_new_link')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-[#0f0f14] rounded-b-2xl">
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            {t('teams.create_panel.cancel')}
                        </button>
                        {activeTab === 'email' && (
                            <button
                                onClick={handleSendInvite}
                                disabled={!selectedMember}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${selectedMember
                                    ? 'bg-[#0F4C75] hover:bg-[#0F4C75]/80 text-white'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {t('teams.invite_panel.add_to_team')}
                            </button>
                        )}
                        {activeTab === 'link' && (
                            <button
                                onClick={onClose}
                                className="px-6 py-2 rounded-lg text-sm font-medium bg-[#0F4C75] hover:bg-[#0F4C75]/80 text-white transition-all"
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
