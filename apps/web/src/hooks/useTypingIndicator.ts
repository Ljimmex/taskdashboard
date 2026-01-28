import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/auth'

export interface TypingUser {
    userId: string
    userName: string
    timestamp: number
}

const TYPING_TIMEOUT_MS = 3000 // Clear typing status after 3s

export function useTypingIndicator(conversationId: string) {
    const { data: session } = useSession()
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
    const [channel, setChannel] = useState<any>(null)

    useEffect(() => {
        if (!conversationId || !session?.user) return

        const typingChannel = supabase.channel(`typing:${conversationId}`)

        // Listen to typing events from others
        typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
            const { userId, userName, isTyping } = payload

            // Don't show own typing indicator
            if (userId === session.user.id) return

            setTypingUsers(prev => {
                if (isTyping) {
                    // Add or update typing user
                    const filtered = prev.filter(u => u.userId !== userId)
                    return [...filtered, { userId, userName, timestamp: Date.now() }]
                } else {
                    // Remove typing user
                    return prev.filter(u => u.userId !== userId)
                }
            })
        })

        typingChannel.subscribe()
        setChannel(typingChannel)

        // Auto-clear stale typing indicators
        const interval = setInterval(() => {
            const now = Date.now()
            setTypingUsers(prev =>
                prev.filter(u => now - u.timestamp < TYPING_TIMEOUT_MS)
            )
        }, 1000)

        return () => {
            clearInterval(interval)
            typingChannel.unsubscribe()
        }
    }, [conversationId, session?.user])

    // Function to broadcast typing status
    const setTyping = (isTyping: boolean) => {
        if (!channel || !session?.user) return

        channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
                userId: session.user.id,
                userName: session.user.name || session.user.email,
                isTyping
            }
        })
    }

    return {
        typingUsers,
        setTyping,
        isAnyoneTyping: typingUsers.length > 0
    }
}
