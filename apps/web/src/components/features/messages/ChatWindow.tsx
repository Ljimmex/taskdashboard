import { useEffect, useRef, useState } from 'react'
import { Phone, Video, MoreVertical, Search, FileText, Bell, Pin, X } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useEncryption } from '@/hooks/useEncryption'
import { decryptWithFallback, decryptMessage, MessageEnvelope, encryptMessage, importPublicKey } from '@/lib/crypto'
import { useSession } from '@/lib/auth'
import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

interface ChatWindowProps {
    recipientUserId?: string
    currentUserId: string
    workspaceId: string
    workspaceSlug: string
}

export function ChatWindow({
    recipientUserId,
    currentUserId,
    workspaceId,
    workspaceSlug
}: ChatWindowProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [isSending, setIsSending] = useState(false)
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const { t, i18n } = useTranslation()
    const locale = i18n.language === 'pl' ? pl : enUS

    // 1. Get recipient details from team members list
    const { members } = useTeamMembers(workspaceSlug)
    const recipient = members.find(m => m.id === recipientUserId)

    // 2a. Get Encryption Keys
    const { publicKey, privateKey } = useEncryption()

    // 2. Fetch or create conversation for this user pair
    const { data: conversation } = useQuery({
        queryKey: ['conversation', currentUserId, recipientUserId],
        queryFn: async () => {
            if (!currentUserId || !recipientUserId) return null
            // Use apiFetch (not apiFetchJson) to avoid throwing on 404
            // 404 is expected when no prior DM exists between these users
            const res = await apiFetch(`/api/conversations/direct?userId1=${currentUserId}&userId2=${recipientUserId}`, {
                headers: {
                    'x-user-id': currentUserId
                }
            })
            if (!res.ok) return null // 404 = no conversation yet, not an error
            const data = await res.json()
            return data.conversation
        },
        enabled: !!currentUserId && !!recipientUserId
    })

    // 3. Fetch messages for the conversation
    const { data: conversationData, refetch: refetchMessages } = useQuery({
        queryKey: ['messages', conversation?.id],
        queryFn: async () => {
            if (!conversation?.id) return { messages: [], typingUsers: [] }
            const json = await apiFetchJson<any>(`/api/conversations/${conversation.id}`, {
                headers: {
                    'x-user-id': currentUserId
                }
            })
            return {
                messages: json.data?.messages || [],
                typingUsers: json.data?.typingUsers || [],
                participantStates: json.data?.participantStates || {}
            }
        },
        enabled: !!conversation?.id,
        refetchInterval: 1000 // Poll every 1s for faster typing updates
    })

    const messages = conversationData?.messages || []
    const typingUsers = conversationData?.typingUsers || []

    // UI States
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showPinnedOnly, setShowPinnedOnly] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const menuButtonRef = useRef<HTMLButtonElement>(null)

    // Search Cache (Decrypted Content)
    const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({})

    // Decrypt messages for search indexing
    useEffect(() => {
        if (!messages.length || !privateKey) return

        const decryptAll = async () => {
            const newCache: Record<string, string> = { ...decryptedCache }
            let hasChanges = false

            for (const msg of messages) {
                // Skip if already decrypted
                if (newCache[msg.id]) continue

                // Case 1: Deleted
                if (msg.isDeleted) {
                    newCache[msg.id] = 'Usunięto wiadomość'
                    hasChanges = true
                    continue
                }

                // Case 2: V2 Encryption (Object)
                if (typeof msg.content === 'object' && msg.content !== null && 'v' in msg.content) {
                    const envelope = msg.content as unknown as MessageEnvelope
                    if (envelope.v === 2 && privateKey) {
                        try {
                            const decrypted = await decryptMessage(envelope, currentUserId, privateKey)
                            newCache[msg.id] = decrypted
                            hasChanges = true
                        } catch (e) {
                            newCache[msg.id] = '🔒 ' + (t('messages.decryptionError') || 'Decryption failed')
                            hasChanges = true
                        }
                    }
                    continue
                }

                // Case 3: String Content (Legacy V1 or Plain)
                if (typeof msg.content === 'string') {
                    try {
                        // Try parsing as JSON first
                        let parsed
                        try {
                            parsed = JSON.parse(msg.content)
                        } catch {
                            // Plain text (not JSON)
                            newCache[msg.id] = msg.content
                            hasChanges = true
                            continue
                        }

                        // System message check
                        if (parsed.type === 'system') {
                            const actionText = parsed.action === 'pin' ? 'pinned a message.' : 'unpinned a message.'
                            // Simplified for search index - exact formatting happens in Bubble
                            newCache[msg.id] = `${parsed.actorId === currentUserId ? 'You' : 'User'} ${actionText}`
                            hasChanges = true
                            continue
                        }

                        // Encrypted check (Legacy V1)
                        if (parsed.v === '1' && parsed.data && parsed.key && parsed.iv) {
                            try {
                                const allKeys = [privateKey].filter(Boolean) as CryptoKey[]
                                const decrypted = await decryptWithFallback(parsed, allKeys)
                                newCache[msg.id] = decrypted
                                hasChanges = true
                            } catch (err) {
                                newCache[msg.id] = '🔒 ' + (t('messages.decryptionError') || 'Encrypted message (key unavailable)')
                                hasChanges = true
                            }
                        } else {
                            // Just JSON content?
                            newCache[msg.id] = msg.content
                            hasChanges = true
                        }
                    } catch (e) {
                        newCache[msg.id] = msg.content
                        hasChanges = true
                    }
                }
            }

            if (hasChanges) {
                setDecryptedCache(newCache)
            }
        }

        decryptAll()
    }, [messages, privateKey, currentUserId, t])

    // Mark as read when messages load
    useEffect(() => {
        if (conversation?.id && messages.length > 0 && !isMenuOpen && session?.user?.id) {
            const markRead = async () => {
                try {
                    await apiFetch(`/api/conversations/${conversation.id}/read`, {
                        method: 'POST',
                        headers: {
                            'x-user-id': session.user.id
                        }
                    })
                } catch (e) {
                    // Ignore errors
                }
            }
            markRead()
        }
    }, [conversation?.id, messages.length, isMenuOpen, session?.user?.id])

    // Filter Logic
    const filteredMessages = messages.filter((msg: any) => {
        if (showPinnedOnly && !msg.isPinned) return false

        if (showSearch && searchQuery) {
            const contentToSearch = decryptedCache[msg.id] || (typeof msg.content === 'string' ? msg.content : '')
            return contentToSearch.toLowerCase().includes(searchQuery.toLowerCase())
        }
        return true
    })


    // 4. Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    useEffect(() => {
        // Only scroll on new messages if not searching/filtering history
        if (!showSearch && !showPinnedOnly) {
            scrollToBottom()
        }
    }, [messages, typingUsers, showSearch, showPinnedOnly])

    // Handle click outside menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isMenuOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                menuButtonRef.current &&
                !menuButtonRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMenuOpen])


    // State for global editing
    const [editingMessage, setEditingMessage] = useState<{ id: string, content: string } | null>(null)
    const [replyingTo, setReplyingTo] = useState<{ id: string, content: string, senderName: string } | null>(null)

    // EARLY UI RETURN (After all hooks)
    if (!recipientUserId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#1a1a24] text-gray-500">
                {t('messages.selectMember')}
            </div>
        )
    }

    const handleSendMessage = async (content: string) => {
        if (!content.trim() || !recipientUserId) return

        setIsSending(true)
        try {
            // Check if editing
            if (editingMessage) {
                await handleEditSubmit(editingMessage.id, content)
                return
            }

            // If no conversation exists yet, create it
            let conversationId = conversation?.id

            if (!conversationId) {
                const createRes = await apiFetchJson<any>('/api/conversations/direct', {
                    method: 'POST',
                    headers: {
                        'x-user-id': currentUserId
                    },
                    body: JSON.stringify({
                        workspaceId,
                        userId1: currentUserId,
                        userId2: recipientUserId
                    })
                })
                conversationId = createRes.conversation.id
                // Invalidate the conversation query so it picks up the newly created conversation
                await queryClient.invalidateQueries({ queryKey: ['conversation', currentUserId, recipientUserId] })
            }

            // Encrypt message
            let finalContent: string | MessageEnvelope = content
            if (publicKey) {
                try {
                    // Fetch all recipient public keys
                    const recipientKeys: Record<string, CryptoKey> = {}
                    
                    // Add our own key
                    recipientKeys[currentUserId] = publicKey

                    // Add recipient key
                    const recipientId = recipientUserId
                    const keysRes = await apiFetchJson<Record<string, string>>('/api/users/public-keys', {
                        method: 'POST',
                        body: JSON.stringify({ userIds: [recipientId] })
                    })
                    
                    if (keysRes[recipientId]) {
                         const recipientPubKey = await importPublicKey(keysRes[recipientId])
                         recipientKeys[recipientId] = recipientPubKey
                         
                         // V2 Encryption
                         const envelope = await encryptMessage(content, recipientKeys)
                         finalContent = envelope // Pass object directly
                    } else {
                        console.warn('Recipient public key not found, sending unencrypted (or fail?)')
                    }

                } catch (err) {
                    console.error('Encryption failed:', err)
                    alert(t('messages.failedToSend'))
                    setIsSending(false)
                    return
                }
            }

            // Send message
            const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'x-user-id': currentUserId
                },
                body: JSON.stringify({
                    content: finalContent,
                    senderId: currentUserId,
                    replyToId: replyingTo?.id
                })
            })

            if (!res.ok) throw new Error('Failed to send')

            // Refetch messages
            refetchMessages()
        } catch (error) {
            console.error('Failed to send message:', error)
            alert(t('messages.failedToSend'))
        } finally {
            setIsSending(false)
            setEditingMessage(null) // Reset edit state if it was editing
            setReplyingTo(null)
        }
    }

    const handleTyping = async (isTyping: boolean) => {
        if (!conversation?.id) return
        try {
            await apiFetch(`/api/conversations/${conversation.id}/typing`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId },
                body: JSON.stringify({ isTyping })
            })
        } catch (e) {
            // Ignore typing errors
        }
    }

    const handleReact = async (messageId: string, emoji: string) => {
        if (!conversation?.id) return

        try {
            await apiFetchJson(`/api/conversations/${conversation.id}/reactions`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId },
                body: JSON.stringify({ messageId, emoji })
            })
            // Refetch to show updated reactions
            refetchMessages()
        } catch (err) {
            console.error('Failed to react:', err)
        }
    }

    // Called when user clicks "Edit" on a bubble - sets up global state
    const handleStartEdit = (messageId: string, currentContent: string) => {
        setEditingMessage({ id: messageId, content: currentContent })
        // Focus will automatically move to input due to sticky state
    }

    const handleEditSubmit = async (messageId: string, newContent: string) => {
        if (!conversation?.id) return

        try {
            let finalContent: string | MessageEnvelope = newContent
            
            if (publicKey && recipientUserId) {
                 const recipientKeys: Record<string, CryptoKey> = {}
                 recipientKeys[currentUserId] = publicKey
                 
                 const keysRes = await apiFetchJson<Record<string, string>>('/api/users/public-keys', {
                     method: 'POST',
                     body: JSON.stringify({ userIds: [recipientUserId] })
                 })
                 
                 if (keysRes[recipientUserId]) {
                      const recipientPubKey = await importPublicKey(keysRes[recipientUserId])
                      recipientKeys[recipientUserId] = recipientPubKey
                      const envelope = await encryptMessage(newContent, recipientKeys)
                      finalContent = envelope
                 }
            }

            await apiFetchJson(`/api/conversations/${conversation.id}/messages/${messageId}`, {
                method: 'PATCH',
                headers: { 'x-user-id': currentUserId },
                body: JSON.stringify({ content: finalContent })
            })
            refetchMessages()
            setEditingMessage(null)
        } catch (err) {
            console.error('Failed to edit:', err)
            throw err // Propagate to handleSendMessage catch
        }
    }

    const handlePin = async (messageId: string, isPinned?: boolean) => {
        if (!conversation?.id) return
        try {
            await apiFetchJson(`/api/conversations/${conversation.id}/messages/${messageId}/pin`, {
                method: 'POST',
                headers: { 'x-user-id': currentUserId },
                body: JSON.stringify({ isPinned })
            })
            refetchMessages()
        } catch (e) {
            console.error('Failed to toggle pin:', e)
        }
    }

    const handleDelete = async (messageId: string) => {
        if (!conversation?.id) return
        if (!confirm(t('messages.confirmDelete'))) return

        try {
            const res = await apiFetchJson<any>(`/api/conversations/${conversation.id}/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': currentUserId }
            })
            if (!res.success) throw new Error(res.error)
            refetchMessages()
        } catch (e: any) {
            console.error('Failed to delete:', e)
            alert(e.message || t('messages.failedToDelete'))
        }
    }

    return (
        <div className="flex-1 flex flex-col bg-[#1a1a24]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#252530] flex items-center justify-between bg-[#1a1a24] relative z-20">
                <div className="flex items-center gap-4">
                    {showSearch ? (
                        <div className="flex items-center bg-[#1a1a24] rounded-lg px-3 py-2 border border-gray-700 w-full md:w-64 animate-in fade-in slide-in-from-left duration-200">
                            <Search className="w-4 h-4 text-gray-500 mr-2" />
                            <input
                                autoFocus
                                type="text"
                                placeholder={t('messages.search')}
                                className="bg-transparent border-none text-sm text-white focus:outline-none w-full placeholder-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button onClick={() => { setShowSearch(false); setSearchQuery('') }} className="text-gray-500 hover:text-white ml-2">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {recipient?.avatar ? (
                                    <img
                                        src={recipient.avatar}
                                        alt={recipient.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                        {recipient?.name?.substring(0, 2).toUpperCase() || '??'}
                                    </div>
                                )}
                                {recipient?.isOnline && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1a1a24] rounded-full"></div>
                                )}
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-100">
                                    {recipient?.name || t('messages.unknownUser')}
                                    {showPinnedOnly && <span className="ml-2 text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">{t('messages.pinnedOnly')}</span>}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs ${recipient?.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                                        {recipient?.isOnline ? t('messages.online') : t('messages.offline')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 text-gray-400 relative">
                    <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <Video className="w-5 h-5" />
                    </button>
                    <div className="relative">
                        <button
                            ref={menuButtonRef}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-2 rounded-lg transition-colors ${isMenuOpen ? 'bg-gray-800 text-white' : 'hover:bg-gray-800'}`}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div
                                ref={menuRef}
                                className="absolute right-0 top-full mt-2 w-56 bg-[#2b2f3e] border border-gray-700 rounded-lg shadow-xl z-50 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-150"
                            >
                                <button
                                    onClick={() => { setShowSearch(true); setIsMenuOpen(false) }}
                                    className="px-4 py-2.5 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-3"
                                >
                                    <Search className="w-4 h-4" />
                                    {t('messages.searchInChat')}
                                </button>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="px-4 py-2.5 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-3"
                                >
                                    <FileText className="w-4 h-4" />
                                    {t('messages.filesAndMedia')}
                                </button>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="px-4 py-2.5 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-3"
                                >
                                    <Bell className="w-4 h-4" />
                                    {t('messages.mute')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPinnedOnly(!showPinnedOnly);
                                        setIsMenuOpen(false);
                                        // Reset other views if needed
                                        setShowSearch(false)
                                    }}
                                    className="px-4 py-2.5 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-3 border-t border-gray-700/50 mt-1"
                                >
                                    <Pin className="w-4 h-4" />
                                    {showPinnedOnly ? t('messages.showAllMessages') : t('messages.pinnedMessages')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 relative">
                {showSearch ? (
                    // Search Results List View
                    <div className="flex flex-col space-y-2">
                        {messages.filter((msg: any) => {
                            if (!searchQuery) return false
                            const contentToSearch = decryptedCache[msg.id] || (typeof msg.content === 'string' ? msg.content : '')
                            return contentToSearch.toLowerCase().includes(searchQuery.toLowerCase())
                        }).length === 0 ? (
                            <div className="flex flex-col items-center justify-center pt-20 text-gray-500 opacity-50">
                                <Search className="w-12 h-12 mb-2" />
                                <p>{t('messages.noMessagesFound')} "{searchQuery}"</p>
                            </div>
                        ) : (
                            messages.filter((msg: any) => {
                                if (!searchQuery) return false
                                const contentToSearch = decryptedCache[msg.id] || (typeof msg.content === 'string' ? msg.content : '')
                                return contentToSearch.toLowerCase().includes(searchQuery.toLowerCase())
                            }).map((msg: any) => {
                                const decryptedContent = decryptedCache[msg.id] || (typeof msg.content === 'string' ? msg.content : '')
                                const isMe = msg.senderId === currentUserId
                                const senderName = isMe ? t('messages.you') : (msg.senderId === 'system' ? t('messages.system') : recipient?.name || t('messages.user'))
                                const avatar = isMe ? session?.user?.image : recipient?.avatar

                                return (
                                    <button
                                        key={msg.id}
                                        onClick={() => {
                                            setShowSearch(false)
                                            setSearchQuery('')
                                            setTimeout(() => {
                                                const el = document.getElementById(`message-${msg.id}`)
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                    el.classList.add('bg-white/5', 'transition-colors', 'duration-500')
                                                    setTimeout(() => el.classList.remove('bg-white/5'), 2000)
                                                }
                                            }, 100)
                                        }}
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group w-full"
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            {avatar ? (
                                                <img src={avatar} alt={senderName} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {senderName.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between">
                                                <span className="font-semibold text-gray-200 text-sm">{senderName}</span>
                                            </div>
                                            <div className="text-sm text-gray-400 mt-0.5 line-clamp-2 break-words">
                                                <span className="text-gray-300">
                                                    {/* Simple highlighting */}
                                                    {decryptedContent.split(new RegExp(`(${searchQuery})`, 'gi')).map((part: string, i: number) =>
                                                        part.toLowerCase() === searchQuery.toLowerCase() ? <span key={i} className="text-white font-bold">{part}</span> : part
                                                    )}
                                                </span>
                                                <span className="mx-1.5 text-gray-600">•</span>
                                                <span className="text-xs text-gray-500">
                                                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true, locale })}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>
                ) : (
                    // Normal Chat View
                    <>
                        {!conversation ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">{t('messages.startConversation')} {recipient?.name}</p>
                            </div>
                        ) : filteredMessages.length > 0 ? (
                            <>
                                {filteredMessages.map((msg: any) => {
                                    // Calculate status
                                    let status: 'sent' | 'delivered' | 'read' = 'sent'
                                    if (msg.senderId === currentUserId) {
                                        // Use polled participantStates if available, fallback to initial
                                        const states = conversationData?.participantStates || conversation?.participantStates
                                        const recipientState = states?.[recipientUserId || '']
                                        if (recipientState) {
                                            if (recipientState.readAt && new Date(recipientState.readAt) >= new Date(msg.timestamp)) {
                                                status = 'read'
                                            } else if (recipientState.deliveredAt && new Date(recipientState.deliveredAt) >= new Date(msg.timestamp)) {
                                                status = 'delivered'
                                            }
                                        }
                                    }

                                    return (
                                        <MessageBubble
                                            key={msg.id}
                                            domId={`message-${msg.id}`}
                                            message={msg}
                                            currentUserId={currentUserId}
                                            privateKey={privateKey || undefined}
                                            historyKeys={privateKey ? [privateKey] : []}
                                            senderAvatar={
                                                (msg.senderId === currentUserId
                                                    ? session?.user?.image
                                                    : recipient?.avatar) || undefined
                                            }
                                            senderName={
                                                (msg.senderId === currentUserId
                                                    ? session?.user?.name
                                                    : recipient?.name) || '??'
                                            }
                                            recipientName={recipient?.name}
                                            status={status}
                                            onReact={(emoji) => handleReact(msg.id, emoji)}
                                            onEdit={(content) => handleStartEdit(msg.id, content)}
                                            onReply={(content) => setReplyingTo({
                                                id: msg.id,
                                                content: content,
                                                senderName: msg.senderId === currentUserId ? t('messages.you') : recipient?.name || t('messages.unknownUser')
                                            })}
                                            onPin={() => handlePin(msg.id, !msg.isPinned)}
                                            onDelete={() => handleDelete(msg.id)}
                                            replyToMessage={msg.replyToId ? messages.find((m: any) => m.id === msg.replyToId) : undefined}
                                        />
                                    )
                                })}

                                {/* Typing Indicator */}
                                {!showPinnedOnly && typingUsers.length > 0 && typingUsers.includes(recipientUserId) && (
                                    <div className="flex flex-col mb-4 items-start">
                                        <div className="flex gap-3 max-w-[80%] flex-row relative">
                                            <div className="flex-shrink-0 self-end -mb-1">
                                                {recipient?.avatar ? (
                                                    <img src={recipient.avatar} alt={recipient.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#1a1a24]" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#1a1a24] bg-gradient-to-br from-gray-700 to-gray-600">
                                                        {recipient?.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="rounded-2xl px-4 py-3 bg-[#2b2f3e] text-gray-100 rounded-bl-sm border border-gray-700/50 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                {showPinnedOnly ? (
                                    <>
                                        <Pin className="w-12 h-12 mb-2" />
                                        <p>{t('messages.noPinnedMessages')}</p>
                                    </>
                                ) : (
                                    <>
                                        <p>{t('messages.noMessagesYet')}</p>
                                        <p className="text-sm">{t('messages.startConversationCta')}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Input */}
            <MessageInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                isEditing={!!editingMessage}
                editValue={editingMessage?.content}
                onCancelEdit={() => setEditingMessage(null)}
                disabled={isSending}
                replyTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
            />
        </div>
    )
}
