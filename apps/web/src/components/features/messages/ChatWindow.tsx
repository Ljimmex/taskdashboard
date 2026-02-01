import { useEffect, useRef, useState } from 'react'
import { Phone, Video, MoreVertical } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { useQuery } from '@tanstack/react-query'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { apiFetch, apiFetchJson } from '@/lib/api'

interface ChatWindowProps {
    recipientUserId?: string
    workspaceId: string
    currentUserId: string
    onSettingsClick?: () => void
}

export function ChatWindow({
    recipientUserId,
    workspaceId,
    currentUserId,
    onSettingsClick
}: ChatWindowProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [isSending, setIsSending] = useState(false)

    // 1. Get recipient info (Always call hooks at the top)
    const { members } = useTeamMembers(workspaceId)
    const recipient = members.find(m => m.id === recipientUserId)

    // 2. Fetch or create conversation for this user pair
    const { data: conversation } = useQuery({
        queryKey: ['conversation', currentUserId, recipientUserId],
        queryFn: async () => {
            try {
                const json = await apiFetchJson<any>(`/api/conversations/direct?userId1=${currentUserId}&userId2=${recipientUserId}`)
                return json.conversation
            } catch (e) {
                // Conversation doesn't exist yet, will be created on first message
                return null
            }
        },
        enabled: !!recipientUserId && !!currentUserId
    })

    // 3. Fetch messages for the conversation
    const { data: messages, refetch: refetchMessages } = useQuery({
        queryKey: ['messages', conversation?.id],
        queryFn: async () => {
            if (!conversation?.id) return []
            const json = await apiFetchJson<any>(`/api/conversations/${conversation.id}/messages`)
            return json.data || []
        },
        enabled: !!conversation?.id
    })

    // 4. Auto-scroll to bottom
    useEffect(() => {
        if (messages) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    // EARLY UI RETURN (After all hooks)
    if (!recipientUserId) {
        return (
            <div className="flex-1 flex flex-col h-full bg-[#12121a]">
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Select a team member to start messaging</p>
                </div>
            </div>
        )
    }

    const handleSendMessage = async (content: string) => {
        if (!content.trim() || isSending) return

        setIsSending(true)
        try {
            // If no conversation exists yet, create it
            let conversationId = conversation?.id

            if (!conversationId) {
                const createData = await apiFetchJson<any>('/api/conversations/direct', {
                    method: 'POST',
                    body: JSON.stringify({
                        workspaceId,
                        userId1: currentUserId,
                        userId2: recipientUserId
                    })
                })
                conversationId = createData.conversation.id
            }

            // Send message
            const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                body: JSON.stringify({
                    content,
                    senderId: currentUserId
                })
            })

            if (!res.ok) throw new Error('Failed to send message')

            // Refetch messages
            refetchMessages()
        } catch (error) {
            console.error('Failed to send message:', error)
            alert('Failed to send message')
        } finally {
            setIsSending(false)
        }
    }

    const handleTyping = (isTyping: boolean) => {
        // TODO: Implement typing indicator
        console.log('Typing:', isTyping)
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#12121a]">
            {/* Header */}
            <div className="bg-[#12121a] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {recipient?.avatar ? (
                        <img
                            src={recipient.avatar}
                            alt={recipient.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {recipient?.name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                    )}
                    <div>
                        <h2 className="font-semibold text-gray-200">{recipient?.name || 'User'}</h2>
                        <p className="text-xs text-gray-500">
                            {recipient?.isOnline ? 'Active now' : 'Offline'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                        <Phone className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                        <Video className="w-5 h-5 text-gray-400" />
                    </button>
                    {onSettingsClick && (
                        <button
                            onClick={onSettingsClick}
                            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                        >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
                            />
                        ))}
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
                disabled={isSending}
            />
        </div>
    )
}
