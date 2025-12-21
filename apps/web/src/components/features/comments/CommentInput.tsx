import React, { useState, useRef } from 'react'

interface CommentInputProps {
    onSend: (content: string) => void
    placeholder?: string
    replyingTo?: { id: string; author: string } | null
    onCancelReply?: () => void
}

const PaperclipIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
)

export const CommentInput: React.FC<CommentInputProps> = ({
    onSend,
    placeholder = "Write a comment...",
    replyingTo = null,
    onCancelReply
}) => {
    const [content, setContent] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const handleSend = () => {
        if (content.trim()) {
            onSend(content.trim())
            setContent('')
            onCancelReply?.()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && content.trim()) {
            handleSend()
        }
    }

    return (
        <div className="border-t border-gray-800">
            {replyingTo && (
                <div className="px-4 pt-3 pb-2 bg-gray-900/30 border-b border-gray-800/50">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">Odpowiadasz dla</span>
                        <span className="text-amber-400 font-medium">{replyingTo.author}</span>
                        <button
                            onClick={onCancelReply}
                            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-none p-4">
                <div className="flex items-center gap-3 bg-[#16161f] rounded-[24px] px-5 py-2.5 border border-gray-800/50 shadow-inner">
                    <input
                        ref={inputRef}
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                    />
                    <button className="p-2 text-gray-500 hover:text-white transition-colors">
                        <PaperclipIcon />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!content.trim()}
                        className={`px-4 py-1.5 text-white text-sm font-medium rounded-lg transition-colors ${content.trim()
                            ? 'bg-indigo-500 hover:bg-indigo-400 cursor-pointer'
                            : 'bg-indigo-500/50 cursor-not-allowed'
                            }`}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}
