import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { decryptWithFallback, decryptMessage, MessageEnvelope } from '@/lib/crypto'
import type { ConversationMessage } from '@taskdashboard/types'
import { Edit2, Smile, MoreVertical, Check, CheckCheck } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { useTranslation } from 'react-i18next'
import { pl, enUS } from 'date-fns/locale'

interface MessageBubbleProps {
  message: ConversationMessage
  currentUserId: string
  privateKey?: CryptoKey
  historyKeys?: CryptoKey[]
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
  historyKeys,
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
  status = 'sent',
}: MessageBubbleProps) {
  const isOwnMessage = message.senderId === currentUserId
  const isDeleted = (message as any).isDeleted // Cast for now
  const isSystem = message.senderId === 'system' || (message as any).isSystem

  const [decryptedContent, setDecryptedContent] = useState<string>('')
  const [decryptedReplyContent, setDecryptedReplyContent] = useState<string | null>(null)
  const [systemInfo, setSystemInfo] = useState<{ action: string; actorId: string } | null>(null)
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'pl' ? pl : enUS

  // Decrypt main message
  useEffect(() => {
    if (isDeleted) {
      setDecryptedContent(t('messages.messageDeleted'))
      return
    }

    const content = message.content

    // Handle string content (Legacy or JSON-stringified)
    if (typeof content === 'string') {
      if (isSystem) {
        try {
          const sysData = JSON.parse(content)
          if (sysData.type === 'system') {
            setSystemInfo(sysData)
            return
          }
        } catch (e) {
          // Fallback
        }
      }

      // Try to parse as encrypted packet (Legacy V1)
      try {
        const packet = JSON.parse(content)
        if (packet.v === '1' && packet.data && packet.key && packet.iv) {
          const allKeys = [privateKey, ...(historyKeys || [])].filter(Boolean) as CryptoKey[]
          if (allKeys.length === 0) return

          decryptWithFallback(packet, allKeys)
            .then((plainText) => setDecryptedContent(plainText))
            .catch((err) => {
              console.warn('Decryption failed for message (unrecoverable):', message.id, err)
              setDecryptedContent(
                '🔒 ' + (t('messages.decryptionError') || 'Encrypted message (key unavailable)')
              )
            })
          return
        }
      } catch (e) {
        // Not JSON or V1 packet -> Plain text
        setDecryptedContent(content)
        return
      }

      // Fallback for string
      setDecryptedContent(content)
    }
    // Handle Object content (V2 Envelope)
    else if (typeof content === 'object' && content !== null && 'v' in content) {
      const envelope = content as unknown as MessageEnvelope
      if (envelope.v === 2) {
        if (!privateKey) {
          setDecryptedContent('🔒 ' + (t('messages.waitingForKey') || 'Waiting for key...'))
          return
        }
        decryptMessage(envelope, currentUserId, privateKey)
          .then((plainText) => setDecryptedContent(plainText))
          .catch((err) => {
            console.warn('V2 Decryption failed:', err)
            setDecryptedContent('🔒 ' + (t('messages.decryptionError') || 'Decryption failed'))
          })
      } else {
        setDecryptedContent('Unknown message version')
      }
    } else {
      // Unknown type
      setDecryptedContent('Unsupported message format')
    }
  }, [message.content, privateKey, historyKeys, isDeleted, isSystem, currentUserId])

  // Decrypt reply content
  useEffect(() => {
    if (!replyToMessage) {
      setDecryptedReplyContent(null)
      return
    }

    const content = replyToMessage.content
    const allKeys = [privateKey, ...(historyKeys || [])].filter(Boolean) as CryptoKey[]

    // Helper to set reply content safely
    const setReply = (text: string) => setDecryptedReplyContent(text)

    if (typeof content === 'string') {
      try {
        const packet = JSON.parse(content)
        if (packet.v === '1' && allKeys.length > 0) {
          decryptWithFallback(packet, allKeys)
            .then(setReply)
            .catch(() => setReply(content))
          return
        }
      } catch (e) {
        setReply(content)
        return
      }
      setReply(content)
    } else if (typeof content === 'object' && content !== null && 'v' in content) {
      const envelope = content as unknown as MessageEnvelope
      if (envelope.v === 2 && privateKey) {
        decryptMessage(envelope, currentUserId, privateKey)
          .then(setReply)
          .catch(() => setReply('🔒 Encrypted Reply'))
      } else {
        setReply('🔒 Encrypted Reply')
      }
    }
  }, [replyToMessage, privateKey, historyKeys, currentUserId])

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
  const isWithinTimeLimit = Date.now() - new Date(message.timestamp).getTime() < 30 * 60 * 1000
  const isEditable = isOwnMessage && isWithinTimeLimit && !isDeleted
  const isDeletable = isOwnMessage && isWithinTimeLimit && !isDeleted

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showReactionPicker &&
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target as Node) &&
        reactButtonRef.current &&
        !reactButtonRef.current.contains(event.target as Node)
      ) {
        setShowReactionPicker(false)
      }
      if (
        showMenu &&
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
    ? senderName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '?'

  if (isSystem && systemInfo) {
    const isMe = systemInfo.actorId === currentUserId
    const actionText =
      systemInfo.action === 'pin' ? t('messages.pinnedAction') : t('messages.unpinnedAction')
    return (
      <div className="my-3 flex select-none items-center justify-center gap-1 text-xs text-gray-400">
        <span>
          {isMe ? t('messages.you') : recipientName || t('messages.unknownUser')} {actionText}
        </span>
        <button className="font-medium text-blue-500 hover:underline">
          {t('messages.viewAll')}
        </button>
      </div>
    )
  }

  return (
    <div
      id={domId}
      className={`mb-4 flex flex-col bg-transparent hover:bg-transparent ${isOwnMessage ? 'items-end' : 'items-start'} group/message`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
      }}
    >
      <div
        className={`flex max-w-[80%] gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} relative items-end`}
      >
        {/* Avatar */}
        <div className="-mb-1 flex-shrink-0">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-[var(--app-bg-card)]"
            />
          ) : (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-[var(--app-bg-card)] ${
                isOwnMessage
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                  : 'bg-gradient-to-br from-gray-700 to-gray-600'
              }`}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Message Content Wrapper */}
        <div className="group relative flex flex-col">
          {/* Reply Context (Pill above message) */}
          {(message as any).replyToId && !isDeleted && (
            <div
              className={`mb-1 flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-xs transition-colors hover:bg-white/5 ${isOwnMessage ? 'mr-1 self-end bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)]' : 'ml-1 self-start bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)]'} `}
            >
              <div className="h-3 w-0.5 rounded-full bg-amber-500"></div>
              <span className="font-medium opacity-75">{t('messages.replyingToLabel')}</span>
              <span className="max-w-[150px] truncate opacity-90">
                {decryptedReplyContent || t('messages.originalMessage')}
              </span>
            </div>
          )}

          {/* Message Bubble Container (includes actions to center them relative to bubble) */}
          <div className="relative">
            {/* Quick Reactions Bar */}
            {showReactionPicker && (
              <div
                ref={reactionPickerRef}
                className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${isOwnMessage ? 'right-0' : 'left-0'} animate-in fade-in zoom-in z-50 flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-card)] p-1 shadow-xl duration-200`}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact && onReact(emoji)
                      setShowReactionPicker(false)
                    }}
                    className="rounded-full p-1.5 text-xl leading-none transition-transform hover:scale-125 hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
                <div className="mx-1 h-6 w-px bg-gray-700"></div>
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
              <div
                className={`absolute ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 flex -translate-y-1/2 items-center gap-2 opacity-0 transition-opacity duration-200 ${showActions || showReactionPicker || showMenu ? 'opacity-100' : 'pointer-events-none'} `}
              >
                {/* Reaction Button */}
                <button
                  ref={reactButtonRef}
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className={`rounded-full p-1.5 transition-colors ${showReactionPicker ? 'bg-[var(--app-bg-elevated)] text-amber-500' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-amber-500'}`}
                  title="React"
                >
                  <Smile className="h-4 w-4" />
                </button>

                {/* Reply Button */}
                <button
                  onClick={() => onReply && onReply(decryptedContent)}
                  className="rounded-full p-1.5 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]"
                  title="Reply"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </button>

                {/* Three Dots Menu Button + Dropdown Container */}
                <div className="relative">
                  <button
                    ref={menuButtonRef}
                    onClick={() => setShowMenu(!showMenu)}
                    className={`rounded-full p-1.5 transition-colors ${showMenu ? 'bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]' : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-elevated)] hover:text-[var(--app-text-primary)]'}`}
                    title="More"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu (Anchored to Three Dots Button) */}
                  {showMenu && (
                    <div
                      ref={menuRef}
                      className={`absolute left-1/2 top-full z-50 mt-2 flex min-w-[120px] -translate-x-1/2 flex-col rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] py-1 shadow-xl`}
                    >
                      <button
                        onClick={() => {
                          onPin && onPin()
                          setShowMenu(false)
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-left text-sm text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-[var(--app-text-primary)]"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                          />
                        </svg>
                        {(message as any).isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      {isEditable && (
                        <button
                          onClick={() => {
                            onEdit && onEdit(decryptedContent)
                            setShowMenu(false)
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-left text-sm text-[var(--app-text-secondary)] hover:bg-white/5 hover:text-[var(--app-text-primary)]"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                      {isDeletable && (
                        <button
                          onClick={() => {
                            onDelete && onDelete()
                            setShowMenu(false)
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-left text-sm text-[var(--app-text-secondary)] hover:bg-red-500/10 hover:bg-white/5 hover:text-[var(--app-text-primary)] hover:text-red-400"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
            <div
              className={`relative whitespace-pre-wrap break-words rounded-2xl px-5 py-3 text-[15px] leading-relaxed shadow-sm ${
                isDeleted
                  ? 'select-none rounded-full border border-[var(--app-border)] bg-transparent px-4 py-2 italic text-[var(--app-text-muted)]'
                  : isOwnMessage
                    ? 'rounded-br-sm bg-amber-600 text-white shadow-amber-900/10'
                    : 'rounded-bl-sm border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-primary)]'
              } `}
            >
              {(message as any).isPinned && !isDeleted && (
                <div className="absolute -right-2 -top-2 rounded-full bg-amber-500 p-0.5 text-white shadow-sm">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </div>
              )}
              {decryptedContent}
            </div>
          </div>

          {/* Reactions Display */}
          {!isDeleted && message.reactions && message.reactions.length > 0 && (
            <div
              className={`mt-1 flex flex-wrap gap-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              {Object.entries(
                message.reactions.reduce((acc: any, r: any) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1
                  return acc
                }, {})
              ).map(([emoji, count]: any) => (
                <button
                  key={emoji}
                  onClick={() => onReact && onReact(emoji)}
                  className="flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-bg-card)] px-2 py-0.5 text-xs transition-colors hover:bg-[var(--app-bg-elevated)]"
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[var(--app-text-secondary)]">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp + Edited Label + Status */}
      <div
        className={`mt-1.5 flex select-none items-center gap-2 text-[11px] font-medium text-[var(--app-text-secondary)] ${isOwnMessage ? 'mr-12' : 'ml-12'}`}
      >
        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true, locale })}
        {message.edited && !isDeleted && (
          <span className="italic opacity-60">{t('messages.edited')}</span>
        )}
        {isOwnMessage && !isDeleted && (
          <span
            className={`ml-1 transition-colors ${status === 'read' ? 'text-amber-500' : 'text-gray-500'}`}
          >
            {status === 'sent' && <Check className="h-3.5 w-3.5" />}
            {status === 'delivered' && <CheckCheck className="h-3.5 w-3.5" />}
            {status === 'read' && <CheckCheck className="h-3.5 w-3.5" />}
          </span>
        )}
      </div>
    </div>
  )
}
