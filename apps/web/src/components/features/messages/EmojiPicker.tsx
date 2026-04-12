import { useState } from 'react'
import { Smile } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void
    className?: string
}

const EMOJI_CATEGORIES = {
    'Smileys': [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
        '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
        '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
        '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
        '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
        '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
        '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴',
        '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕',
        '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
        '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
        '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
        '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩'
    ],
    'Gestures': [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
        '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
        '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
        '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
        '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
        '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀',
        '👁️', '👅', '👄', '💋', '🩸'
    ],
    'Animals': [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
        '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵',
        '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
        '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
        '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞',
        '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️',
        '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑',
        '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
        '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧',
        '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘'
    ],
    'Food': [
        '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇',
        '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
        '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️',
        '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',
        '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳',
        '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴',
        '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆',
        '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝',
        '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤',
        '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡',
        '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮',
        '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜'
    ],
    'Activities': [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
        '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
        '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
        '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
        '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺',
        '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🚣', '🧗',
        '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧',
        '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸',
        '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰',
        '🧩'
    ],
    'Travel': [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
        '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽',
        '🦼', '🩼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨',
        '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃',
        '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆',
        '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺',
        '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️',
        '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥',
        '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡',
        '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋'
    ],
    'Objects': [
        '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️',
        '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷',
        '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
        '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️',
        '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌',
        '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵',
        '💴', '💶', '💷', '🪙', '💰', '💳', '🪪', '💎',
        '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️',
        '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲',
        '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️'
    ],
    'Symbols': [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
        '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
        '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️',
        '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
        '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
        '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑',
        '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺',
        '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴',
        '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
        '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯',
        '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵',
        '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅',
        '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️',
        '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠'
    ],
    'Flags': [
        '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️',
        '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲',
        '🇦🇴', '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹', '🇦🇺', '🇦🇼', '🇦🇽',
        '🇦🇿', '🇧🇦', '🇧🇧', '🇧🇩', '🇧🇪', '🇧🇫', '🇧🇬', '🇧🇭',
        '🇧🇮', '🇧🇯', '🇧🇱', '🇧🇲', '🇧🇳', '🇧🇴', '🇧🇶', '🇧🇷',
        '🇧🇸', '🇧🇹', '🇧🇻', '🇧🇼', '🇧🇾', '🇧🇿', '🇨🇦', '🇨🇨',
        '🇨🇩', '🇨🇫', '🇨🇬', '🇨🇭', '🇨🇮', '🇨🇰', '🇨🇱', '🇨🇲',
        '🇨🇳', '🇨🇴', '🇨🇵', '🇨🇷', '🇨🇺', '🇨🇻', '🇨🇼', '🇨🇽',
        '🇨🇾', '🇨🇿', '🇩🇪', '🇩🇬', '🇩🇯', '🇩🇰', '🇩🇲', '🇩🇴',
        '🇩🇿', '🇪🇦', '🇪🇨', '🇪🇪', '🇪🇬', '🇪🇭', '🇪🇷', '🇪🇸',
        '🇪🇹', '🇪🇺', '🇫🇮', '🇫🇯', '🇫🇰', '🇫🇲', '🇫🇴', '🇫🇷',
        '🇬🇦', '🇬🇧', '🇬🇩', '🇬🇪', '🇬🇫', '🇬🇬', '🇬🇭', '🇬🇮',
        '🇬🇱', '🇬🇲', '🇬🇳', '🇬🇵', '🇬🇶', '🇬🇷', '🇬🇸', '🇬🇹',
        '🇬🇺', '🇬🇼', '🇬🇾', '🇭🇰', '🇭🇲', '🇭🇳', '🇭🇷', '🇭🇹',
        '🇭🇺', '🇮🇨', '🇮🇩', '🇮🇪', '🇮🇱', '🇮🇲', '🇮🇳', '🇮🇴',
        '🇮🇶', '🇮🇷', '🇮🇸', '🇮🇹', '🇯🇪', '🇯🇲', '🇯🇴', '🇯🇵',
        '🇰🇪', '🇰🇬', '🇰🇭', '🇰🇮', '🇰🇲', '🇰🇳', '🇰🇵', '🇰🇷',
        '🇰🇼', '🇰🇾', '🇰🇿', '🇱🇦', '🇱🇧', '🇱🇨', '🇱🇮', '🇱🇰',
        '🇱🇷', '🇱🇸', '🇱🇹', '🇱🇺', '🇱🇻', '🇱🇾', '🇲🇦', '🇲🇨',
        '🇲🇩', '🇲🇪', '🇲🇫', '🇲🇬', '🇲🇭', '🇲🇰', '🇲🇱', '🇲🇲',
        '🇲🇳', '🇲🇴', '🇲🇵', '🇲🇶', '🇲🇷', '🇲🇸', '🇲🇹', '🇲🇺',
        '🇲🇻', '🇲🇼', '🇲🇽', '🇲🇾', '🇲🇿', '🇳🇦', '🇳🇨', '🇳🇪',
        '🇳🇫', '🇳🇬', '🇳🇮', '🇳🇱', '🇳🇴', '🇳🇵', '🇳🇷', '🇳🇺',
        '🇳🇿', '🇴🇲', '🇵🇦', '🇵🇪', '🇵🇫', '🇵🇬', '🇵🇭', '🇵🇰',
        '🇵🇱', '🇵🇲', '🇵🇳', '🇵🇷', '🇵🇸', '🇵🇹', '🇵🇼', '🇵🇾',
        '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇸', '🇷🇺', '🇷🇼', '🇸🇦', '🇸🇧',
        '🇸🇨', '🇸🇩', '🇸🇪', '🇸🇬', '🇸🇭', '🇸🇮', '🇸🇯', '🇸🇰',
        '🇸🇱', '🇸🇲', '🇸🇳', '🇸🇴', '🇸🇷', '🇸🇸', '🇸🇹', '🇸🇻',
        '🇸🇽', '🇸🇾', '🇸🇿', '🇹🇦', '🇹🇨', '🇹🇩', '🇹🇫', '🇹🇬',
        '🇹🇭', '🇹🇯', '🇹🇰', '🇹🇱', '🇹🇲', '🇹🇳', '🇹🇴', '🇹🇷',
        '🇹🇹', '🇹🇻', '🇹🇼', '🇹🇿', '🇺🇦', '🇺🇬', '🇺🇲', '🇺🇳',
        '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇦', '🇻🇨', '🇻🇪', '🇻🇬', '🇻🇮',
        '🇻🇳', '🇻🇺', '🇼🇫', '🇼🇸', '🇽🇰', '🇾🇪', '🇾🇹', '🇿🇦',
        '🇿🇲', '🇿🇼', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
    ]
}

