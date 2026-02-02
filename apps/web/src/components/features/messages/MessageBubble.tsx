import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { decryptHybrid } from '@/lib/crypto'
import type { ConversationMessage } from '@taskdashboard/types'
import { Edit2, Smile, MoreVertical, Check, CheckCheck } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'

interface MessageBubbleProps {
    message: ConversationMessage
    currentUserId: string
    privateKey?: CryptoKey
    senderAvatar?: string
    senderName?: string
    onReact?: (emoji: string) => void
    onEdit?: (content: string) => void
    onReply?: (content: string) => void
    onPin?: () => void
    onDelete?: () => void
    replyToMessage?: ConversationMessage
    recipientName?: string
    domId?: string
    status?: 'sent' | 'delivered' | 'read'
}

const QUICK_REACTIONS = ['❤️', '😆', '😮', '😢', '😡', '👍']

export function MessageBubble({
    message,
    currentUserId,
    privateKey,
    senderAvatar,
    senderName,
    onReact,
    onEdit,
    onReply,
    onPin,
    onDelete,
    replyToMessage,
    recipientName,
    domId,
    status = 'sent'
}: MessageBubbleProps) {
    const isOwnMessage = message.senderId === currentUserId
    const isDeleted = (message as any).isDeleted // Cast for now
    const isSystem = message.senderId === 'system' || (message as any).isSystem

    const [decryptedContent, setDecryptedContent] = useState(message.content)
    const [decryptedReplyContent, setDecryptedReplyContent] = useState<string | null>(null)
    const [systemInfo, setSystemInfo] = useState<{ action: string, actorId: string } | null>(null)

    // Decrypt main message
    useEffect(() => {
        if (isDeleted) {
            setDecryptedContent('Usunięto wiadomość')
            return
        }

        if (isSystem) {
            try {
                const sysData = JSON.parse(message.content)
                if (sysData.type === 'system') {
                    setSystemInfo(sysData)
                    return
                }
            } catch (e) {
                // Fallback
            }
        }

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
                setDecryptedContent(message.content)
            }
        }
        decrypt()
    }, [message.content, privateKey, isDeleted, isSystem])

    // Decrypt reply content
    useEffect(() => {
        if (!replyToMessage || !privateKey) {
            setDecryptedReplyContent(replyToMessage?.content || null)
            return
        }

        const decryptReply = async () => {
            try {
                const packet = JSON.parse(replyToMessage.content)
                if (packet.v === '1') {
                    const plainText = await decryptHybrid(packet, privateKey)
                    setDecryptedReplyContent(plainText)
                } else {
                    setDecryptedReplyContent(replyToMessage.content)
                }
            } catch (e) {
                setDecryptedReplyContent(replyToMessage.content)
            }
        }
        decryptReply()
    }, [replyToMessage, privateKey])


    // State for actions
    const [showActions, setShowActions] = useState(false)
    const [showReactionPicker, setShowReactionPicker] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('top')
    const reactionPickerRef = useRef<HTMLDivElement>(null)
    const reactButtonRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const menuButtonRef = useRef<HTMLButtonElement>(null)

    // Check if message is editable/deletable (< 30 minutes old for now)
    const isWithinTimeLimit = (Date.now() - new Date(message.timestamp).getTime() < 30 * 60 * 1000)
    const isEditable = isOwnMessage && isWithinTimeLimit && !isDeleted
    const isDeletable = isOwnMessage && isWithinTimeLimit && !isDeleted

    // Handle click outside
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
            if (showMenu &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                menuButtonRef.current &&
                !menuButtonRef.current.contains(event.target as Node)
            ) {
                setShowMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showReactionPicker, showMenu])

    // Smart positioning for reaction picker
    useEffect(() => {
        if (showReactionPicker && reactionPickerRef.current) {
            const parentRect = reactionPickerRef.current.parentElement?.getBoundingClientRect()
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

    if (isSystem && systemInfo) {
        const isMe = systemInfo.actorId === currentUserId
        const actionText = systemInfo.action === 'pin' ? 'pinned a message.' : 'unpinned a message.'
        return (
            <div className="flex items-center justify-center gap-1 my-3 text-xs text-gray-400 select-none">
                <span>{isMe ? 'You' : (recipientName || 'User')} {actionText}</span>
                <button className="text-blue-500 hover:underline font-medium">View all</button>
            </div>
        )
    }

    return (
        <div
            id={domId}
            className={`flex flex-col mb-4 bg-transparent hover:bg-transparent ${isOwnMessage ? 'items-end' : 'items-start'} group/message`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => {
                setShowActions(false)
            }}
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

                    {/* Reply Context (Pill above message) */}
                    {(message as any).replyToId && !isDeleted && (
                        <div className={`
                            flex items-center gap-2 mb-1 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-white/5 transition-colors
                            ${isOwnMessage ? 'bg-[#2b2f3e]/50 text-gray-400 self-end mr-1' : 'bg-[#2b2f3e]/50 text-gray-400 self-start ml-1'}
                         `}>
                            <div className="w-0.5 h-3 bg-amber-500 rounded-full"></div>
                            <span className="font-medium opacity-75">Replying to:</span>
                            <span className="truncate max-w-[150px] opacity-90">{decryptedReplyContent || 'original message'}</span>
                        </div>
                    )}

                    {/* Message Bubble Container (includes actions to center them relative to bubble) */}
                    <div className="relative">
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

                        {/* Actions Overlay (Hover) including Dropdown Menu */}
                        {!isDeleted && (
                            <div className={`
                                absolute ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2
                                flex items-center gap-2 opacity-0 transition-opacity duration-200
                                ${showActions || showReactionPicker || showMenu ? 'opacity-100' : 'pointer-events-none'}
                            `}>
                                {/* Reaction Button */}
                                <button
                                    ref={reactButtonRef}
                                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                                    className={`p-1.5 rounded-full transition-colors ${showReactionPicker ? 'text-amber-500 bg-gray-800' : 'text-gray-500 hover:text-amber-500 hover:bg-gray-800'}`}
                                    title="React"
                                >
                                    <Smile className="w-4 h-4" />
                                </button>

                                {/* Reply Button */}
                                <button
                                    onClick={() => onReply && onReply(decryptedContent)}
                                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                                    title="Reply"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </button>

                                {/* Three Dots Menu Button + Dropdown Container */}
                                <div className="relative">
                                    <button
                                        ref={menuButtonRef}
                                        onClick={() => setShowMenu(!showMenu)}
                                        className={`p-1.5 rounded-full transition-colors ${showMenu ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                                        title="More"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {/* Dropdown Menu (Anchored to Three Dots Button) */}
                                    {showMenu && (
                                        <div
                                            ref={menuRef}
                                            className={`
                                                absolute top-full mt-2 left-1/2 -translate-x-1/2
                                                bg-[#2b2f3e] rounded-lg shadow-xl z-50 py-1 min-w-[120px] flex flex-col
                                            `}
                                        >
                                            <button
                                                onClick={() => { onPin && onPin(); setShowMenu(false) }}
                                                className="px-4 py-2 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                </svg>
                                                {(message as any).isPinned ? 'Unpin' : 'Pin'}
                                            </button>
                                            {isEditable && (
                                                <button
                                                    onClick={() => { onEdit && onEdit(decryptedContent); setShowMenu(false) }}
                                                    className="px-4 py-2 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-2"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            )}
                                            {isDeletable && (
                                                <button
                                                    onClick={() => { onDelete && onDelete(); setShowMenu(false) }}
                                                    className="px-4 py-2 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white hover:bg-red-500/10 hover:text-red-400 flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`
                            rounded-2xl shadow-sm relative text-[15px] leading-relaxed break-words whitespace-pre-wrap px-5 py-3
                            ${isDeleted
                                ? 'bg-transparent text-gray-400 border border-gray-700 italic select-none py-2 px-4 rounded-full'
                                : isOwnMessage
                                    ? 'bg-amber-600 text-white rounded-br-sm'
                                    : 'bg-[#2b2f3e] text-gray-100 rounded-bl-sm border border-gray-700/50'
                            }
                        `}>
                            {(message as any).isPinned && !isDeleted && (
                                <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-0.5 rounded-full shadow-sm">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </div>
                            )}
                            {decryptedContent}
                        </div>
                    </div>

                    {/* Reactions Display */}
                    {!isDeleted && message.reactions && message.reactions.length > 0 && (
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

            {/* Timestamp + Edited Label + Status */}
            <div className={`flex items-center gap-2 text-[11px] text-gray-500 mt-1.5 font-medium select-none ${isOwnMessage ? 'mr-12' : 'ml-12'}`}>
                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                {message.edited && !isDeleted && (
                    <span className="italic opacity-60">(edited)</span>
                )}
                {isOwnMessage && !isDeleted && (
                    <span className={`ml-1 transition-colors ${status === 'read' ? 'text-amber-500' : 'text-gray-500'}`}>
                        {status === 'sent' && <Check className="w-3.5 h-3.5" />}
                        {status === 'delivered' && <CheckCheck className="w-3.5 h-3.5" />}
                        {status === 'read' && <CheckCheck className="w-3.5 h-3.5" />}
                    </span>
                )}
            </div>
        </div>
    )
}
