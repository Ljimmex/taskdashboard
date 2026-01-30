import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEncryption } from './useEncryption'
import { encryptHybrid, decryptHybrid, type EncryptedMessagePacket } from '@/lib/crypto'
import type { Conversation, ConversationMessage } from '@taskdashboard/types'
import { useEffect } from 'react'
import { useSession } from '@/lib/auth'
import { apiFetch, apiFetchJson } from '@/lib/api'

// Helper to parse JSONB content safely
function parseMessageContent(content: string): EncryptedMessagePacket | string {
    try {
        const parsed = JSON.parse(content)
        // Check if it fits the encrypted packet shape
        if (parsed.v === "1" && parsed.data && parsed.iv && parsed.key) {
            return parsed as EncryptedMessagePacket
        }
        return content // Return raw if not our encrypted format
    } catch {
        return content // Return raw string if not JSON
    }
}

export function useConversations(workspaceId: string) {
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const { keys, isLoading: isKeysLoading } = useEncryption(workspaceId)

    // 1. Fetch Conversations List
    const conversationsQuery = useQuery({
        queryKey: ['conversations', workspaceId, session?.user?.id],
        queryFn: async () => {
            const json = await apiFetchJson<any>(`/api/conversations?workspaceId=${workspaceId}`, {
                headers: {
                    'x-user-id': session?.user?.id || ''
                }
            })
            return json.data as Conversation[]
        },
        enabled: !!workspaceId && !!session?.user?.id
    })

    // 2. Send Message Mutation (ENCRYPTION HERE)
    const sendMessageMutation = useMutation({
        mutationFn: async ({ conversationId, content, attachments = [] }: {
            conversationId: string,
            content: string,
            attachments?: any[]
        }) => {
            if (!keys?.publicKey) {
                throw new Error('Encryption keys not available. Cannot send message.')
            }

            console.log('🔐 Encrypting message...')
            const encryptedPacket = await encryptHybrid(content, keys.publicKey)
            const encryptedContent = JSON.stringify(encryptedPacket)

            const response = await apiFetch(`/api/conversations/${conversationId}/messages`, {
                method: 'PATCH',
                body: JSON.stringify({
                    content: encryptedContent, // Sending JSON string as content
                    attachments
                })
            })

            if (!response.ok) throw new Error('Failed to send message')
            return response.json()
        },
        onSuccess: (_, { conversationId }) => {
            queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
            queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] })
        }
    })

    // 3. Edit Message Mutation (RE-ENCRYPTION)
    const editMessageMutation = useMutation({
        mutationFn: async ({ conversationId, messageId, newContent }: {
            conversationId: string,
            messageId: string,
            newContent: string
        }) => {
            if (!keys?.publicKey) {
                throw new Error('Encryption keys not available. Cannot edit message.')
            }

            console.log('🔐 Re-encrypting edited message...')
            const encryptedPacket = await encryptHybrid(newContent, keys.publicKey)
            const encryptedContent = JSON.stringify(encryptedPacket)

            const response = await apiFetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    content: encryptedContent
                })
            })

            if (!response.ok) throw new Error('Failed to edit message')
            return response.json()
        },
        onSuccess: (_, { conversationId }) => {
            queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
        }
    })

    // 4. Delete Message Mutation
    const deleteMessageMutation = useMutation({
        mutationFn: async ({ conversationId, messageId }: {
            conversationId: string,
            messageId: string
        }) => {
            const response = await apiFetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Failed to delete message')
            return response.json()
        },
        onSuccess: (_, { conversationId }) => {
            queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] })
        }
    })

    return {
        conversations: conversationsQuery.data,
        isLoading: conversationsQuery.isLoading || isKeysLoading,
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending,
        editMessage: editMessageMutation.mutateAsync,
        isEditing: editMessageMutation.isPending,
        deleteMessage: deleteMessageMutation.mutateAsync,
        isDeleting: deleteMessageMutation.isPending
    }
}

export function useConversationMessages(conversationId: string, workspaceId: string) {
    const { keys, isLoading: isKeysLoading } = useEncryption(workspaceId)
    const queryClient = useQueryClient()

    const messagesQuery = useQuery({
        queryKey: ['conversations', conversationId, 'messages'],
        queryFn: async () => {
            const json = await apiFetchJson<any>(`/api/conversations/${conversationId}`)
            const conversation = json.data as Conversation

            if (!conversation.messages) return []

            // Decrypt messages
            if (!keys?.privateKey) {
                console.warn('⚠️ No private key available, returning raw encrypted messages')
                return conversation.messages // Return raw if key missing (UI handles this?)
            }

            console.log('🔓 Decrypting messages...')
            const decryptedMessages = await Promise.all(
                (conversation.messages as ConversationMessage[]).map(async (msg) => {
                    // Try to decrypt content
                    const parsed = parseMessageContent(msg.content)

                    if (typeof parsed === 'string') {
                        // It's plain text (legacy or system message?)
                        return msg
                    }

                    try {
                        const decryptedText = await decryptHybrid(parsed, keys.privateKey)
                        return { ...msg, content: decryptedText }
                    } catch (err) {
                        console.error(`Failed to decrypt message ${msg.id}`, err)
                        return { ...msg, content: '🚫 [Error: Failed to decrypt message]' }
                    }
                })
            )

            return decryptedMessages
        },
        enabled: !!conversationId && !!keys?.privateKey // Only fetch/decrypt if we have keys
    })

    // Real-time subscription for live updates
    useEffect(() => {
        if (!conversationId || !keys?.privateKey) return

        let channel: any = null

            // Async setup in IIFE
            ; (async () => {
                const { supabase } = await import('@/lib/supabase')

                console.log(`🔴 Subscribing to real-time updates for conversation ${conversationId}`)

                channel = supabase
                    .channel(`conversation:${conversationId}`)
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'conversations',
                        filter: `id=eq.${conversationId}`
                    }, async (payload) => {
                        console.log('📨 Real-time update received:', payload.eventType)

                        const newConversation = payload.new as Conversation
                        const newMessages = newConversation.messages as ConversationMessage[]

                        if (!newMessages || newMessages.length === 0) return

                        // Decrypt new messages
                        const decryptedMessages = await Promise.all(
                            newMessages.map(async (msg) => {
                                const parsed = parseMessageContent(msg.content)

                                if (typeof parsed === 'string') return msg

                                try {
                                    const decryptedText = await decryptHybrid(parsed, keys.privateKey)
                                    return { ...msg, content: decryptedText }
                                } catch (err) {
                                    console.error(`Real-time decrypt failed for message ${msg.id}`, err)
                                    return { ...msg, content: '🚫 [Decryption failed]' }
                                }
                            })
                        )

                        // Update React Query cache
                        queryClient.setQueryData(
                            ['conversations', conversationId, 'messages'],
                            decryptedMessages
                        )
                    })
                    .subscribe((status) => {
                        console.log(`Realtime subscription status: ${status}`)
                    })
            })()

        return () => {
            if (channel) {
                console.log(`🔴 Unsubscribing from conversation ${conversationId}`)
                channel.unsubscribe()
            }
        }
    }, [conversationId, keys?.privateKey, queryClient])

    return {
        messages: messagesQuery.data,
        isLoading: messagesQuery.isLoading || isKeysLoading,
        error: messagesQuery.error
    }
}
