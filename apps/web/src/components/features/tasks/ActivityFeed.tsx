import React from 'react'
import { cn } from '../../../lib/utils'

export interface Activity {
    id: string
    user: {
        id: string
        name: string
        avatar?: string
    }
    type: 'status_change' | 'assignment' | 'label_added' | 'task_created' | 'file_added' | 'comment_added' | 'subtask_created' | 'subtask_updated' | 'subtask_deleted'
    details: string
    timestamp: string
    metadata?: Record<string, any>
}

interface ActivityFeedProps {
    activities: Activity[]
}

const ActivityIcon = ({ type }: { type: Activity['type'] }) => {
    switch (type) {
        case 'status_change':
            return (
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5l-5-3-5 3M17 19l-5 3-5-3" />
                    </svg>
                </div>
            )
        case 'assignment':
            return (
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M19 8l2 2-2 2" />
                    </svg>
                </div>
            )
        case 'label_added':
            return (
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                </div>
            )
        case 'file_added':
            return (
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                </div>
            )
        case 'comment_added':
            return (
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
            )
        default:
            return (
                <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                </div>
            )
    }
}

const Avatar = ({ name }: { name: string }) => {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
    return (
        <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-medium">
            {initials}
        </div>
    )
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-4 border border-gray-700">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                        <path d="M12 20v-6M12 8V4M8 12h8" />
                    </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-300">Brak aktywności</h4>
                <p className="text-xs text-gray-500 mt-1">Sledź zmiany w tym zadaniu tutaj.</p>
            </div>
        )
    }

    return (
        <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-800/50" />

            <div className="space-y-8 relative">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 group">
                        <div className="relative z-10 bg-[#12121a]">
                            <ActivityIcon type={activity.type} />
                        </div>

                        <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Avatar name={activity.user.name} />
                                    <span className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                                        {activity.user.name}
                                    </span>
                                    {/* Activity Type Badge */}
                                    <span className={cn(
                                        "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                                        activity.type === 'status_change' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                            activity.type === 'assignment' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                                                activity.type === 'label_added' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                    activity.type === 'file_added' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                        activity.type === 'comment_added' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                                            "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                    )}>
                                        {(() => {
                                            switch (activity.type) {
                                                case 'status_change': return 'Status'
                                                case 'assignment': return 'Przypisanie'
                                                case 'label_added': return 'Etykieta'
                                                case 'file_added': return 'Plik'
                                                case 'comment_added': return 'Komentarz'
                                                case 'task_created': return 'Utworzono'
                                                case 'subtask_created': return 'Podzadanie'
                                                case 'subtask_updated': return 'Podzadanie'
                                                case 'subtask_deleted': return 'Podzadanie'
                                                default: return activity.type
                                            }
                                        })()}
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-500">{activity.timestamp}</span>
                            </div>

                            <p className="text-sm text-gray-400 leading-relaxed">
                                {activity.details}
                            </p>

                            {/* Metadata visualization (e.g. status changes with arrow) */}
                            {activity.type === 'status_change' && activity.metadata?.from && activity.metadata?.to && (
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-gray-800 text-[10px] text-gray-400 border border-gray-700">
                                        {activity.metadata.from}
                                    </span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-[10px] text-amber-400 border border-amber-400/20">
                                        {activity.metadata.to}
                                    </span>
                                </div>
                            )}

                            {/* Metadata for label added */}
                            {activity.type === 'label_added' && activity.metadata?.labelName && (
                                <div className="mt-2 text-[11px] flex items-center gap-2">
                                    <span
                                        className="px-2 py-0.5 rounded-full border"
                                        style={{
                                            backgroundColor: `${activity.metadata.labelColor}10`,
                                            borderColor: `${activity.metadata.labelColor}30`,
                                            color: activity.metadata.labelColor
                                        }}
                                    >
                                        {activity.metadata.labelName}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
