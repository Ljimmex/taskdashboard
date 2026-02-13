import { formatDistanceToNow } from 'date-fns'
import { pl, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { usePresence } from '@/hooks/usePresence'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import type { Conversation, ConversationMessage } from '@taskdashboard/types'

interface ConversationItemProps {
    conversation: Conversation
    isSelected: boolean
    currentUserId: string
    workspaceId: string
    onClick: () => void
}

export function ConversationItem({
    conversation,
    isSelected,
    currentUserId,
    workspaceId,
    onClick
}: ConversationItemProps) {
    const { isOnline } = usePresence(workspaceId)
    const messages = (conversation.messages as ConversationMessage[]) || []
    const { unreadCount } = useUnreadCount(conversation.id, messages)
    const { t, i18n } = useTranslation()
    const locale = i18n.language === 'pl' ? pl : enUS

    // Get last message
    const lastMessage = messages[messages.length - 1]
    const lastMessageText = lastMessage?.content?.substring(0, 50) || t('messages.noMessagesYet')

    // Get other participant (for direct conversations)
    const otherParticipantId = conversation.participants?.find((id: string) => id !== currentUserId)
    const isOtherOnline = otherParticipantId ? isOnline(otherParticipantId) : false

    return (
        <button
            onClick={onClick}
            className={`
                w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30 transition-colors text-left border-l-4
                ${isSelected ? 'bg-gray-800/50 border-amber-500' : 'border-transparent'}
            `}
        >
            {/* Avatar with online indicator */}
            <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {conversation.name?.substring(0, 2).toUpperCase() || 'CH'}
                </div>
                {isOtherOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0f1419] rounded-full"></div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-200 truncate">
                        {conversation.name || t('messages.unnamedConversation')}
                    </h3>
                    {lastMessage && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true, locale })}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 truncate">
                        {lastMessageText}
                    </p>
                    {unreadCount > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    )
}
