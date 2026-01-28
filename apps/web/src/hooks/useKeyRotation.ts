import { useQuery, useMutation } from '@tanstack/react-query'
import { importPublicKey, importPrivateKey, encryptHybrid, decryptHybrid } from '@/lib/crypto'
import { keyStorage } from '@/lib/keyStorage'
import type { Conversation, ConversationMessage } from '@taskdashboard/types'

interface KeyRotationData {
    oldPrivateKey: string
    oldPublicKey: string
    newPublicKey: string
    newPrivateKey: string
    expiresAt: Date
}

export function useKeyRotation(workspaceId: string) {
    // Check if keys are expired
    const isExpired = useQuery({
        queryKey: ['keyExpiration', workspaceId],
        queryFn: async () => {
            const response = await fetch(`/api/workspaces/${workspaceId}/keys`)
            if (!response.ok) return false

            const result = await response.json()
            const expiresAt = result.data?.expiresAt

            if (!expiresAt) return false

            const expirationDate = new Date(expiresAt)
            const now = new Date()

            return now > expirationDate
        },
        enabled: !!workspaceId,
        staleTime: 1000 * 60 * 5 // Check every 5 minutes
    })

    // Rotate keys mutation
    const rotateKeysMutation = useMutation({
        mutationFn: async () => {
            console.log('🔄 Starting key rotation...')

            // 1. Call rotation endpoint
            const rotateResponse = await fetch(`/api/workspaces/${workspaceId}/rotate-keys`, {
                method: 'POST'
            })

            if (!rotateResponse.ok) {
                throw new Error('Failed to rotate keys on server')
            }

            const rotateResult = await rotateResponse.json()
            const rotationData: KeyRotationData = rotateResult.data

            // 2. Import old and new keys
            console.log('🔐 Importing old and new keys...')
            const oldPrivateKeyCrypto = await importPrivateKey(rotationData.oldPrivateKey)
            const newPublicKeyCrypto = await importPublicKey(rotationData.newPublicKey)
            const newPrivateKeyCrypto = await importPrivateKey(rotationData.newPrivateKey)

            // 3. Fetch ALL conversations in workspace
            console.log('📨 Fetching all conversations...')
            const conversationsResponse = await fetch(`/api/conversations?workspaceId=${workspaceId}`)
            if (!conversationsResponse.ok) throw new Error('Failed to fetch conversations')

            const conversationsResult = await conversationsResponse.json()
            const conversations = conversationsResult.data as Conversation[]

            console.log(`📊 Found ${conversations.length} conversations to re-encrypt`)

            // 4. Re-encrypt all messages in each conversation
            let totalMessagesReEncrypted = 0

            for (const conversation of conversations) {
                if (!conversation.messages || conversation.messages.length === 0) continue

                console.log(`🔄 Re-encrypting conversation ${conversation.id}...`)

                const reEncryptedMessages = await Promise.all(
                    (conversation.messages as ConversationMessage[]).map(async (msg) => {
                        try {
                            // Parse encrypted content
                            const parsed = JSON.parse(msg.content)

                            // Decrypt with OLD key
                            const decrypted = await decryptHybrid(parsed, oldPrivateKeyCrypto)

                            // Encrypt with NEW key
                            const reEncrypted = await encryptHybrid(decrypted, newPublicKeyCrypto)

                            return {
                                ...msg,
                                content: JSON.stringify(reEncrypted)
                            }
                        } catch (err) {
                            console.error(`Failed to re-encrypt message ${msg.id}`, err)
                            return msg // Keep old encrypted if fails
                        }
                    })
                )

                // 5. Update conversation with re-encrypted messages
                const updateResponse = await fetch(`/api/conversations/${conversation.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: reEncryptedMessages
                    })
                })

                if (!updateResponse.ok) {
                    console.error(`Failed to update conversation ${conversation.id}`)
                } else {
                    totalMessagesReEncrypted += reEncryptedMessages.length
                }
            }

            // 6. Update local key storage with new keys
            console.log('💾 Updating local key storage...')
            await keyStorage.deleteKeys(workspaceId)
            await keyStorage.saveKeys(workspaceId, newPublicKeyCrypto, newPrivateKeyCrypto)

            console.log(`✅ Key rotation complete! Re-encrypted ${totalMessagesReEncrypted} messages`)

            return {
                messagesReEncrypted: totalMessagesReEncrypted,
                conversationsUpdated: conversations.length
            }
        }
    })

    return {
        isExpired: isExpired.data,
        isCheckingExpiration: isExpired.isLoading,
        rotateKeys: rotateKeysMutation.mutateAsync,
        isRotating: rotateKeysMutation.isPending,
        rotationProgress: rotateKeysMutation.data
    }
}
