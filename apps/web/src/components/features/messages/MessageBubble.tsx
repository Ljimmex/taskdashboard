import { MessageStatus } from './MessageStatus'
import { formatDistanceToNow } from 'date-fns'
import type { ConversationMessage } from '@taskdashboard/types'

interface MessageBubbleProps {
    message: ConversationMessage
    currentUserId: string
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
    const isOwnMessage = message.senderId === currentUserId

    return (
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`
                max-w-[70%] rounded-lg px-4 py-2
                ${isOwnMessage
                    ? 'bg-amber-500/20 text-gray-100'
                    : 'bg-gray-800/50 text-gray-200'
                }
            `}>
                <p className="text-sm break-words">{message.content}</p>

                {/* Timestamp + Status */}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${isOwnMessage ? 'text-amber-300/70' : 'text-gray-500'}`}>
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                    {isOwnMessage && (
                        <MessageStatus status="sent" />
                    )}
                </div>
            </div>
        </div>
    )
}
