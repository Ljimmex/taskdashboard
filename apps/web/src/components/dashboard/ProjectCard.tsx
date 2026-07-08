interface ProjectCardProps {
  id: string
  title: string
  icon?: string
  timeRange: string
  progress: number
  daysLeft: number
  assignees: { id: string; name: string; avatar?: string }[]
  onViewProject?: () => void
}

export function ProjectCard({
  title,
  icon = '🎨',
  timeRange,
  progress,
  daysLeft,
  assignees,
  onViewProject,
}: ProjectCardProps) {
  return (
    <div className="relative rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg-elevated)] p-5 shadow-sm transition-all duration-300">
      {/* Header with icon and title */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-lg">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="mb-0.5 text-sm font-medium text-[var(--app-text-primary)]">{title}</h3>
          <p className="flex items-center gap-1.5 text-xs text-[var(--app-text-secondary)]">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="12" fill="#9E9E9E" />
              <path d="M16 16V10" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
              <path d="M16 16L20 20" stroke="#545454" strokeWidth="3" strokeLinecap="round" />
              <circle cx="16" cy="16" r="2" fill="#545454" />
            </svg>
            {timeRange}
          </p>
        </div>
      </div>

      {/* Progress section */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-[var(--app-text-secondary)]">{daysLeft} days left</span>
          <span className="text-xs font-medium text-amber-500">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--app-border)] shadow-inner">
          <div
            className="h-full rounded-full bg-[var(--app-accent)] shadow-[0_0_10px_var(--app-accent)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer with avatars and button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {assignees.slice(0, 5).map((assignee, i) => (
              <div
                key={assignee.id}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--app-bg-elevated)] bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-black"
                style={{ zIndex: assignees.length - i }}
                title={assignee.name}
              >
                {assignee.avatar ? (
                  <img
                    src={assignee.avatar}
                    alt={assignee.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  assignee.name.charAt(0)
                )}
              </div>
            ))}
            {assignees.length > 5 && (
              <div className="z-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--app-bg-elevated)] bg-[var(--app-bg-deepest)] text-[10px] text-[var(--app-text-secondary)]">
                +{assignees.length - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-[var(--app-text-secondary)]">
            T: {assignees[0]?.name.split(' ')[0] || 'Unassigned'}
            {assignees.length > 1 && ` +${assignees.length - 1}`}
          </span>
        </div>

        <button
          onClick={onViewProject}
          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-primary)] shadow-sm transition-all hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-white dark:hover:text-black"
        >
          View project
        </button>
      </div>
    </div>
  )
}
