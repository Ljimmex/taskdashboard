import { useState, useEffect } from 'react'
import type { ConversationMessage } from '@taskdashboard/types'

interface UnreadData {
    [conversationId: string]: string // ISO timestamp of last read
}

const STORAGE_KEY = 'unread_timestamps'

export function useUnreadCount(conversationId: string, messages: ConversationMessage[] = []) {
    const [unreadCount, setUnreadCount] = useState(0)
    const [lastReadAt, setLastReadAt] = useState<string | null>(null)

    // Load last read timestamp from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                const data: UnreadData = JSON.parse(stored)
                const timestamp = data[conversationId]
                setLastReadAt(timestamp || null)
            }
        } catch (e) {
            console.error('Failed to load unread data', e)
        }
    }, [conversationId])

    // Calculate unread count
    useEffect(() => {
        if (!lastReadAt) {
            setUnreadCount(messages.length)
            return
        }

        const lastReadDate = new Date(lastReadAt)
        const unread = messages.filter(msg => {
            const msgDate = new Date(msg.timestamp)
            return msgDate > lastReadDate
        })

        setUnreadCount(unread.length)
    }, [messages, lastReadAt])

    // Mark as read (update timestamp)
    const markAsRead = () => {
        const now = new Date().toISOString()

        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            const data: UnreadData = stored ? JSON.parse(stored) : {}
            data[conversationId] = now
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
            setLastReadAt(now)
        } catch (e) {
            console.error('Failed to mark as read', e)
        }
    }

    // Mark as read when user views conversation
    const markAsReadOnView = () => {
        // Only mark if there are unread messages
        if (unreadCount > 0) {
            markAsRead()
        }
    }

    return {
        unreadCount,
        markAsRead,
        markAsReadOnView
    }
}
