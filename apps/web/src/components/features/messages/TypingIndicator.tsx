import type { TypingUser } from '@/hooks/useTypingIndicator'

interface TypingIndicatorProps {
    typingUsers: TypingUser[]
    className?: string
}

export function TypingIndicator({ typingUsers, className = '' }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null

    const renderText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].userName} is typing...`
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
        } else {
            return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`
        }
    }

    return (
        <div className={`flex items-center gap-2 text-sm text-gray-500 px-4 py-2 ${className}`}>
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
            <span className="italic">{renderText()}</span>
        </div>
    )
}
