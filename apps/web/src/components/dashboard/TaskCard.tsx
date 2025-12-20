import { useState } from 'react'

interface TaskCardProps {
    id: string
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    assignees: { id: string; name: string; avatar?: string }[]
    type?: 'call' | 'task'
    onEdit?: () => void
    onDelete?: () => void
}

export function TaskCard({
    title,
    description,
    priority,
    assignees,
    type = 'task'
}: TaskCardProps) {
    const [showMenu, setShowMenu] = useState(false)

    const priorityStyles = {
        high: 'bg-red-500/20 text-red-400 border-red-500/30',
        medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        low: 'bg-green-500/20 text-green-400 border-green-500/30',
    }

    const priorityLabels = {
        high: 'High',
        medium: 'Medium',
        low: 'Low',
    }

    return (
        <div className="rounded-2xl bg-[#12121a] p-4 relative group h-[140px] flex flex-col">
            {/* Menu Button - always visible in top right */}
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white transition-all"
            >
                ⋮
            </button>

            {/* Dropdown Menu with SVG icons */}
            {showMenu && (
                <div className="absolute top-10 right-4 w-36 bg-[#1a1a24] border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-10">
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group">
                        <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#545454" />
                                <path d="M12 25L7 20L4 28L12 25Z" fill="#9E9E9E" />
                                <rect x="6" y="24" width="4" height="4" rx="1" fill="#545454" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                <path d="M22.5 4.5L27.5 9.5L12 25L7 20L22.5 4.5Z" fill="#7A664E" />
                                <path d="M12 25L7 20L4 28L12 25Z" fill="#F2CE88" />
                                <rect x="6" y="24" width="4" height="4" rx="1" fill="#7A664E" />
                            </svg>
                        </div>
                        Edit
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group">
                        <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                <rect x="10" y="10" width="16" height="16" rx="3" fill="#9E9E9E" />
                                <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#545454" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                <rect x="10" y="10" width="16" height="16" rx="3" fill="#F2CE88" />
                                <path d="M8 22V10C8 7.79086 9.79086 6 12 6H22" stroke="#7A664E" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                        </div>
                        Duplicate
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group">
                        <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                <rect x="4" y="12" width="24" height="16" rx="3" fill="#545454" />
                                <rect x="6" y="8" width="20" height="4" rx="1" fill="#9E9E9E" />
                                <rect x="12" y="16" width="8" height="4" rx="1" fill="#9E9E9E" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                <rect x="4" y="12" width="24" height="16" rx="3" fill="#7A664E" />
                                <rect x="6" y="8" width="20" height="4" rx="1" fill="#F2CE88" />
                                <rect x="12" y="16" width="8" height="4" rx="1" fill="#F2CE88" />
                            </svg>
                        </div>
                        Archive
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-[#F2CE88] transition-colors group">
                        <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                <circle cx="16" cy="16" r="12" fill="#545454" />
                                <rect x="14.5" y="14" width="3" height="8" rx="1.5" fill="#9E9E9E" />
                                <circle cx="16" cy="10" r="2" fill="#9E9E9E" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                <circle cx="16" cy="16" r="12" fill="#7A664E" />
                                <rect x="14.5" y="14" width="3" height="8" rx="1.5" fill="#F2CE88" />
                                <circle cx="16" cy="10" r="2" fill="#F2CE88" />
                            </svg>
                        </div>
                        Info
                    </button>
                    <div className="border-t border-gray-700" />
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors group">
                        <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#545454" />
                                <path d="M12 16V22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                                <path d="M20 16V22" stroke="#9E9E9E" strokeWidth="3" strokeLinecap="round" />
                                <rect x="4" y="6" width="24" height="4" rx="2" fill="#9E9E9E" />
                                <rect x="13" y="4" width="6" height="2" rx="1" fill="#9E9E9E" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                <path d="M6 10V24C6 26.2091 7.79086 28 10 28H22C24.2091 28 26 26.2091 26 24V10H6Z" fill="#7A664E" />
                                <path d="M12 16V22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
                                <path d="M20 16V22" stroke="#F2CE88" strokeWidth="3" strokeLinecap="round" />
                                <rect x="4" y="6" width="24" height="4" rx="2" fill="#F2CE88" />
                                <rect x="13" y="4" width="6" height="2" rx="1" fill="#F2CE88" />
                            </svg>
                        </div>
                        Delete
                    </button>
                </div>
            )}

            {/* Header: Title + Badge INLINE */}
            <div className="flex items-center gap-2 mb-3 pr-8">
                <h3 className="font-semibold text-white">{title}</h3>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${priorityStyles[priority]}`}>
                    {priorityLabels[priority]}
                </span>
            </div>

            {/* Description */}
            <p className="text-gray-500 text-xs mb-auto line-clamp-2">{description}</p>

            {/* Footer: Avatars + Actions */}
            <div className="flex items-center justify-between">
                {/* Assignees */}
                <div className="flex -space-x-2">
                    {assignees.slice(0, 4).map((assignee, i) => (
                        <div
                            key={assignee.id}
                            className="w-8 h-8 rounded-full border-2 border-[#12121a] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black text-xs font-bold"
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
                    {assignees.length > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-[#12121a] bg-gray-700 flex items-center justify-center text-white text-xs">
                            +{assignees.length - 4}
                        </div>
                    )}
                </div>

                {/* Action Icons with SVG */}
                <div className="flex items-center gap-2">
                    {type === 'call' && (
                        <button className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors group">
                            {/* Video conference icon */}
                            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                                <rect x="4" y="8" width="18" height="16" rx="3" fill="#545454" />
                                <path d="M22 16L28 11V21L22 16Z" fill="#9E9E9E" />
                                <circle cx="13" cy="16" r="3" fill="#9E9E9E" />
                            </svg>
                            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                                <rect x="4" y="8" width="18" height="16" rx="3" fill="#7A664E" />
                                <path d="M22 16L28 11V21L22 16Z" fill="#F2CE88" />
                                <circle cx="13" cy="16" r="3" fill="#F2CE88" />
                            </svg>
                        </button>
                    )}
                    <button className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors group">
                        {/* Normal conversation / phone icon */}
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                            <path d="M24.6419 20.4751C23.414 20.4751 22.2198 20.2829 21.0893 19.9096C20.3949 19.6723 19.5256 19.9177 19.0607 20.3976L16.7584 23.2765C13.7785 21.8552 10.9994 19.0761 9.56282 16.0723L12.371 13.7877C12.884 13.2975 13.1346 12.381 12.8973 11.6866C12.524 10.556 12.3319 9.36182 12.3319 8.13396C12.3319 7.50413 11.8189 7 11.189 7H7.14303C6.5132 7 6 7.50413 6 8.13396C6 18.3927 14.4302 26.8229 24.689 26.8229C25.3189 26.8229 25.8321 26.3188 25.8321 25.6889V21.6181C25.8321 20.9883 25.3189 20.4751 24.689 20.4751H24.6419Z" fill="#545454" />
                            <rect x="19" y="7" width="8" height="8" rx="4" fill="#9E9E9E" />
                        </svg>
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                            <path d="M24.6419 20.4751C23.414 20.4751 22.2198 20.2829 21.0893 19.9096C20.3949 19.6723 19.5256 19.9177 19.0607 20.3976L16.7584 23.2765C13.7785 21.8552 10.9994 19.0761 9.56282 16.0723L12.371 13.7877C12.884 13.2975 13.1346 12.381 12.8973 11.6866C12.524 10.556 12.3319 9.36182 12.3319 8.13396C12.3319 7.50413 11.8189 7 11.189 7H7.14303C6.5132 7 6 7.50413 6 8.13396C6 18.3927 14.4302 26.8229 24.689 26.8229C25.3189 26.8229 25.8321 26.3188 25.8321 25.6889V21.6181C25.8321 20.9883 25.3189 20.4751 24.689 20.4751H24.6419Z" fill="#7A664E" />
                            <rect x="19" y="7" width="8" height="8" rx="4" fill="#F2CE88" />
                        </svg>
                    </button>
                    <button className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors group">
                        {/* Chat icon */}
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="group-hover:hidden">
                            <path d="M10 6C6.68629 6 4 8.68629 4 12V24L9 20H18C21.3137 20 24 17.3137 24 14V12C24 8.68629 21.3137 6 18 6H10Z" fill="#545454" />
                            <path d="M28 8H20C22.2091 8 24 9.79086 24 12V14C24 16.2091 22.2091 18 20 18H14C14 21.3137 16.6863 24 20 24H25L28 27V8Z" fill="#9E9E9E" />
                        </svg>
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="none" className="hidden group-hover:block">
                            <path d="M10 6C6.68629 6 4 8.68629 4 12V24L9 20H18C21.3137 20 24 17.3137 24 14V12C24 8.68629 21.3137 6 18 6H10Z" fill="#7A664E" />
                            <path d="M28 8H20C22.2091 8 24 9.79086 24 12V14C24 16.2091 22.2091 18 20 18H14C14 21.3137 16.6863 24 20 24H25L28 27V8Z" fill="#F2CE88" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

// Add New Task Card
export function AddNewTaskCard({ onClick }: { onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="rounded-2xl border-2 border-dashed border-gray-700 bg-[#12121a]/50 p-4 flex flex-col items-center justify-center h-[140px] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
        >
            <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-amber-500/20 flex items-center justify-center mb-3 transition-colors">
                <span className="text-2xl text-gray-500 group-hover:text-amber-400">+</span>
            </div>
            <span className="text-gray-400 group-hover:text-amber-400 font-medium transition-colors">Add New Task</span>
        </button>
    )
}
