import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/lib/auth'
import { apiFetchJson } from '@/lib/api'
import { useTeamMembers } from '@/hooks/useTeamMembers'

interface ConversationListProps {
    workspaceId: string
    selectedConversationId?: string
    onSelectConversation: (userId: string) => void
}

export function ConversationList({
    workspaceId,
    selectedConversationId,
    onSelectConversation
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
    const [showSortDropdown, setShowSortDropdown] = useState(false)
    const { members, isLoading } = useTeamMembers(workspaceId)
    const sortDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setShowSortDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Fetch direct conversations to get last messages
    const { data: session } = useSession()
    const { data: conversations } = useQuery({
        queryKey: ['conversations', 'direct', workspaceId],
        queryFn: async () => {
            const json = await apiFetchJson<any>(`/api/conversations?workspaceId=${workspaceId}&type=direct`, {
                headers: { 'x-user-id': session?.user?.id || '' }
            })
            return json.data || []
        },
        enabled: !!session?.user?.id && !!workspaceId,
        refetchInterval: 5000 // Poll for new messages
    })

    // Map participant ID to last message
    const lastMessageMap = new Map()
    if (conversations) {
        conversations.forEach((conv: any) => {
            if (conv.lastMessage && conv.participants) {
                const otherUserId = conv.participants.filter((p: string) => p !== session?.user?.id)[0]
                if (otherUserId) {
                    lastMessageMap.set(otherUserId, conv.lastMessage)
                }
            }
        })
    }

    const formatShortTime = (date: Date) => {
        const now = new Date()
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) return 'now'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
        return `${Math.floor(diffInSeconds / 604800)}w`
    }

    // Filter and sort members
    const filteredMembers = members
        ?.filter((member) =>
            member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name)
            }
            // Sort by last active (online first, then by last active time)
            const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0
            const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0
            return bTime - aTime
        }) || []

    return (
        <div className="w-80 bg-[#0d1117] flex flex-col h-full">
            {/* Header */}
            <div className="p-4">
                {/* Search + Sort */}
                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-focus-within:hidden">
                                <circle cx="14" cy="14" r="8" stroke="#9E9E9E" strokeWidth="4" />
                                <path d="M21 21L27 27" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-focus-within:block">
                                <circle cx="14" cy="14" r="8" stroke="#F2CE88" strokeWidth="4" />
                                <path d="M21 21L27 27" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search team..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a0a0f] text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 text-sm"
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative" ref={sortDropdownRef}>
                        <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="px-3 py-2.5 rounded-xl bg-[#0a0a0f] text-gray-400 hover:border-amber-500/50 transition-colors text-sm flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <span className="text-gray-500">Sort by:</span>
                            <span className="text-amber-500">{sortBy === 'date' ? 'Date' : 'Name'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showSortDropdown && (
                            <div className="absolute right-0 top-12 w-36 bg-[#1a1f2e] rounded-lg shadow-2xl overflow-hidden z-50 border border-gray-800">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setSortBy('date')
                                            setShowSortDropdown(false)
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${sortBy === 'date' ? 'bg-amber-500/20 text-amber-500' : 'text-gray-300 hover:bg-gray-800'
                                            }`}
                                    >
                                        Date
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortBy('name')
                                            setShowSortDropdown(false)
                                        }}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${sortBy === 'name' ? 'bg-amber-500/20 text-amber-500' : 'text-gray-300 hover:bg-gray-800'
                                            }`}
                                    >
                                        Name
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Team Members List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-gray-500">
                        Loading team members...
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        {searchQuery ? 'No members found' : 'No team members yet'}
                    </div>
                ) : (
                    filteredMembers.map((member) => {
                        const lastMsg = lastMessageMap.get(member.id)
                        // Determine status color
                        let statusColor = 'bg-gray-500' // Offline
                        let glowClass = ''

                        if (member.isOnline) {
                            statusColor = 'bg-green-500'
                            glowClass = 'shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                        } else if (member.lastActiveAt) {
                            // Check if away (< 1h)
                            const diffMins = (Date.now() - new Date(member.lastActiveAt).getTime()) / (1000 * 60)
                            if (diffMins < 60) {
                                statusColor = 'bg-yellow-500'
                                glowClass = 'shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                            }
                        }

                        return (
                            <button
                                key={member.id}
                                onClick={() => onSelectConversation(member.id)}
                                className={`
                                w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1a1a24] transition-colors text-left border-l-4
                                ${selectedConversationId === member.id ? 'bg-[#1a1a24] border-amber-500' : 'border-transparent'}
                            `}
                            >
                                {/* Avatar with glowing online indicator */}
                                <div className="relative flex-shrink-0">
                                    {member.avatar ? (
                                        <img
                                            src={member.avatar}
                                            alt={member.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor} border-2 border-[#0d1117] rounded-full transition-all duration-300 ${glowClass}`}></div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h3 className="font-semibold text-gray-200 truncate pr-2">
                                            {member.name}
                                        </h3>
                                        {/* Timestamp: Show last message time if exists, else last active */}
                                        {(lastMsg?.timestamp || member.lastActiveAt) && (
                                            <span className="text-[11px] text-gray-500 flex-shrink-0">
                                                {formatShortTime(new Date(lastMsg?.timestamp || member.lastActiveAt))}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-400 truncate">
                                        {lastMsg ? (
                                            <span className={!lastMsg.read ? 'text-gray-300' : ''}>
                                                {lastMsg.senderId === session?.user?.id && 'You: '}
                                                {lastMsg.content}
                                            </span>
                                        ) : (
                                            <span className="italic opacity-50">{member.position || 'No messages'}</span>
                                        )}
                                    </p>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
