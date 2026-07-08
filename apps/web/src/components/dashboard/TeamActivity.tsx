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
      <h3 className="mb-4 font-semibold text-white">Team activity</h3>

      {/* Activity Feed */}
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            {/* Avatar */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-black">
              {activity.user.avatar ? (
                <img
                  src={activity.user.avatar}
                  alt={activity.user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                activity.user.name.charAt(0)
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="text-sm font-medium text-white">{activity.user.name}</span>
                <span className="text-xs text-gray-500">{activity.user.role}</span>
              </div>
              <p className="mb-2 truncate text-sm text-gray-400">{activity.message}</p>

              {/* Action buttons with SVG icons */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <button
                  className="flex items-center gap-1 transition-colors hover:text-[var(--app-accent-text)]"
                  onMouseEnter={() => setHoveredAction(`heart-${activity.id}`)}
                  onMouseLeave={() => setHoveredAction(null)}
                >
                  <HeartIcon isHovered={hoveredAction === `heart-${activity.id}`} />
                  <span>{activity.likes}</span>
                </button>
                <button
                  className="flex items-center gap-1 transition-colors hover:text-[var(--app-accent-text)]"
                  onMouseEnter={() => setHoveredAction(`comment-${activity.id}`)}
                  onMouseLeave={() => setHoveredAction(null)}
                >
                  <CommentIcon isHovered={hoveredAction === `comment-${activity.id}`} />
                  <span>{activity.comments}</span>
                </button>
                <button
                  className="flex items-center gap-1 transition-colors hover:text-[var(--app-accent-text)]"
                  onMouseEnter={() => setHoveredAction(`share-${activity.id}`)}
                  onMouseLeave={() => setHoveredAction(null)}
                >
                  <ShareIcon isHovered={hoveredAction === `share-${activity.id}`} />
                </button>
              </div>
            </div>

            {/* Time */}
            <span className="flex-shrink-0 text-xs text-gray-500">{activity.timeAgo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
