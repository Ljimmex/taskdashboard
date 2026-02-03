import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchJson } from '@/lib/api'
import { useSession } from '@/lib/auth'

interface MembersSettingsTabProps {
    workspace: any
}

interface Member {
    id: string
    name: string
    email: string
    image?: string
    position?: string
    role?: string
    workspaceRole?: string // Added alias from backend
    joinedAt?: string
}

export function MembersSettingsTab({ workspace }: MembersSettingsTabProps) {
    const { data: session } = useSession()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    // Fetch members
    const { data: members = [], isLoading } = useQuery({
        queryKey: ['workspace-members', workspace.id],
        queryFn: async () => {
            const res = await apiFetchJson<any>(`/api/workspaces/${workspace.id}/members`)
            return res.data || []
        },
        enabled: !!workspace?.id
    })

    // Debug log to check what API is returning
    useEffect(() => {
        if (members.length > 0) {
            console.log('Members API Response V2:', members)
        }
    }, [members])

    // Remove member mutation
    const { mutate: removeMember, isPending: isRemoving } = useMutation({
        mutationFn: async (memberId: string) => {
            return apiFetchJson(`/api/workspaces/${workspace.id}/members/${memberId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': session?.user?.id || '' }
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] })
        },
        onError: (error) => {
            console.error('Failed to remove member', error)
            alert('Failed to remove member')
        }
    })

    // Update role mutation
    const { mutate: updateRole, isPending: isUpdatingRole } = useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
            return apiFetchJson(`/api/workspaces/${workspace.id}/members/${memberId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': session?.user?.id || ''
                },
                body: JSON.stringify({ role })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.id] })
        },
        onError: (error) => {
            console.error('Failed to update role', error)
            alert('Failed to update role')
        }
    })

    const filteredMembers = members.filter((m: Member) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleRemove = (memberId: string) => {
        if (confirm('Are you sure you want to remove this member from the organization?')) {
            removeMember(memberId)
        }
        setOpenMenuId(null)
    }

    const handleRoleChange = (memberId: string, newRole: string) => {
        updateRole({ memberId, role: newRole })
    }

    const handleSetOwner = (memberId: string) => {
        if (confirm('Are you sure you want to transfer Owner role? This action is irreversible.')) {
            updateRole({ memberId, role: 'owner' })
        }
        setOpenMenuId(null)
    }

    const handleDisable = (_memberId: string) => {
        // Placeholder for disable logic
        alert('Disable feature requires backend migration. Coming soon.')
        setOpenMenuId(null)
    }

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMenuId && !(event.target as Element).closest('.member-actions-menu')) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [openMenuId])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Members</h3>
                    <p className="text-sm text-gray-400">Manage organization access</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="px-4 py-2 bg-[#F2CE88] hover:bg-[#d9b877] text-black font-medium rounded-lg text-sm transition-colors"
                >
                    Invite Member
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1a1a24] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-[#F2CE88]"
                />
                <svg className="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* List */}
            {/* Removed overflow-hidden from container to fix dropdown clipping */}
            <div className="bg-[#1a1a24] rounded-xl border border-gray-800/50">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : filteredMembers.length > 0 ? (
                    <div className="divide-y divide-gray-800">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#14141b] rounded-t-xl">
                            <div className="col-span-4">User</div>
                            <div className="col-span-3">Role</div>
                            <div className="col-span-3">Joined</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {filteredMembers.map((member: Member) => {
                            const isSelf = member.id === session?.user?.id;
                            // Prefer workspaceRole, fallback to role (though role might be undefined now)
                            const displayRole = member.workspaceRole || member.role || 'member';
                            const isOwner = displayRole === 'owner';

                            return (
                                <div key={member.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                                    {/* User Info */}
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                            {member.image ? (
                                                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-medium text-xs">
                                                    {member.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-medium text-white truncate">{member.name}</h4>
                                            <p className="text-xs text-gray-500 truncate">{member.email}</p>
                                        </div>
                                    </div>

                                    {/* Role Selector */}
                                    <div className="col-span-3">
                                        {isOwner ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                Owner
                                            </span>
                                        ) : (
                                            <select
                                                value={displayRole}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                disabled={isUpdatingRole || isSelf} // Owner can't demote self easily via this select
                                                className={`w-full max-w-[140px] px-2 py-1.5 rounded-lg text-xs font-medium border border-gray-700 outline-none transition-colors appearance-none cursor-pointer ${isSelf
                                                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-50'
                                                    : 'bg-gray-900 text-gray-300 hover:bg-gray-800 focus:border-[#F2CE88]'
                                                    }`}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="project_manager">Project Manager</option>
                                                <option value="hr_manager">HR Manager</option>
                                                <option value="member">Member</option>
                                                <option value="guest">Guest</option>
                                            </select>
                                        )}
                                    </div>

                                    {/* Joined At */}
                                    <div className="col-span-3 text-sm text-gray-400">
                                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                                    </div>

                                    {/* Actions */}

                                    <div className="col-span-2 flex justify-end relative member-actions-menu">
                                        {!isSelf && (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === member.id ? null : member.id);
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>

                                                {/* Dropdown Menu - z-index high, no border, ensure visible */}
                                                {openMenuId === member.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a24] rounded-lg shadow-xl z-[100] py-1 overflow-visible animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black ring-opacity-5">
                                                        {!isOwner && (
                                                            <button
                                                                onClick={() => handleSetOwner(member.id)}
                                                                className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                                </svg>
                                                                Set as Owner
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleDisable(member.id)}
                                                            className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                            Disable
                                                        </button>

                                                        <div className="h-px bg-gray-800 my-1" />

                                                        <button
                                                            onClick={() => handleRemove(member.id)}
                                                            disabled={isRemoving || isSelf} // Cannot delete self here easily without confirmation of leaving
                                                            className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2 ${isSelf ? 'text-gray-600 cursor-not-allowed' : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                                                }`}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Remove from Organization
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No members found
                    </div>
                )}
            </div>

            {/* Invite Modal Placeholder */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a24] rounded-xl border border-gray-800 p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-semibold text-white">Invite Member</h3>
                        <p className="text-sm text-gray-400">
                            Invitation feature requires backend implementation (user search). Coming soon.
                        </p>
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
