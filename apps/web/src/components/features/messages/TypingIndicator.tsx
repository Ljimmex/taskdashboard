import type { TypingUser } from '@/hooks/useTypingIndicator'
import { useTranslation } from 'react-i18next'

interface TypingIndicatorProps {
    typingUsers: TypingUser[]
    className?: string
}

export function TypingIndicator({ typingUsers, className = '' }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null
    const { t } = useTranslation()

    const renderText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].userName} ${t('messages.isTyping')}`
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0].userName} ${t('messages.and')} ${typingUsers[1].userName} ${t('messages.areTyping')}`
        } else {
            return `${typingUsers[0].userName} ${t('messages.and')} ${typingUsers.length - 1} ${t('messages.othersAreTyping')}`
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
