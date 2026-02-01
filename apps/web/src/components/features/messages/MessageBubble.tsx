import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { decryptHybrid } from '@/lib/crypto'
import type { ConversationMessage } from '@taskdashboard/types'

interface MessageBubbleProps {
    message: ConversationMessage
    currentUserId: string
    privateKey?: CryptoKey
    senderAvatar?: string
    senderName?: string
}

export function MessageBubble({ message, currentUserId, privateKey, senderAvatar, senderName }: MessageBubbleProps) {
    const isOwnMessage = message.senderId === currentUserId
    const [decryptedContent, setDecryptedContent] = useState(message.content)

    useEffect(() => {
        const decrypt = async () => {
            if (!privateKey) return

            try {
                // Try to parse as encrypted packet
                const packet = JSON.parse(message.content)
                if (packet.v === '1' && packet.data && packet.key && packet.iv) {
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

    // Get initials for fallback
    const initials = senderName
        ? senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '?'

    return (
        <div className={`flex flex-col mb-4 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="flex-shrink-0 self-end -mb-1">
                    {senderAvatar ? (
                        <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#13161c]" />
                    ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#13161c] ${isOwnMessage
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                : 'bg-gradient-to-br from-gray-700 to-gray-600'
                            }`}>
                            {initials}
                        </div>
                    )}
                </div>

                {/* Message Bubble */}
                <div className={`
                    rounded-2xl px-5 py-3 shadow-sm relative text-[15px] leading-relaxed break-words whitespace-pre-wrap
                    ${isOwnMessage
                        ? 'bg-amber-600 text-white rounded-br-sm'
                        : 'bg-[#2b2f3e] text-gray-100 rounded-bl-sm border border-gray-700/50'
                    }
                `}>
                    {decryptedContent}
                </div>
            </div>

            {/* Timestamp */}
            <span className={`text-[11px] text-gray-500 mt-1.5 font-medium select-none ${isOwnMessage ? 'mr-12' : 'ml-12'}`}>
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
        </div>
    )
}
