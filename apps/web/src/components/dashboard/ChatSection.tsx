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
        <div className="rounded-2xl bg-[#12121a] p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">{t('dashboard.chat')}</h3>
                <button
                    onClick={onSeeAll}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                    {t('dashboard.seeAll')}
                </button>
            </div>

            {/* Contact Avatars with Custom Scroll */}
            <div className="relative group/scroll">
                {/* Left Arrow */}
                <button
                    onClick={() => scroll('left')}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-3 z-10 w-8 h-8 rounded-full bg-[#1a1a24] border border-gray-700 items-center justify-center text-gray-400 shadow-xl hover:text-white hover:bg-gray-800 transition-all ${showLeftArrow ? 'flex opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300' : 'hidden'
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
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
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#12121a]" />
                                )}
                            </div>
                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                                {contact.name.split(' ')[0]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right Arrow */}
                <button
                    onClick={() => scroll('right')}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-3 z-10 w-8 h-8 rounded-full bg-[#1a1a24] border border-gray-700 items-center justify-center text-gray-400 shadow-xl hover:text-white hover:bg-gray-800 transition-all ${showRightArrow ? 'flex opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300' : 'hidden'
                        }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

