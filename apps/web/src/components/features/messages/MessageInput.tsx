import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'

interface MessageInputProps {
    onSendMessage: (content: string, attachments?: any[]) => Promise<void>
    onTyping: (isTyping: boolean) => void
    disabled?: boolean
    placeholder?: string
    isEditing?: boolean
    editValue?: string
    onCancelEdit?: () => void
    replyTo?: { id: string; content: string; senderName: string } | null
    onCancelReply?: () => void
}

export function MessageInput({
    onSendMessage,
    onTyping,
    disabled = false,
    placeholder = 'Type a message...',
    isEditing = false,
    editValue = '',
    onCancelEdit,
    replyTo,
    onCancelReply
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

    // Sync input with external edit value
    useEffect(() => {
        if (isEditing && editValue) {
            setMessage(editValue)
            textareaRef.current?.focus()
        } else if (!isEditing) {
            // setMessage('') // Optional: clear when edit cancelled, or leave draft?
        }
    }, [isEditing, editValue])

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
            {/* Editing Context Banner */}
            {isEditing && (
                <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a24] border-b border-gray-800 text-sm mb-2 rounded-t-lg">
                    <div className="flex items-center gap-2 text-amber-500">
                        <span className="font-medium">Editing message</span>
                    </div>
                    <button
                        onClick={() => {
                            setMessage('')
                            if (onCancelEdit) onCancelEdit()
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Replying Context Banner */}
            {replyTo && (
                <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a24] border-b border-gray-800 text-sm mb-2 rounded-t-lg">
                    <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-gray-500">Replying to {replyTo.senderName}:</span>
                        <span className="italic truncate max-w-[200px] opacity-75">{replyTo.content}</span>
                    </div>
                    <button
                        onClick={() => {
                            if (onCancelReply) onCancelReply()
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex items-end gap-3 bg-[#12121a] p-4">
                {/* Attachment Button */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="p-2 hover:bg-gray-800/50 rounded-full transition-colors text-gray-400 hover:text-white"
                        aria-label="Add attachment"
                        disabled
                        title="Coming soon"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    {/* Emoji Picker - Moved here */}
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} className="hover:bg-gray-800/50 rounded-full p-2 transition-colors text-gray-400 hover:text-amber-500" />
                </div>

                {/* Input Container */}
                <div className="flex-1 relative bg-[#1a1a24] rounded-2xl">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled || isSending}
                        rows={1}
                        className="w-full resize-none bg-transparent border-none rounded-2xl pl-4 pr-10 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0 max-h-32 overflow-y-auto disabled:cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                    />

                </div>

                {/* Send/Save Button */}
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || isSending || disabled}
                    className={`mb-1 p-2.5 text-white rounded-full transition-all shadow-lg hover:shadow-amber-900/20 ${isEditing
                        ? 'bg-blue-600 hover:bg-blue-500' // Blue for Edit Save
                        : 'bg-amber-600 hover:bg-amber-500' // Amber for Send
                        } disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}
                    aria-label={isEditing ? "Save changes" : "Send message"}
                >
                    {isEditing ? (
                        <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <Send className={`w-5 h-5 ${isSending ? 'animate-pulse' : 'ml-0.5'}`} />
                    )}
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
