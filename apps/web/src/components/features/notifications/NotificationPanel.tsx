import { useState } from 'react'
import { clsx } from 'clsx'


interface NotificationItem {
    id: string
    type: 'task' | 'comment' | 'system' | 'link' | 'asset'
    title: string
    message?: string
    time: string
    isRead: boolean
    actor?: {
        name: string
        avatar?: string // Using emoji/letter or url
    }
    attachment?: {
        type: 'file' | 'image'
        name: string
        size?: string
    }
}

interface NotificationGroup {
    label: 'Today' | 'Yesterday' | 'Earlier'
    items: NotificationItem[]
}

const SAMPLE_NOTIFICATIONS: NotificationGroup[] = [
    {
        label: 'Today',
        items: [
            {
                id: '1',
                type: 'system',
                title: 'The status of Design Landing Page (Wortix) task has been updated.',
                time: '5m ago',
                isRead: false,
            },
            {
                id: '2',
                type: 'comment',
                title: 'You have 12 new comments in Lead Sprint Planning Session with Full Dev and Design Team (SkyUp) task',
                time: '10m ago',
                isRead: false,
            },
            {
                id: '3',
                type: 'link',
                title: 'You have 2 new links in Finalize Pricing Page UI and Logic (Merkitta Site) task',
                time: '39m ago',
                isRead: true, // Shown as visited/purple in screenshot, but user has red dot in screenshot... assuming logic.
            }
        ]
    },
    {
        label: 'Yesterday',
        items: [
            {
                id: '4',
                type: 'system',
                title: 'We are conducting system updates. Some features may be unavailable for a short period. Thank you for your patience.',
                time: 'Yesterday 12:39 AM',
                isRead: true,
            },
            {
                id: '5',
                type: 'asset',
                title: 'A photo you added to Assets has been deleted by author.',
                time: 'Yesterday 10:01 AM',
                isRead: true,
            },
            {
                id: '6',
                type: 'comment',
                title: 'Sam Smith shared a file in Create Style Tokens for Design System (DiDastVia) task',
                time: 'Yesterday 9:13 AM',
                isRead: true,
                actor: { name: 'Sam Smith', avatar: 'S' }, // Placeholder
                attachment: { type: 'file', name: 'Spirit Estimate Name.doc', size: '240 KB' }
            }
        ]
    },
    {
        label: 'Earlier',
        items: [
            {
                id: '7',
                type: 'system',
                title: 'The deadline for your Deploy to Staging (Content Collection) task is coming up soon. Make sure to complete it by August 3 to stay on track!',
                time: 'July 28, 2025', // Future date in user screenshot? :)
                isRead: false,
            }
        ]
    }
]

export function NotificationPanel({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'All' | 'Tasks' | 'Comments' | 'Links' | 'Assets' | 'System'>('All')

    return (
        <div className="absolute right-0 top-12 w-[480px] bg-[#12121a] rounded-2xl shadow-2xl border border-gray-800/50 flex flex-col max-h-[85vh] z-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#12121a] sticky top-0 z-10">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-4">
                    <button className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Mark all as read
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="px-4 py-3 gap-3 flex items-center bg-[#12121a]">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#0a0a0f] border border-gray-800 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
                    />
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-gray-800 text-sm text-gray-400 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="4" y1="21" x2="4" y2="14"></line>
                        <line x1="4" y1="10" x2="4" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="3"></line>
                        <line x1="20" y1="21" x2="20" y2="16"></line>
                        <line x1="20" y1="12" x2="20" y2="3"></line>
                        <line x1="1" y1="14" x2="7" y2="14"></line>
                        <line x1="9" y1="8" x2="15" y2="8"></line>
                        <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                    Filters
                </button>
            </div>

            {/* Tabs */}
            <div className="px-4 border-b border-gray-800 flex gap-6 overflow-x-auto no-scrollbar bg-[#12121a]">
                {['All', 'Tasks', 'Comments', 'Links', 'Assets', 'System'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={clsx(
                            "pb-3 text-sm font-medium whitespace-nowrap transition-colors relative",
                            activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#12121a]">
                {SAMPLE_NOTIFICATIONS.map((group) => (
                    <div key={group.label}>
                        <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">{group.label}</h4>
                        <div className="space-y-4">
                            {group.items.map((item) => (
                                <div key={item.id} className="flex gap-4 group">
                                    {/* Icon */}
                                    <div className="mt-1 flex-shrink-0">
                                        <NotificationIcon type={item.type} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 space-y-1">
                                        <div className="text-sm text-gray-300 leading-relaxed">
                                            {item.actor && <span className="font-semibold text-white">{item.actor.name} </span>}
                                            {highlightKeywords(item.title)}
                                        </div>

                                        {/* Attachment */}
                                        {item.attachment && (
                                            <div className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a24] border border-gray-800 mt-2 max-w-sm hover:bg-[#20202c] transition-colors cursor-pointer">
                                                <div className="w-8 h-8 rounded bg-blue-900/30 flex items-center justify-center text-blue-400">
                                                    📄
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{item.attachment.name}</p>
                                                    <p className="text-xs text-gray-500">{item.attachment.size}</p>
                                                </div>
                                                <button className="text-gray-500 hover:text-white">
                                                    ⬇️
                                                </button>
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-500">{item.time}</p>
                                    </div>

                                    {/* Unread Dot */}
                                    {item.isRead === false && (
                                        <div className="mt-2 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
    switch (type) {
        case 'system':
            return <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 ring-1 ring-red-500/20">🔔</div> // Bell
        case 'comment':
            return <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 ring-1 ring-blue-500/20">💬</div> // Message
        case 'link':
            return <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 ring-1 ring-purple-500/20">🔗</div> // Link
        case 'asset':
            return <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 ring-1 ring-yellow-500/20">📂</div> // Folder
        default:
            return <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-500">📝</div>
    }
}

// Helper to make task names bold or standardizing text
function highlightKeywords(text: string) {
    // This is a naive implementation. In a real app one might parse meaningful parts.
    // For now, we assume key entities are distinct or we just render the text.
    // However, to match the "richness", we'll just render text. 
    // In the screenshot, Project names like 'Design Landing Page (Wortix)' are bold.
    // We can try to regex match text inside parens including the text before it? No, too complex for static strings.
    // We'll just render user text for now.
    return <span>{text}</span>
}
