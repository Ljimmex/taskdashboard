import { useState, useEffect, useRef } from 'react'
import { ChevronDoubleRightIcon } from '../../tasks/components/TaskIcons'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface InviteWorkspaceMemberPanelProps {
    isOpen: boolean
    onClose: () => void
    workspace: {
        id: string
        name: string
        slug: string
    }
}

export function InviteWorkspaceMemberPanel({ isOpen, onClose, workspace }: InviteWorkspaceMemberPanelProps) {
    const [activeTab, setActiveTab] = useState<'email' | 'link'>('email')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'admin' | 'project_manager' | 'hr_manager' | 'member' | 'guest'>('member')
    const [expiresDays, setExpiresDays] = useState(7)
    const [isCopied, setIsCopied] = useState(false)
    const [activeDropdown, setActiveDropdown] = useState(false)
    const [origin, setOrigin] = useState('')
    const [generatedInvite, setGeneratedInvite] = useState<any>(null)

    const panelRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { data: session } = useSession()
    const queryClient = useQueryClient()

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    // Auto-focus input
    useEffect(() => {
        if (isOpen && activeTab === 'email') {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [isOpen, activeTab])

    const { mutate: createInvite, isPending: isCreating } = useMutation({
        mutationFn: async (data: any) => {
            const userId = session?.user?.id

            console.log('🚀 Sending Invite Request:', {
                url: `/api/workspaces/${workspace.id}/invites`,
                userId: userId || 'MISSING (Will cause 500 if strict DB constraints)',
                data
            })

            if (!userId) {
                throw new Error('User ID is missing. Cannot create invite without authenticated user.')
            }

            return apiFetchJson(`/api/workspaces/${workspace.id}/invites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify(data)
            })
        },
        onSuccess: (res: any) => {
            console.log('✅ Invite Created:', res)
            if (activeTab === 'email') {
                setEmail('')
                onClose()
            } else {
                setGeneratedInvite(res.data)
            }
            queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspace.id] })
        },
        onError: (error) => {
            console.error('❌ Failed to create invite:', error)
            alert(`Failed to create invitation: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    })

    const handleSendInvite = () => {
        if (!email) return
        createInvite({
            email,
            role,
            expiresDays,
            type: 'email'
        })
    }

    const handleGenerateLink = () => {
        createInvite({
            role,
            expiresDays,
            type: 'link'
        })
    }

    const getInviteLink = () => {
        if (!generatedInvite) return ''
        return `${origin}/invite/${generatedInvite.token}`
    }

    const handleCopyLink = () => {
        const link = getInviteLink()
        if (!link) return
        navigator.clipboard.writeText(link)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const inviteLink = getInviteLink()

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`fixed top-4 right-4 bottom-4 w-full max-w-md bg-[#12121a] rounded-2xl z-[70] flex flex-col shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'}`}
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
                            <h2 className="text-lg font-semibold text-white">Invite to {workspace.name}</h2>
                            <p className="text-xs text-gray-500">Add members to your organization</p>
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
                            Invite with email
                            {activeTab === 'email' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F2CE88] rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('link')
                                setGeneratedInvite(null)
                            }}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'link' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Invite with link
                            {activeTab === 'link' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F2CE88] rounded-t-full" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {activeTab === 'email' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                                <input
                                    ref={inputRef}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full text-sm text-white bg-[#1a1a24] placeholder-gray-500 outline-none px-4 py-3 rounded-xl border border-gray-800 focus:border-[#F2CE88]/50 transition-colors"
                                />
                            </div>
                        ) : (
                            <div>
                                {generatedInvite ? (
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-400">Your Invitation Link</label>
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
                                        <p className="text-xs text-gray-500 italic">Anyone with this link can join this workspace as a {role}.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 space-y-4">
                                        <p className="text-sm text-gray-400">Generate a unique link that you can share with others.</p>
                                        <button
                                            onClick={handleGenerateLink}
                                            disabled={isCreating}
                                            className="px-6 py-2.5 bg-[#F2CE88] text-black text-sm font-semibold rounded-xl hover:bg-[#d9b877] transition-all disabled:opacity-50"
                                        >
                                            {isCreating ? 'Generating...' : 'Generate Invite Link'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-800">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Assigned Role</label>
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
                                            {['admin', 'project_manager', 'hr_manager', 'member', 'guest'].map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={() => {
                                                        setRole(r as any)
                                                        setActiveDropdown(false)
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors capitalize hover:bg-gray-800 ${role === r ? 'text-[#F2CE88] bg-[#F2CE88]/10' : 'text-gray-300'}`}
                                                >
                                                    {r.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Expiration</label>
                            <select
                                value={expiresDays}
                                onChange={(e) => setExpiresDays(Number(e.target.value))}
                                className="w-full bg-[#1a1a24] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F2CE88]/50"
                            >
                                <option value={1}>1 day</option>
                                <option value={7}>7 days</option>
                                <option value={30}>30 days</option>
                                <option value={0}>Never (not recommended)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 bg-[#0f0f14] rounded-b-2xl">
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        {activeTab === 'email' && (
                            <button
                                onClick={handleSendInvite}
                                disabled={!email || isCreating}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${email && !isCreating
                                    ? 'bg-[#F2CE88] text-black hover:bg-[#d9b877]'
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isCreating ? 'Sending...' : 'Send Invitation'}
                            </button>
                        )}
                        {activeTab === 'link' && generatedInvite && (
                            <button
                                onClick={onClose}
                                className="px-6 py-2 rounded-lg text-sm font-medium bg-[#F2CE88] text-black hover:bg-[#d9b877] transition-all"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
