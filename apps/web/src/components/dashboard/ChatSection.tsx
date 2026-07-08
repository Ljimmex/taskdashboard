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
      behavior: 'smooth',
    })
  }

  return (
    <div className="rounded-2xl bg-[var(--app-bg-card)] p-5 transition-all duration-300">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-[var(--app-text-primary)]">{t('dashboard.chat')}</h3>
        <button
          onClick={onSeeAll}
          className="text-xs text-amber-500 transition-colors hover:text-amber-400"
        >
          {t('dashboard.seeAll')}
        </button>
      </div>

      {/* Contact Avatars with Custom Scroll */}
      <div className="group/scroll relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className={`absolute left-0 top-1/2 z-10 -ml-3 h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] shadow-xl transition-all hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)] ${
            showLeftArrow
              ? 'flex opacity-0 transition-opacity duration-300 group-hover/scroll:opacity-100'
              : 'hidden'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="custom-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4"
        >
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onContactClick?.(contact.id)}
              className="group flex min-w-fit flex-col items-center gap-1"
            >
              <div className="relative">
                <div
                  className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full font-bold text-black ring-2 ring-transparent transition-all group-hover:ring-amber-500/50 ${contact.avatar ? 'bg-transparent' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}
                >
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    contact.name.charAt(0)
                  )}
                </div>
                {contact.isOnline && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--app-bg-card)] bg-green-500" />
                )}
              </div>
              <span className="text-xs text-[var(--app-text-secondary)] transition-colors group-hover:text-[var(--app-text-primary)]">
                {contact.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className={`absolute right-0 top-1/2 z-10 -mr-3 h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-bg-elevated)] text-[var(--app-text-secondary)] shadow-xl transition-all hover:bg-[var(--app-bg-card)] hover:text-[var(--app-text-primary)] ${
            showRightArrow
              ? 'flex opacity-0 transition-opacity duration-300 group-hover/scroll:opacity-100'
              : 'hidden'
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
