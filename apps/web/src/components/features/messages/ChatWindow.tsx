import { useEffect, useRef, useState } from 'react'
import { Phone, Video, MoreVertical } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { useQuery } from '@tanstack/react-query'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { apiFetch, apiFetchJson } from '@/lib/api'
import { useEncryption } from '@/hooks/useEncryption'
import { encryptHybrid } from '@/lib/crypto'
import { useSession } from '@/lib/auth'

interface ChatWindowProps {
    recipientUserId?: string
    currentUserId: string
    workspaceId: string
    workspaceSlug: string
    onSettingsClick: () => void
}

export function ChatWindow({
    recipientUserId,
    currentUserId,
    workspaceId,
    workspaceSlug,
    onSettingsClick
}: ChatWindowProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [isSending, setIsSending] = useState(false)
    const { data: session } = useSession()

    // 1. Get recipient details from team members list
    const { members } = useTeamMembers(workspaceSlug)
    const recipient = members.find(m => m.id === recipientUserId)

    // 2a. Get Encryption Keys
    const { keys } = useEncryption(workspaceId)

    // 2. Fetch or create conversation for this user pair
    const { data: conversation } = useQuery({
        queryKey: ['conversation', currentUserId, recipientUserId],
        queryFn: async () => {
            if (!currentUserId || !recipientUserId) return null
            try {
                // Try fetching existing conversation
                const res = await apiFetchJson<any>(`/api/conversations/direct?userId1=${currentUserId}&userId2=${recipientUserId}`, {
                    headers: {
                        'x-user-id': currentUserId
                    }
                })
                return res.conversation
            } catch (err) {
                // If 404, it will be created on first message
                return null
            }
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
                typingUsers: json.data?.typingUsers || []
            }
        },
        enabled: !!conversation?.id,
        refetchInterval: 1000 // Poll every 1s for faster typing updates
    })

    const messages = conversationData?.messages || []
    const typingUsers = conversationData?.typingUsers || []

    // 4. Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    useEffect(() => {
        scrollToBottom()
    }, [messages, typingUsers]) // Scroll when typing changes too

    // State for global editing
    const [editingMessage, setEditingMessage] = useState<{ id: string, content: string } | null>(null)

    // EARLY UI RETURN (After all hooks)
    if (!recipientUserId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#13161c] text-gray-500">
                Select a team member to start chatting
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
            }

            // Encrypt message if public key is available
            let finalContent = content
            if (keys?.publicKey) {
                try {
                    const packet = await encryptHybrid(content, keys.publicKey)
                    finalContent = JSON.stringify(packet)
                } catch (err) {
                    console.error('Encryption failed:', err)
                    alert('Failed to encrypt message. Security check failed.')
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
                    senderId: currentUserId
                })
            })

            if (!res.ok) throw new Error('Failed to send')

            // Refetch messages
            refetchMessages()
        } catch (error) {
            console.error('Failed to send message:', error)
            alert('Failed to send message')
        } finally {
            setIsSending(false)
            setEditingMessage(null) // Reset edit state if it was editing
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

    // Called when user submits the edit from the main input
    const handleEditSubmit = async (messageId: string, newContent: string) => {
        if (!conversation?.id) return

        try {
            let finalContent = newContent
            if (keys?.publicKey) {
                const packet = await encryptHybrid(newContent, keys.publicKey)
                finalContent = JSON.stringify(packet)
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

    return (
        <div className="flex-1 flex flex-col bg-[#13161c]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-[#13161c]">
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
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#13161c] rounded-full"></div>
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-100">{recipient?.name || 'Unknown User'}</h2>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${recipient?.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                                {recipient?.isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-gray-400">
                    <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <Video className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onSettingsClick}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {!conversation ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Start your conversation with {recipient?.name}</p>
                    </div>
                ) : messages && messages.length > 0 ? (
                    <>
                        {messages.map((msg: any) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                currentUserId={currentUserId}
                                privateKey={keys?.privateKey}
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
                                onReact={(emoji) => handleReact(msg.id, emoji)}
                                onEdit={(content) => handleStartEdit(msg.id, content)}
                            />
                        ))}

                        {/* Typing Indicator */}
                        {typingUsers.length > 0 && typingUsers.includes(recipientUserId) && (
                            <div className="flex flex-col mb-4 items-start">
                                <div className="flex gap-3 max-w-[80%] flex-row relative">
                                    <div className="flex-shrink-0 self-end -mb-1">
                                        {recipient?.avatar ? (
                                            <img src={recipient.avatar} alt={recipient.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#13161c]" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#13161c] bg-gradient-to-br from-gray-700 to-gray-600">
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
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No messages yet. Start the conversation!</p>
                    </div>
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
            />
        </div>
    )
}
