import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { X, CheckCircle, Search, SlidersHorizontal, Download } from 'lucide-react'


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

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<'All' | 'Tasks' | 'Comments' | 'Links' | 'Assets' | 'System'>('All')

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={clsx(
                "fixed top-4 right-4 bottom-4 w-full max-w-lg bg-[var(--app-bg-card)] rounded-2xl z-[70] flex flex-col shadow-2xl transform transition-transform duration-300 ease-out border border-[var(--app-border)] font-sans overflow-hidden",
                isOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"
            )}>
                {/* Header */}
                <div className="p-6 border-b border-[var(--app-border)] flex items-center justify-between bg-[var(--app-bg-sidebar)] sticky top-0 z-10 transition-colors">
                    <div>
                        <h3 className="text-xl font-bold text-[var(--app-text-primary)]">Notifications</h3>
                        <p className="text-sm text-[var(--app-text-secondary)] mt-1">Stay updated with your latest activities</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-[var(--app-bg-elevated)] rounded-lg ring-1 ring-amber-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Mark all
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-[var(--app-bg-elevated)] rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="px-6 py-4 gap-3 flex items-center bg-[var(--app-bg-sidebar)] border-b border-[var(--app-border)] transition-colors">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search in notifications..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--app-bg-input)] border border-[var(--app-border)] text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--app-bg-input)] border border-[var(--app-border)] text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors">
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                    </button>
                </div>

                {/* Tabs / Switcher */}
                <div className="px-6 border-b border-[var(--app-border)] bg-[var(--app-bg-sidebar)] flex gap-6 overflow-x-auto no-scrollbar transition-colors">
                    {['All', 'Tasks', 'Comments', 'Links', 'Assets', 'System'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={clsx(
                                "py-4 text-sm font-medium whitespace-nowrap transition-colors relative",
                                activeTab === tab ? "text-[var(--app-text-primary)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)]"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--app-accent)] rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[var(--app-bg-card)] transition-colors">
                    {SAMPLE_NOTIFICATIONS.map((group) => (
                        <div key={group.label}>
                            <h4 className="text-xs font-bold text-[var(--app-text-muted)] mb-4 uppercase tracking-[0.1em]">{group.label}</h4>
                            <div className="space-y-6">
                                {group.items.map((item) => (
                                    <div key={item.id} className="flex gap-4 group relative">
                                        {/* Unread Dot/Indicator */}
                                        {item.isRead === false && (
                                            <div className="absolute -left-2 top-2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                        )}

                                        {/* Icon */}
                                        <div className="flex-shrink-0">
                                            <NotificationIcon type={item.type} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 space-y-1.5">
                                            <div className="text-sm text-[var(--app-text-primary)] leading-relaxed">
                                                {item.actor && <span className="font-bold text-[var(--app-text-primary)]">{item.actor.name} </span>}
                                                {highlightKeywords(item.title)}
                                            </div>

                                            {/* Attachment */}
                                            {item.attachment && (
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--app-bg-sidebar)] border border-[var(--app-border)] mt-3 hover:bg-[var(--app-bg-elevated)] transition-colors cursor-pointer group/file">
                                                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                        📄
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[var(--app-text-primary)] truncate">{item.attachment.name}</p>
                                                        <p className="text-xs text-[var(--app-text-muted)] font-medium uppercase tracking-wider">{item.attachment.size}</p>
                                                    </div>
                                                    <button className="p-2 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] bg-[var(--app-bg-sidebar)] rounded-lg transition-colors border border-[var(--app-border)]">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-[var(--app-text-muted)] font-medium">{item.time}</p>
                                                {item.isRead === false && (
                                                    <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded">New</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>,
        document.body
    )
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
    switch (type) {
        case 'system':
            return <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-xs ring-1 ring-red-500/20">🔔</div>
        case 'comment':
            return <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs ring-1 ring-blue-500/20">💬</div>
        case 'link':
            return <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-xs ring-1 ring-purple-500/20">🔗</div>
        case 'asset':
            return <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-xs ring-1 ring-yellow-500/20">📂</div>
        default:
            return <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center text-xs ring-1 ring-gray-500/20">📝</div>
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
