import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
interface ChatContact {
    id: string
    name: string
    avatar?: string
    isOnline?: boolean
}

interface ChatSectionProps {
    contacts: ChatContact[]
    onSeeAll?: () => void
    onContactClick?: (contactId: string) => void
}

export function ChatSection({ contacts, onSeeAll, onContactClick }: ChatSectionProps) {
    const { t } = useTranslation()
    const scrollRef = useRef<HTMLDivElement>(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(false)

    const checkScroll = () => {
        if (!scrollRef.current) return
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setShowLeftArrow(scrollLeft > 0)
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }

    useEffect(() => {
        checkScroll()
        window.addEventListener('resize', checkScroll)
        return () => window.removeEventListener('resize', checkScroll)
    }, [contacts])

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return
        const scrollAmount = 200 // Adjust distance as needed
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        })
    }

    return (
        <div className="rounded-2xl bg-[var(--app-bg-card)] p-5 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--app-text-primary)]">{t('dashboard.chat')}</h3>
                <button
                    onClick={onSeeAll}
                    className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                >
                    {t('dashboard.seeAll')}
                </button>
            </div>

            {/* Contact Avatars with Custom Scroll */}
            <div className="relative group/scroll">
                {/* Left Arrow */}
                <button
                    onClick={() => scroll('left')}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-3 z-10 w-8 h-8 rounded-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] items-center justify-center text-[var(--app-text-secondary)] shadow-xl hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-all ${showLeftArrow ? 'flex opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300' : 'hidden'
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar scroll-smooth"
                >
                    {contacts.map((contact) => (
                        <button
                            key={contact.id}
                            onClick={() => onContactClick?.(contact.id)}
                            className="flex flex-col items-center gap-1 min-w-fit group"
                        >
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-black font-bold ring-2 ring-transparent group-hover:ring-amber-500/50 transition-all overflow-hidden ${contact.avatar ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                                    {contact.avatar ? (
                                        <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                                    ) : (
                                        contact.name.charAt(0)
                                    )}
                                </div>
                                {contact.isOnline && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--app-bg-card)]" />
                                )}
                            </div>
                            <span className="text-xs text-[var(--app-text-secondary)] group-hover:text-[var(--app-text-primary)] transition-colors">
                                {contact.name.split(' ')[0]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right Arrow */}
                <button
                    onClick={() => scroll('right')}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-3 z-10 w-8 h-8 rounded-full bg-[var(--app-bg-elevated)] border border-[var(--app-border)] items-center justify-center text-[var(--app-text-secondary)] shadow-xl hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-card)] transition-all ${showRightArrow ? 'flex opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300' : 'hidden'
                        }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

