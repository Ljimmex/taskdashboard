import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { decryptHybrid } from '@/lib/crypto'
import type { ConversationMessage } from '@taskdashboard/types'
import { Edit2, Smile } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'

interface MessageBubbleProps {
    message: ConversationMessage
    currentUserId: string
    privateKey?: CryptoKey
    senderAvatar?: string
    senderName?: string
    onReact?: (emoji: string) => void
    onEdit?: (content: string) => void
}

const QUICK_REACTIONS = ['❤️', '😆', '😮', '😢', '😡', '👍']

export function MessageBubble({
    message,
    currentUserId,
    privateKey,
    senderAvatar,
    senderName,
    onReact,
    onEdit
}: MessageBubbleProps) {
    const isOwnMessage = message.senderId === currentUserId
    const [decryptedContent, setDecryptedContent] = useState(message.content)

    useEffect(() => {
        const decrypt = async () => {
            if (!privateKey) return

            try {
                // Try to parse as encrypted packet
                const packet = JSON.parse(message.content)
                if (packet.v === '1' && packet.data && packet.key && packet.iv) {
                    const plainText = await decryptHybrid(packet, privateKey)
                    setDecryptedContent(plainText)
                }
            } catch (e) {
                // Not a valid JSON or encrypted packet - treat as plain text
            }
        }
        decrypt()
    }, [message.content, privateKey])

    // State for actions
    const [showActions, setShowActions] = useState(false)
    const [showReactionPicker, setShowReactionPicker] = useState(false)
    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('top')
    const reactionPickerRef = useRef<HTMLDivElement>(null)
    const reactButtonRef = useRef<HTMLButtonElement>(null)

    // Check if message is editable (< 30 minutes old)
    const isEditable = isOwnMessage && (Date.now() - new Date(message.timestamp).getTime() < 30 * 60 * 1000)

    // Handle click outside to close reaction picker
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (showReactionPicker &&
                reactionPickerRef.current &&
                !reactionPickerRef.current.contains(event.target as Node) &&
                reactButtonRef.current &&
                !reactButtonRef.current.contains(event.target as Node)
            ) {
                setShowReactionPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showReactionPicker])

    // Smart positioning for reaction picker
    useEffect(() => {
        if (showReactionPicker && reactionPickerRef.current) {
            const parentRect = reactionPickerRef.current.parentElement?.getBoundingClientRect()

            // If top is clipped (less than 80px from top of viewport), flip to bottom
            // We check the parent's top because the picker itself might not be rendered fully yet or we want to preempt base on anchor
            if (parentRect && parentRect.top < 100) {
                setPickerPosition('bottom')
            } else {
                setPickerPosition('top')
            }
        }
    }, [showReactionPicker])

    // Get initials for fallback
    const initials = senderName
        ? senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '?'

    return (
        <div
            className={`flex flex-col mb-4 bg-transparent hover:bg-transparent ${isOwnMessage ? 'items-end' : 'items-start'} group/message`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`flex gap-3 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end relative`}>
                {/* Avatar */}
                <div className="flex-shrink-0 -mb-1">
                    {senderAvatar ? (
                        <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#13161c]" />
                    ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#13161c] ${isOwnMessage
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : 'bg-gradient-to-br from-gray-700 to-gray-600'
                            }`}>
                            {initials}
                        </div>
                    )}
                </div>

                {/* Message Content Wrapper */}
                <div className="flex flex-col relative group">
                    {/* Quick Reactions Bar */}
                    {showReactionPicker && (
                        <div
                            ref={reactionPickerRef}
                            className={`
                                absolute ${pickerPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} 
                                ${isOwnMessage ? 'right-0' : 'left-0'} 
                                flex items-center bg-[#2b2f3e] rounded-full p-1 shadow-xl border border-gray-700 z-50 animate-in fade-in zoom-in duration-200
                            `}
                        >
                            {QUICK_REACTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        onReact && onReact(emoji)
                                        setShowReactionPicker(false)
                                    }}
                                    className="p-1.5 hover:bg-white/10 rounded-full transition-transform hover:scale-125 text-xl leading-none"
                                >
                                    {emoji}
                                </button>
                            ))}
                            <div className="w-px h-6 bg-gray-700 mx-1"></div>
                            <EmojiPicker
                                onEmojiSelect={(emoji) => {
                                    onReact && onReact(emoji)
                                    setShowReactionPicker(false)
                                }}
                                className="text-gray-400 hover:text-white"
                            />
                        </div>
                    )}

                    {/* Actions Menu (Side aligned) */}
                    <div className={`
                        absolute ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2
                        flex items-center gap-2 opacity-0 transition-opacity duration-200
                        ${showActions || showReactionPicker ? 'opacity-100' : 'pointer-events-none'}
                    `}>
                        {isEditable && (
                            <button
                                onClick={() => onEdit && onEdit(decryptedContent)}
                                className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                            title="Reply"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                        <button
                            ref={reactButtonRef}
                            onClick={() => setShowReactionPicker(!showReactionPicker)}
                            className={`p-1.5 rounded-full transition-colors ${showReactionPicker ? 'text-amber-500 bg-gray-800' : 'text-gray-500 hover:text-amber-500 hover:bg-gray-800'}`}
                            title="React"
                        >
                            <Smile className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Message Bubble */}
                    <div className={`
                        rounded-2xl shadow-sm relative text-[15px] leading-relaxed break-words whitespace-pre-wrap px-5 py-3
                        ${isOwnMessage
                            ? 'bg-amber-600 text-white rounded-br-sm '
                            : 'bg-[#2b2f3e] text-gray-100 rounded-bl-sm border border-gray-700/50'}
                    `}>
                        {decryptedContent}
                    </div>

                    {/* Reactions Display */}
                    {message.reactions && message.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(
                                message.reactions.reduce((acc: any, r: any) => {
                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1
                                    return acc
                                }, {})
                            ).map(([emoji, count]: any) => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact && onReact(emoji)}
                                    className="flex items-center gap-1 bg-[#1a1a24] border border-gray-800 rounded-full px-2 py-0.5 text-xs hover:bg-gray-800 transition-colors"
                                >
                                    <span>{emoji}</span>
                                    {count > 1 && <span className="text-gray-500">{count}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Timestamp + Edited Label */}
            <div className={`flex items-center gap-2 text-[11px] text-gray-500 mt-1.5 font-medium select-none ${isOwnMessage ? 'mr-12' : 'ml-12'}`}>
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                {message.edited && (
                    <span className="italic opacity-60">(edited)</span>
                )}
            </div>
        </div>
    )
}
