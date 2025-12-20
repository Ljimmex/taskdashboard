import { useState } from 'react'

interface Activity {
    id: string
    user: {
        name: string
        role: string
        avatar?: string
    }
    message: string
    likes: number
    comments: number
    timeAgo: string
}

interface TeamActivityProps {
    activities: Activity[]
}

// SVG Icons for activity actions
const HeartIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M16 28C16 28 4 20.5 4 11.5C4 7.5 7.5 4.5 11.5 4.5C13.5 4.5 15.5 6 16 8C16.5 6 18.5 4.5 20.5 4.5C24.5 4.5 28 7.5 28 11.5C28 20.5 16 28 16 28Z" fill="#F2CE88" />
            <path d="M22 10L28 14" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M16 28C16 28 4 20.5 4 11.5C4 7.5 7.5 4.5 11.5 4.5C13.5 4.5 15.5 6 16 8C16.5 6 18.5 4.5 20.5 4.5C24.5 4.5 28 7.5 28 11.5C28 20.5 16 28 16 28Z" fill="#9E9E9E" />
            <path d="M22 10L28 14" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

const CommentIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="#7A664E" />
            <circle cx="10" cy="15" r="2" fill="#F2CE88" />
            <circle cx="16" cy="15" r="2" fill="#F2CE88" />
            <circle cx="22" cy="15" r="2" fill="#F2CE88" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M4 12C4 8.68629 6.68629 6 10 6H22C25.3137 6 28 8.68629 28 12V18C28 21.3137 25.3137 24 22 24H12L6 28V24C4 24 4 21.3137 4 18V12Z" fill="#545454" />
            <circle cx="10" cy="15" r="2" fill="#9E9E9E" />
            <circle cx="16" cy="15" r="2" fill="#9E9E9E" />
            <circle cx="22" cy="15" r="2" fill="#9E9E9E" />
        </svg>
    )
)

const ShareIcon = ({ isHovered }: { isHovered: boolean }) => (
    isHovered ? (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <circle cx="24" cy="8" r="4" fill="#F2CE88" />
            <circle cx="24" cy="24" r="4" fill="#F2CE88" />
            <circle cx="8" cy="16" r="4" fill="#7A664E" />
            <path d="M21 10L11 14" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
            <path d="M11 18L21 22" stroke="#7A664E" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <circle cx="24" cy="8" r="4" fill="#9E9E9E" />
            <circle cx="24" cy="24" r="4" fill="#9E9E9E" />
            <circle cx="8" cy="16" r="4" fill="#545454" />
            <path d="M21 10L11 14" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
            <path d="M11 18L21 22" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
)

export function TeamActivity({ activities }: TeamActivityProps) {
    const [hoveredAction, setHoveredAction] = useState<string | null>(null)

    return (
        <div className="rounded-2xl bg-[#12121a] p-5">
            {/* Header */}
            <h3 className="font-semibold text-white mb-4">Team activity</h3>

            {/* Activity Feed */}
            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-bold flex-shrink-0">
                            {activity.user.avatar ? (
                                <img src={activity.user.avatar} alt={activity.user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                activity.user.name.charAt(0)
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-white text-sm">{activity.user.name}</span>
                                <span className="text-xs text-gray-500">{activity.user.role}</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-2 truncate">{activity.message}</p>

                            {/* Action buttons with SVG icons */}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <button
                                    className="flex items-center gap-1 hover:text-[#F2CE88] transition-colors"
                                    onMouseEnter={() => setHoveredAction(`heart-${activity.id}`)}
                                    onMouseLeave={() => setHoveredAction(null)}
                                >
                                    <HeartIcon isHovered={hoveredAction === `heart-${activity.id}`} />
                                    <span>{activity.likes}</span>
                                </button>
                                <button
                                    className="flex items-center gap-1 hover:text-[#F2CE88] transition-colors"
                                    onMouseEnter={() => setHoveredAction(`comment-${activity.id}`)}
                                    onMouseLeave={() => setHoveredAction(null)}
                                >
                                    <CommentIcon isHovered={hoveredAction === `comment-${activity.id}`} />
                                    <span>{activity.comments}</span>
                                </button>
                                <button
                                    className="flex items-center gap-1 hover:text-[#F2CE88] transition-colors"
                                    onMouseEnter={() => setHoveredAction(`share-${activity.id}`)}
                                    onMouseLeave={() => setHoveredAction(null)}
                                >
                                    <ShareIcon isHovered={hoveredAction === `share-${activity.id}`} />
                                </button>
                            </div>
                        </div>

                        {/* Time */}
                        <span className="text-xs text-gray-500 flex-shrink-0">{activity.timeAgo}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
