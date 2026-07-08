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
    <div className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-500 ${className}`}>
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
      </div>
      <span className="italic">{renderText()}</span>
    </div>
  )
}
