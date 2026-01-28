import { EmojiPicker } from './EmojiPicker'

interface Reaction {
    emoji: string
    userId: string
}

interface MessageReactionsProps {
    messageId: string
    reactions: Reaction[]
    currentUserId: string
    onAddReaction: (messageId: string, emoji: string) => void
    onRemoveReaction: (messageId: string, emoji: string) => void
}

export function MessageReactions({
    messageId,
    reactions = [],
    currentUserId,
    onAddReaction,
    onRemoveReaction
}: MessageReactionsProps) {
    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = []
        }
        acc[reaction.emoji].push(reaction.userId)
        return acc
    }, {} as Record<string, string[]>)

    const handleEmojiClick = (emoji: string) => {
        const users = groupedReactions[emoji] || []
        const hasReacted = users.includes(currentUserId)

        if (hasReacted) {
            onRemoveReaction(messageId, emoji)
        } else {
            onAddReaction(messageId, emoji)
        }
    }

    const handleEmojiSelect = (emoji: string) => {
        onAddReaction(messageId, emoji)
    }

    return (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
            {/* Existing Reactions */}
            {Object.entries(groupedReactions).map(([emoji, users]) => {
                const hasReacted = users.includes(currentUserId)
                const count = users.length

                return (
                    <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className={`
                            text-xs rounded-full px-2 py-0.5 border transition-all
                            ${hasReacted
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                            }
                        `}
                        title={`${users.length} reaction${users.length > 1 ? 's' : ''}`}
                    >
                        <span className="mr-1">{emoji}</span>
                        {count > 1 && <span className="font-medium">{count}</span>}
                    </button>
                )
            })}

            {/* Add Reaction Button */}
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </div>
    )
}
