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
        <div className="rounded-2xl bg-[#12121a] p-5">
            {/* Header with icon and title */}
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-lg">
                    {icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-white text-sm mb-0.5">{title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gray-600" />
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
                        {assignees.slice(0, 3).map((assignee, i) => (
                            <div
                                key={assignee.id}
                                className="w-6 h-6 rounded-full border-2 border-[#12121a] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black text-[10px] font-bold"
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
                    </div>
                    <span className="text-xs text-gray-500">T: {assignees[0]?.name.split(' ')[0] || 'Unassigned'}</span>
                </div>

                <button
                    onClick={onViewProject}
                    className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
                >
                    View project
                </button>
            </div>
        </div>
    )
}
