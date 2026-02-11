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
    return (
        <div className="rounded-2xl bg-[#12121a] p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Chat</h3>
                <button
                    onClick={onSeeAll}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                    See all
                </button>
            </div>

            {/* Contact Avatars */}
            <div className="flex gap-4 overflow-x-auto pb-2">
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
        </div>
    )
}
