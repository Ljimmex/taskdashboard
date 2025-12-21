import { useState } from 'react'
import { HeartIcon, CommentIcon, ShareIcon } from './icons'

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
