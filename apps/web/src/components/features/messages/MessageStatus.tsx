import { Check, CheckCheck, Clock, X } from 'lucide-react'

export type MessageStatusType = 'sending' | 'sent' | 'delivered' | 'read' | 'error'

interface MessageStatusProps {
    status: MessageStatusType
    className?: string
}

export function MessageStatus({ status, className = '' }: MessageStatusProps) {
    const baseClasses = 'inline-flex items-center gap-1 text-xs'

    switch (status) {
        case 'sending':
            return (
                <div className={`${baseClasses} text-gray-400 ${className}`}>
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>Sending...</span>
                </div>
            )

        case 'sent':
            return (
                <div className={`${baseClasses} text-gray-500 ${className}`}>
                    <Check className="w-3 h-3" />
                </div>
            )

        case 'delivered':
            return (
                <div className={`${baseClasses} text-gray-600 ${className}`}>
                    <CheckCheck className="w-3 h-3" />
                </div>
            )

        case 'read':
            return (
                <div className={`${baseClasses} text-blue-500 ${className}`}>
                    <CheckCheck className="w-3 h-3" />
                </div>
            )

        case 'error':
            return (
                <div className={`${baseClasses} text-red-500 ${className}`}>
                    <X className="w-3 h-3" />
                    <span>Failed</span>
                </div>
            )

        default:
            return null
    }
}

// Helper hook for managing message status
export function useMessageStatus(messageId: string) {
    // This would integrate with Supabase Realtime to track delivery/read status
    // For now, returning a simple implementation

    // In production:
    // - Listen to Realtime events for delivery confirmations
    // - Track when other users view the conversation (read receipts)
    // - Use optimistic updates for sending state

    return {
        status: 'sent' as MessageStatusType,
        updateStatus: (newStatus: MessageStatusType) => {
            // Update logic here (e.g., broadcast read receipt)
            console.log(`Message ${messageId} status: ${newStatus}`)
        }
    }
}