function getFlagCode(emoji: string) {
    // Standard regional indicator sequence flags are 2 code points
    // Some complex flags like England use different sequences, but 
    // the vast majority are 2 characters in regional indicator range.
    const codePoints = Array.from(emoji);
    if (codePoints.length === 2) {
        const cp1 = codePoints[0].codePointAt(0);
        const cp2 = codePoints[1].codePointAt(0);
        if (cp1 && cp2 && cp1 >= 0x1F1E6 && cp1 <= 0x1F1FF && cp2 >= 0x1F1E6 && cp2 <= 0x1F1FF) {
            return (
                String.fromCharCode(cp1 - 0x1F1E6 + 65) +
                String.fromCharCode(cp2 - 0x1F1E6 + 65)
            ).toLowerCase();
        }
    }
    return null;
}

export function EmojiPicker({ onEmojiSelect, className = '' }: EmojiPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys')
    const { t } = useTranslation()

    const handleEmojiClick = (emoji: string) => {
        onEmojiSelect(emoji)
        // Removed setIsOpen(false) to allow multiple selections
    }

    return (
        <div className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-[var(--app-bg-sidebar)] rounded-lg transition-colors"
                aria-label="Add emoji"
            >
                <Smile className="w-5 h-5 text-[var(--app-text-muted)]" />
            </button>

            {/* Emoji Popover */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Emoji Picker */}
                    <div className="absolute bottom-full mb-2 right-0 bg-[var(--app-bg-elevated)] border border-[var(--app-border)] rounded-xl shadow-2xl z-20 w-72 md:w-80 backdrop-blur-xl">
                        {/* Category Tabs */}
                        <div className="flex gap-1 p-2 border-b border-[var(--app-border)] overflow-x-auto scrollbar-hide">
                            {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setActiveCategory(category)}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${activeCategory === category
                                        ? 'bg-amber-500/20 text-amber-500'
                                        : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-sidebar)] hover:text-[var(--app-text-secondary)]'
                                        }`}
                                >
                                    {t(`messages.emojiCategories.${category.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>

                        {/* Emoji Grid */}
                        <div className="p-3 max-h-64 overflow-y-auto">
                            <div className="grid grid-cols-7 gap-1">
                                {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                                    <button
                                        key={`${emoji}-${index}`}
                                        type="button"
                                        onClick={() => handleEmojiClick(emoji)}
                                        className="text-2xl hover:bg-[var(--app-bg-sidebar)] rounded p-1 transition-colors aspect-square flex items-center justify-center"
                                        title={emoji}
                                    >
                                        {(() => {
                                            const flagCode = getFlagCode(emoji);
                                            if (flagCode) {
                                                return (
                                                    <img
                                                        src={`https://flagcdn.com/w40/${flagCode}.png`}
                                                        className="w-full h-auto object-contain rounded-sm"
                                                        alt={emoji}
                                                    />
                                                );
                                            }
                                            return emoji;
                                        })()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
