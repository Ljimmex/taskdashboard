import { MessageStatus } from './MessageStatus'
import { formatDistanceToNow } from 'date-fns'
import type { ConversationMessage } from '@taskdashboard/types'
import { useEffect, useState } from 'react'
import { decryptHybrid } from '@/lib/crypto'

interface MessageBubbleProps {
    message: ConversationMessage
    currentUserId: string
    privateKey?: CryptoKey
}

export function MessageBubble({ message, currentUserId, privateKey }: MessageBubbleProps) {
    const isOwnMessage = message.senderId === currentUserId
    const [decryptedContent, setDecryptedContent] = useState(message.content)
    const [isEncrypted, setIsEncrypted] = useState(false)

    useEffect(() => {
        const decrypt = async () => {
            if (!privateKey) return

            try {
                // Try to parse as encrypted packet
                const packet = JSON.parse(message.content)
                if (packet.v === '1' && packet.data && packet.key && packet.iv) {
                    setIsEncrypted(true)
                    const plainText = await decryptHybrid(packet, privateKey)
                    setDecryptedContent(plainText)
                }
            } catch (e) {
                // Not a valid JSON or encrypted packet - treat as plain text
                // console.log('Message is not encrypted or failed to decrypt', e)
            }
        }
        decrypt()
    }, [message.content, privateKey])

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`
                max-w-[70%] rounded-lg px-4 py-2 relative group
                ${isOwnMessage
                    ? 'bg-amber-500/20 text-gray-100'
                    : 'bg-gray-800/50 text-gray-200'
                }
            `}>
                <p className="text-sm break-words">{decryptedContent}</p>

                {/* Timestamp + Status */}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${isOwnMessage ? 'text-amber-300/70' : 'text-gray-500'}`}>
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                    {isEncrypted && (
                        <span className="text-[10px] text-green-500/70" title="End-to-End Encrypted">🔒</span>
                    )}
                    {isOwnMessage && (
                        <MessageStatus status="sent" />
                    )}
                </div>
            </div>
        </div>
    )
}
