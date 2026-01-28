import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'

interface MessageInputProps {
    onSendMessage: (content: string, attachments?: any[]) => Promise<void>
    onTyping: (isTyping: boolean) => void
    disabled?: boolean
    placeholder?: string
}

export function MessageInput({
    onSendMessage,
    onTyping,
    disabled = false,
    placeholder = 'Type a message...'
}: MessageInputProps) {
    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [message])

    // Handle typing indicator
    const handleInputChange = (value: string) => {
        setMessage(value)

        // Broadcast typing
        if (value.length > 0) {
            onTyping(true)

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }

            // Stop typing after 3s of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false)
            }, 3000)
        } else {
            onTyping(false)
        }
    }

    const handleSend = async () => {
        const trimmedMessage = message.trim()
        if (!trimmedMessage || isSending) return

        setIsSending(true)
        onTyping(false)

        try {
            await onSendMessage(trimmedMessage)
            setMessage('')

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleEmojiSelect = (emoji: string) => {
        setMessage(prev => prev + emoji)
        textareaRef.current?.focus()
    }

    return (
        <div className="bg-[#12121a] p-4">
            <div className="flex items-center gap-2">
                {/* Attachment Button */}
                <button
                    type="button"
                    className="p-2.5 hover:bg-gray-800/50 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Add attachment"
                    disabled
                    title="Coming soon"
                >
                    <Paperclip className="w-5 h-5 text-gray-400" />
                </button>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled || isSending}
                    rows={1}
                    className="flex-1 resize-none bg-[#1a1a24] border border-gray-800 rounded-xl px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 max-h-32 overflow-y-auto disabled:bg-gray-900 disabled:cursor-not-allowed"
                />

                {/* Emoji Picker */}
                <EmojiPicker onEmojiSelect={handleEmojiSelect} className="flex-shrink-0" />

                {/* Voice Message Button */}
                <button
                    type="button"
                    className="p-2.5 hover:bg-gray-800/50 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Voice message"
                    disabled
                    title="Coming soon"
                >
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                </button>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || isSending || disabled}
                    className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                >
                    <Send className={`w-5 h-5 ${isSending ? 'animate-pulse' : ''}`} />
                </button>
            </div>

            {/* Character count (optional) */}
            {message.length > 1000 && (
                <div className="text-xs text-gray-500 mt-1 text-right">
                    {message.length} characters
                </div>
            )}
        </div>
    )
}
