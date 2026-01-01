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
        <div className="rounded-2xl bg-[#1a1a24] p-5 relative">
            {/* Header with icon and title */}
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-lg">
                    {icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-white text-sm mb-0.5">{title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
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
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{daysLeft} days left</span>
                    <span className="text-xs text-amber-400 font-medium">{progress}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
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
                                className="w-6 h-6 rounded-full border-2 border-[#1a1a24] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black text-[10px] font-bold"
                                style={{ zIndex: assignees.length - i }}
                                title={assignee.name}
                            >
                                {assignee.avatar ? (
                                    <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    assignee.name.charAt(0)
                                )}
                            </div>
                        ))}
                        {assignees.length > 5 && (
                            <div className="w-6 h-6 rounded-full border-2 border-[#1a1a24] bg-gray-800 flex items-center justify-center text-white text-[10px] z-0">
                                +{assignees.length - 5}
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-gray-500">
                        T: {assignees[0]?.name.split(' ')[0] || 'Unassigned'}
                        {assignees.length > 1 && ` +${assignees.length - 1}`}
                    </span>
                </div>

                <button
                    onClick={onViewProject}
                    className="px-3 py-1.5 rounded-lg bg-[#252530] text-xs text-gray-300 hover:bg-[#2f2f3d] hover:text-white transition-all shadow-md group"
                >
                    View project
                </button>
            </div>
        </div>
    )
}
